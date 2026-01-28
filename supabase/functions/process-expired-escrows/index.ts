import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("[process-expired-escrows] Starting scan for expired negotiations...");

    // Find all pending negotiations that have expired
    const { data: expiredNegotiations, error: fetchError } = await supabase
      .from("loan_negotiations")
      .select("id, negotiator_user_id, proposed_amount, escrow_held, loan_id")
      .eq("status", "pending")
      .eq("escrow_held", true)
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("[process-expired-escrows] Error fetching expired negotiations:", fetchError);
      throw fetchError;
    }

    console.log(`[process-expired-escrows] Found ${expiredNegotiations?.length || 0} expired negotiations`);

    let processed = 0;
    let errors = 0;

    for (const negotiation of expiredNegotiations || []) {
      try {
        // Update negotiation status to expired
        const { error: updateError } = await supabase
          .from("loan_negotiations")
          .update({ 
            status: "expired", 
            escrow_held: false,
            updated_at: new Date().toISOString()
          })
          .eq("id", negotiation.id);

        if (updateError) {
          console.error(`[process-expired-escrows] Failed to update negotiation ${negotiation.id}:`, updateError);
          errors++;
          continue;
        }

        // Release escrow back to user
        const { error: escrowError } = await supabase.rpc("release_escrow", {
          p_user_id: negotiation.negotiator_user_id,
          p_amount: negotiation.proposed_amount,
        });

        if (escrowError) {
          console.error(`[process-expired-escrows] Failed to release escrow for ${negotiation.id}:`, escrowError);
          errors++;
          continue;
        }

        // Log the transaction
        await supabase.from("transactions").insert({
          user_id: negotiation.negotiator_user_id,
          type: "escrow_release",
          amount: negotiation.proposed_amount,
          description: `Escrow released - negotiation expired`,
        });

        console.log(`[process-expired-escrows] Processed negotiation ${negotiation.id}, released M$${negotiation.proposed_amount}`);
        processed++;
      } catch (err) {
        console.error(`[process-expired-escrows] Error processing negotiation ${negotiation.id}:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      processed,
      errors,
      total: expiredNegotiations?.length || 0,
      timestamp: new Date().toISOString(),
    };

    console.log("[process-expired-escrows] Completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-expired-escrows] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
