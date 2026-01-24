import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Not authenticated");
    }

    const { negotiationId } = await req.json();

    if (!negotiationId) {
      throw new Error("Negotiation ID is required");
    }

    // Get negotiation details
    const { data: negotiation, error: negError } = await supabase
      .from("loan_negotiations")
      .select("*, loans!inner(*)")
      .eq("id", negotiationId)
      .single();

    if (negError || !negotiation) {
      throw new Error("Negotiation not found");
    }

    // Verify user owns the loan
    if (negotiation.loans.borrower_user_id !== user.id) {
      throw new Error("You can only accept negotiations on your own loans");
    }

    if (negotiation.status !== "pending") {
      throw new Error("This negotiation is no longer pending");
    }

    // Check if expired
    if (negotiation.expires_at && new Date(negotiation.expires_at) < new Date()) {
      // Release escrow and mark as rejected
      if (negotiation.escrow_held) {
        await supabase.rpc("release_escrow", {
          p_user_id: negotiation.negotiator_user_id,
          p_amount: negotiation.proposed_amount,
        });
      }

      await supabase
        .from("loan_negotiations")
        .update({ status: "rejected", escrow_held: false })
        .eq("id", negotiationId);

      throw new Error("This negotiation has expired");
    }

    // Transfer escrowed funds to loan owner (borrower for seeks, or to the investor for offers)
    if (negotiation.escrow_held) {
      const { error: transferError } = await supabase.rpc("transfer_escrowed_funds", {
        p_from_user_id: negotiation.negotiator_user_id,
        p_to_user_id: user.id,
        p_amount: negotiation.proposed_amount,
      });

      if (transferError) {
        console.error("Transfer error:", transferError);
        throw new Error("Failed to transfer escrowed funds");
      }
    }

    // Update negotiation status
    await supabase
      .from("loan_negotiations")
      .update({ 
        status: "accepted",
        escrow_held: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", negotiationId);

    // Reject all other pending negotiations for this loan
    const { data: otherNegotiations } = await supabase
      .from("loan_negotiations")
      .select("id, negotiator_user_id, proposed_amount, escrow_held")
      .eq("loan_id", negotiation.loan_id)
      .eq("status", "pending")
      .neq("id", negotiationId);

    // Release escrow for rejected negotiations
    for (const neg of otherNegotiations || []) {
      if (neg.escrow_held) {
        await supabase.rpc("release_escrow", {
          p_user_id: neg.negotiator_user_id,
          p_amount: neg.proposed_amount,
        });
      }
    }

    // Mark them as rejected
    await supabase
      .from("loan_negotiations")
      .update({ status: "rejected", escrow_held: false })
      .eq("loan_id", negotiation.loan_id)
      .eq("status", "pending")
      .neq("id", negotiationId);

    // Update loan to funded status
    await supabase
      .from("loans")
      .update({
        status: "active",
        funded_amount: negotiation.proposed_amount,
        amount: negotiation.proposed_amount,
        interest_rate: negotiation.proposed_interest_rate,
        term_days: negotiation.proposed_term_days,
      })
      .eq("id", negotiation.loan_id);

    // Record transactions
    await supabase.from("transactions").insert([
      {
        user_id: negotiation.negotiator_user_id,
        type: "invest",
        amount: -negotiation.proposed_amount,
        loan_id: negotiation.loan_id,
        description: `Funded loan via negotiation: ${negotiation.loans.title}`,
      },
      {
        user_id: user.id,
        type: "loan_received",
        amount: negotiation.proposed_amount,
        loan_id: negotiation.loan_id,
        description: `Received loan funding: ${negotiation.loans.title}`,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Accepted M$${negotiation.proposed_amount} from @${negotiation.negotiator_username}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Accept negotiation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to accept negotiation";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
