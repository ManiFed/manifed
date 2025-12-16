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

    console.log("Processing monthly bond interest payments...");

    // Find all active bonds with next_interest_date <= now and not yet matured
    const now = new Date().toISOString();
    const { data: bondsForInterest, error: fetchError } = await supabase
      .from("bonds")
      .select("*")
      .eq("status", "active")
      .lte("next_interest_date", now)
      .gt("maturity_date", now); // Not yet matured

    if (fetchError) {
      console.error("Error fetching bonds for interest:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${bondsForInterest?.length || 0} bonds due for interest payment`);

    let processedCount = 0;
    let totalPaid = 0;

    for (const bond of bondsForInterest || []) {
      try {
        // Calculate monthly interest
        const monthlyInterest = bond.amount * (bond.annual_yield / 100) / 12;
        
        // Ensure minimum M$10 payment (should already be validated at purchase)
        if (monthlyInterest < 10) {
          console.log(`Skipping bond ${bond.id} - monthly interest M$${monthlyInterest.toFixed(2)} below minimum`);
          continue;
        }

        console.log(`Processing interest for bond ${bond.id} (${bond.bond_code}): M$${monthlyInterest.toFixed(2)}`);

        // Credit the user's ManiFed balance with monthly interest
        const { error: balanceError } = await supabase.rpc('modify_user_balance', {
          p_user_id: bond.user_id,
          p_amount: monthlyInterest,
          p_operation: 'add'
        });

        if (balanceError) {
          console.error(`Error updating balance for bond ${bond.id}:`, balanceError);
          continue;
        }

        // Record the interest payment
        await supabase.from("bond_interest_payments").insert({
          bond_id: bond.id,
          user_id: bond.user_id,
          amount: monthlyInterest,
          payment_date: now,
        });

        // Record the transaction
        await supabase.from("transactions").insert({
          user_id: bond.user_id,
          type: "bond_interest",
          amount: monthlyInterest,
          description: `Monthly interest payment for ${bond.bond_code}`,
        });

        // Update next_interest_date to 1 month from now
        const nextDate = new Date(bond.next_interest_date);
        nextDate.setMonth(nextDate.getMonth() + 1);
        
        await supabase
          .from("bonds")
          .update({ 
            next_interest_date: nextDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", bond.id);

        processedCount++;
        totalPaid += monthlyInterest;

        console.log(`Bond ${bond.bond_code}: paid M$${monthlyInterest.toFixed(2)} interest to user ${bond.user_id}`);

      } catch (bondError) {
        console.error(`Error processing interest for bond ${bond.id}:`, bondError);
      }
    }

    console.log(`Processed ${processedCount} interest payments, total paid: M$${totalPaid.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        totalPaid,
        message: `Processed ${processedCount} interest payments, paid out M$${totalPaid.toFixed(2)}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-bond-interest:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
