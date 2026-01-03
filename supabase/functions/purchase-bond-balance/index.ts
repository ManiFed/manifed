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

    const { amount, termWeeks } = await req.json();

    if (!amount || amount < 10) {
      throw new Error("Minimum bond purchase is M$10");
    }

    if (!termWeeks || ![4, 13, 26, 52].includes(termWeeks)) {
      throw new Error("Invalid term weeks");
    }

    console.log(`Processing bond purchase: user=${user.id}, amount=${amount}, term=${termWeeks}`);

    // Check weekly limit
    if (amount > 100000) {
      throw new Error("Maximum purchase is M$100,000 per week");
    }

    // Check current holdings cap
    const { data: existingBonds } = await supabase
      .from("bonds")
      .select("amount")
      .eq("user_id", user.id)
      .eq("status", "active");

    const currentHoldings = existingBonds?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
    if (currentHoldings + amount > 250000) {
      throw new Error(`Holdings cap exceeded. Current: M$${currentHoldings.toLocaleString()}, Max: M$250,000`);
    }

    // Get current bond rate
    const { data: rateData } = await supabase
      .from("bond_rates")
      .select("*")
      .eq("term_weeks", termWeeks)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const annualYield = rateData?.annual_yield || 6;
    const monthlyYield = rateData?.monthly_yield || 0.5;

    // Check minimum amount for M$10/month interest
    const minimumAmount = Math.ceil(10 * 12 * 100 / annualYield);
    if (amount < minimumAmount) {
      throw new Error(`Minimum amount for this term is M$${minimumAmount} to ensure M$10+/month interest`);
    }

    // Check user balance
    const { data: balanceData } = await supabase
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const userBalance = balanceData?.balance || 0;
    if (userBalance < amount) {
      throw new Error(`Insufficient balance. You have M$${userBalance.toLocaleString()}`);
    }

    // Deduct from balance
    const { error: balanceError } = await supabase.rpc("modify_user_balance", {
      p_user_id: user.id,
      p_amount: amount,
      p_operation: "subtract",
    });

    if (balanceError) {
      console.error("Balance deduction error:", balanceError);
      throw new Error("Failed to deduct balance");
    }

    // Calculate dates
    const now = new Date();
    const maturityDate = new Date(now);
    maturityDate.setDate(maturityDate.getDate() + termWeeks * 7);

    // For 4-week bonds, interest is paid at maturity (not monthly)
    // For longer bonds, interest is paid monthly
    const nextInterestDate = new Date(now);
    if (termWeeks === 4) {
      // 4-week bond: interest paid at maturity only
      nextInterestDate.setTime(maturityDate.getTime());
    } else {
      // Other bonds: monthly interest payments
      nextInterestDate.setMonth(nextInterestDate.getMonth() + 1);
    }

    // Calculate total return
    const termMonths = termWeeks / 4;
    const totalInterest = amount * (annualYield / 100) * (termWeeks / 52);
    const totalReturn = amount + totalInterest;

    // Create bond
    const { data: bond, error: bondError } = await supabase
      .from("bonds")
      .insert({
        user_id: user.id,
        amount: amount,
        term_weeks: termWeeks,
        annual_yield: annualYield,
        monthly_yield: monthlyYield,
        maturity_date: maturityDate.toISOString(),
        next_interest_date: nextInterestDate.toISOString(),
        total_return: totalReturn,
        status: "active",
      })
      .select()
      .single();

    if (bondError) {
      // Refund the balance
      await supabase.rpc("modify_user_balance", {
        p_user_id: user.id,
        p_amount: amount,
        p_operation: "add",
      });
      console.error("Bond creation error:", bondError);
      throw new Error("Failed to create bond");
    }

    // Record transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "bond_purchase",
      amount: -amount,
      description: `Treasury Bond purchase: ${termWeeks}w term`,
    });

    console.log(`Bond purchased successfully: ${bond.bond_code}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully purchased bond ${bond.bond_code}`,
        bond: {
          id: bond.id,
          bond_code: bond.bond_code,
          amount: bond.amount,
          term_weeks: bond.term_weeks,
          annual_yield: bond.annual_yield,
          maturity_date: bond.maturity_date,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Bond purchase error:", error);
    const errorMessage = error instanceof Error ? error.message : "Bond purchase failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
