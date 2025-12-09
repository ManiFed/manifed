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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create client with user token for auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { loanId } = await req.json();

    if (!loanId) {
      return new Response(
        JSON.stringify({ error: "loanId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} attempting to cancel loan ${loanId}`);

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) {
      return new Response(
        JSON.stringify({ error: "Loan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the loan
    if (loan.borrower_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only cancel your own loans" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Can only cancel seeking_funding or active loans
    if (loan.status !== "seeking_funding" && loan.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Can only cancel loans that are seeking funding or active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Cancelling loan: ${loan.title}`);

    // Get all investments for this loan
    const { data: investments, error: investError } = await supabase
      .from("investments")
      .select("*")
      .eq("loan_id", loanId);

    if (investError) {
      console.error("Error fetching investments:", investError);
      throw investError;
    }

    console.log(`Found ${investments?.length || 0} investments to refund`);

    // Refund each investor
    let refundedAmount = 0;
    for (const investment of investments || []) {
      const refundAmount = Number(investment.amount);

      // Get investor's balance
      const { data: investorBalance } = await supabase
        .from("user_balances")
        .select("*")
        .eq("user_id", investment.investor_user_id)
        .single();

      if (investorBalance) {
        // Credit the investor's ManiFed balance (principal only, no interest)
        const newBalance = Number(investorBalance.balance) + refundAmount;
        const newTotalInvested = Math.max(0, Number(investorBalance.total_invested) - refundAmount);

        await supabase
          .from("user_balances")
          .update({
            balance: newBalance,
            total_invested: newTotalInvested,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", investment.investor_user_id);

        // Record the refund transaction
        await supabase
          .from("transactions")
          .insert({
            user_id: investment.investor_user_id,
            type: "refund",
            amount: refundAmount,
            description: `Loan cancelled - refund: ${loan.title}`,
            loan_id: loan.id
          });

        console.log(`Refunded M$${refundAmount} to investor ${investment.investor_username}`);
        refundedAmount += refundAmount;
      }
    }

    // Update loan status to cancelled (using defaulted as the closest status)
    await supabase
      .from("loans")
      .update({
        status: "cancelled",
        funded_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq("id", loanId);

    console.log(`Loan ${loanId} cancelled. Total refunded: M$${refundedAmount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Loan cancelled. M$${refundedAmount} refunded to ${investments?.length || 0} investors.`,
        refundedAmount,
        investorsRefunded: investments?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cancel-loan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
