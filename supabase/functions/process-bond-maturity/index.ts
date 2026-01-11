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
    // Validate webhook secret
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("REPAYMENT_WEBHOOK_SECRET");
    
    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Invalid or missing webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const manifedApiKey = Deno.env.get("MANIFED_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!manifedApiKey) {
      console.error("MANIFED_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ManiFed API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing matured bonds (principal return via Managram)...");

    // Find all bonds that have matured
    const now = new Date().toISOString();
    const { data: maturedBonds, error: fetchError } = await supabase
      .from("bonds")
      .select("*, profiles:user_id(username)")
      .eq("status", "active")
      .lte("maturity_date", now);

    if (fetchError) {
      console.error("Error fetching matured bonds:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${maturedBonds?.length || 0} matured bonds to process`);

    let processedCount = 0;
    let totalPaid = 0;

    for (const bond of maturedBonds || []) {
      try {
        console.log(`Processing matured bond ${bond.id} (${bond.bond_code}) for user ${bond.user_id}`);
        
        // Only return the PRINCIPAL (interest was paid monthly)
        const principalAmount = bond.amount;

        // Get user's Manifold username for managram
        const username = bond.profiles?.username;
        if (!username) {
          console.log(`Skipping bond ${bond.id} - no username found for user ${bond.user_id}`);
          // Fall back to balance credit
          const { error: balanceError } = await supabase.rpc('modify_user_balance', {
            p_user_id: bond.user_id,
            p_amount: principalAmount,
            p_operation: 'add'
          });
          if (balanceError) {
            console.error(`Error updating balance for bond ${bond.id}:`, balanceError);
            continue;
          }
        } else {
          // Send managram via Manifold API
          console.log(`Sending M$${principalAmount} principal to @${username} via Managram`);
          const managramResponse = await fetch("https://api.manifold.markets/v0/managram", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Key ${manifedApiKey}`,
            },
            body: JSON.stringify({
              toIds: [username],
              amount: Math.round(principalAmount),
              message: `T-Bill ${bond.bond_code} matured - principal returned`,
            }),
          });

          if (!managramResponse.ok) {
            const errorText = await managramResponse.text();
            console.error(`Managram failed for bond ${bond.id}:`, errorText);
            // Fall back to balance credit
            const { error: balanceError } = await supabase.rpc('modify_user_balance', {
              p_user_id: bond.user_id,
              p_amount: principalAmount,
              p_operation: 'add'
            });
            if (balanceError) {
              console.error(`Fallback balance update failed for bond ${bond.id}:`, balanceError);
              continue;
            }
            console.log(`Fallback: credited balance for bond ${bond.id}`);
          } else {
            console.log(`Managram sent successfully for bond ${bond.id}`);
          }
        }

        // Record the transaction
        await supabase
          .from("transactions")
          .insert({
            user_id: bond.user_id,
            type: "bond_maturity",
            amount: principalAmount,
            description: `T-Bill matured (${bond.bond_code}): principal returned via Managram`,
          });

        // Update bond status to matured
        await supabase
          .from("bonds")
          .update({ 
            status: "matured",
            updated_at: new Date().toISOString()
          })
          .eq("id", bond.id);

        processedCount++;
        totalPaid += Number(principalAmount);

        console.log(`Bond ${bond.bond_code} matured - returned principal M$${principalAmount} to user ${bond.user_id}`);

      } catch (bondError) {
        console.error(`Error processing bond ${bond.id}:`, bondError);
      }
    }

    console.log(`Processed ${processedCount} matured bonds, total principal returned: M$${totalPaid}`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        totalPaid,
        message: `Processed ${processedCount} matured bonds, returned M$${totalPaid.toFixed(2)} principal via Managram`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-bond-maturity:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
