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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
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

    const { loanId, amount, message, manifoldUsername } = await req.json();

    if (!loanId || !amount || amount < 10) {
      throw new Error("Invalid loan ID or amount (minimum M$10)");
    }

    if (!manifoldUsername) {
      throw new Error("Manifold username is required");
    }

    console.log(`Processing investment: user=${user.id}, loan=${loanId}, amount=${amount}`);

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) {
      throw new Error("Loan not found");
    }

    if (loan.status !== "seeking_funding") {
      throw new Error("Loan is not accepting funding");
    }

    // Partial funding not allowed - must fund full amount
    if (amount !== loan.amount) {
      throw new Error(`This loan requires full funding of M$${loan.amount}. Partial funding is not allowed.`);
    }

    if (loan.funded_amount > 0) {
      throw new Error("This loan has already been funded");
    }

    // Check user balance
    const { data: balanceData } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const userBalance = balanceData?.balance || 0;
    if (userBalance < amount) {
      throw new Error(`Insufficient balance. You have M$${userBalance}`);
    }

    // Deduct from investor's balance
    const { error: balanceError } = await supabase.rpc("modify_user_balance", {
      p_user_id: user.id,
      p_amount: amount,
      p_operation: "subtract",
    });

    if (balanceError) {
      console.error("Balance deduction error:", balanceError);
      throw new Error("Failed to deduct balance: " + balanceError.message);
    }

    // Create investment record
    const { error: investError } = await supabase.from("investments").insert({
      loan_id: loanId,
      investor_user_id: user.id,
      investor_username: manifoldUsername,
      amount: amount,
      message: message || null,
    });

    if (investError) {
      // Refund the balance
      await supabase.rpc("modify_user_balance", {
        p_user_id: user.id,
        p_amount: amount,
        p_operation: "add",
      });
      console.error("Investment insert error:", investError);
      throw new Error("Failed to create investment record");
    }

    // Record transaction for investor
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "invest",
      amount: -amount,
      loan_id: loanId,
      description: `Investment in: ${loan.title}`,
    });

    // Transfer directly to borrower's ManiFed balance
    const { error: transferError } = await supabase.rpc("modify_user_balance", {
      p_user_id: loan.borrower_user_id,
      p_amount: amount,
      p_operation: "add",
    });

    if (transferError) {
      console.error("Transfer to borrower error:", transferError);
      // Don't fail the investment - the funds are already recorded
    }

    // Record transaction for borrower
    await supabase.from("transactions").insert({
      user_id: loan.borrower_user_id,
      type: "loan_received",
      amount: amount,
      loan_id: loanId,
      description: `Loan funded: ${loan.title}`,
    });

    // Calculate maturity date
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + loan.term_days);

    // Update loan to active (fully funded)
    await supabase
      .from("loans")
      .update({
        funded_amount: amount,
        status: "active",
        maturity_date: maturityDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanId);

    console.log(`Investment successful: ${amount} to loan ${loanId}, transferred to borrower`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully funded M$${amount} - transferred to borrower`,
        newFundedAmount: amount,
        isFullyFunded: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Investment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Investment failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
