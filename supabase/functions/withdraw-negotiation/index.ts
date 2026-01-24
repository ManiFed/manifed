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
      .select("*")
      .eq("id", negotiationId)
      .single();

    if (negError || !negotiation) {
      throw new Error("Negotiation not found");
    }

    // Verify user owns the negotiation
    if (negotiation.negotiator_user_id !== user.id) {
      throw new Error("You can only withdraw your own negotiations");
    }

    if (negotiation.status !== "pending") {
      throw new Error("This negotiation is no longer pending");
    }

    // Release escrowed funds back
    if (negotiation.escrow_held) {
      const { error: releaseError } = await supabase.rpc("release_escrow", {
        p_user_id: user.id,
        p_amount: negotiation.proposed_amount,
      });

      if (releaseError) {
        console.error("Release error:", releaseError);
        throw new Error("Failed to release escrowed funds");
      }
    }

    // Delete the negotiation
    await supabase
      .from("loan_negotiations")
      .delete()
      .eq("id", negotiationId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Proposal withdrawn. M$${negotiation.proposed_amount} returned to your available balance.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Withdraw negotiation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to withdraw negotiation";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
