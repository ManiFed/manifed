import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_API_KEY = Deno.env.get("MANIFED_API_KEY") || "";
const MANIFED_USERNAME = "ManiFed";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing loan repayments...");

    // Find loans that have matured (term has passed since creation)
    const { data: maturedLoans, error: loansError } = await supabase
      .from("loans")
      .select("*")
      .eq("status", "active")
      .not("funded_amount", "eq", 0);

    if (loansError) {
      console.error("Error fetching loans:", loansError);
      throw loansError;
    }

    console.log(`Found ${maturedLoans?.length || 0} active loans to check`);

    const now = new Date();
    const processedLoans: string[] = [];

    for (const loan of maturedLoans || []) {
      // Check if loan has matured based on created_at + term_days
      const createdAt = new Date(loan.created_at);
      const maturityDate = new Date(createdAt.getTime() + loan.term_days * 24 * 60 * 60 * 1000);

      if (now >= maturityDate) {
        console.log(`Processing repayment for loan: ${loan.id} - ${loan.title}`);

        // Get all investments for this loan
        const { data: investments, error: investError } = await supabase
          .from("investments")
          .select("*")
          .eq("loan_id", loan.id);

        if (investError) {
          console.error(`Error fetching investments for loan ${loan.id}:`, investError);
          continue;
        }

        // Calculate repayment amount (principal + interest)
        const repaymentMultiplier = 1 + loan.interest_rate / 100;
        let successfulRepayments = 0;
        let failedRepayments = 0;

        for (const investment of investments || []) {
          const repaymentAmount = Math.floor(Number(investment.amount) * repaymentMultiplier);

          try {
            // Get investor's user_id to credit their balance
            const { data: investorBalance } = await supabase
              .from("user_balances")
              .select("*")
              .eq("user_id", investment.investor_user_id)
              .single();

            if (investorBalance) {
              // Credit the investor's ManiFed balance
              const newBalance = Number(investorBalance.balance) + repaymentAmount;
              const newTotalInvested = Math.max(0, Number(investorBalance.total_invested) - Number(investment.amount));

              await supabase
                .from("user_balances")
                .update({ 
                  balance: newBalance,
                  total_invested: newTotalInvested,
                  updated_at: new Date().toISOString()
                })
                .eq("user_id", investment.investor_user_id);

              // Record the transaction
              await supabase
                .from("transactions")
                .insert({
                  user_id: investment.investor_user_id,
                  type: "repayment",
                  amount: repaymentAmount,
                  description: `Loan repaid: ${loan.title} (M$${investment.amount} + ${loan.interest_rate}% interest)`,
                  loan_id: loan.id
                });

              console.log(`Credited M$${repaymentAmount} to investor ${investment.investor_username}`);
              successfulRepayments++;
            } else {
              console.warn(`No balance record found for investor ${investment.investor_user_id}`);
              failedRepayments++;
            }
          } catch (err) {
            console.error(`Error processing repayment for investment ${investment.id}:`, err);
            failedRepayments++;
          }
        }

        // Update loan status to repaid
        await supabase
          .from("loans")
          .update({ 
            status: "repaid",
            updated_at: new Date().toISOString()
          })
          .eq("id", loan.id);

        console.log(`Loan ${loan.id} marked as repaid. Successful: ${successfulRepayments}, Failed: ${failedRepayments}`);
        processedLoans.push(loan.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedLoans.length} matured loans`,
        processedLoans
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-repayments:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
