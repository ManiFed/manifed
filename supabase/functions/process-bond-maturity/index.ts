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
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing matured bonds...");

    // Find all bonds that have matured
    const now = new Date().toISOString();
    const { data: maturedBonds, error: fetchError } = await supabase
      .from("bonds")
      .select("*")
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
        console.log(`Processing bond ${bond.id} for user ${bond.user_id}`);
        
        // Credit the user's ManiFed balance with the total return
        const { error: balanceError } = await supabase.rpc('modify_user_balance', {
          p_user_id: bond.user_id,
          p_amount: bond.total_return,
          p_operation: 'add'
        });

        if (balanceError) {
          console.error(`Error updating balance for bond ${bond.id}:`, balanceError);
          continue;
        }

        // Record the transaction
        await supabase
          .from("transactions")
          .insert({
            user_id: bond.user_id,
            type: "bond_maturity",
            amount: bond.total_return,
            description: `T-Bill matured: ${bond.term_weeks} week bond`,
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
        totalPaid += Number(bond.total_return);

        console.log(`Bond ${bond.id} matured - paid M$${bond.total_return} to user ${bond.user_id}`);

      } catch (bondError) {
        console.error(`Error processing bond ${bond.id}:`, bondError);
      }
    }

    console.log(`Processed ${processedCount} bonds, total paid: M$${totalPaid}`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        totalPaid,
        message: `Processed ${processedCount} matured bonds, paid out M$${totalPaid.toFixed(2)}`,
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