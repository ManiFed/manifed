import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { amount, termWeeks } = await req.json();
    
    if (!amount || !termWeeks) {
      return new Response(JSON.stringify({ error: 'Amount and term required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount < 10) {
      return new Response(JSON.stringify({ error: 'Minimum bond purchase is M$10' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Valid terms
    const validTerms = [4, 13, 26, 52];
    if (!validTerms.includes(termWeeks)) {
      return new Response(JSON.stringify({ error: 'Invalid term' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user balance
    const { data: balanceData } = await serviceClient
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const currentBalance = balanceData?.balance || 0;

    if (purchaseAmount > currentBalance) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get bond rate
    const { data: rateData } = await serviceClient
      .from('bond_rates')
      .select('*')
      .eq('term_weeks', termWeeks)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const annualYield = rateData?.annual_yield || 6.0;
    const monthlyYield = rateData?.monthly_yield || 0.5;

    // Calculate maturity and return
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + (termWeeks * 7));
    const termYears = termWeeks / 52;
    const totalReturn = purchaseAmount * (1 + annualYield / 100 * termYears);

    // Deduct balance
    const { error: balanceError } = await serviceClient.rpc('modify_user_balance', {
      p_user_id: user.id,
      p_amount: purchaseAmount,
      p_operation: 'subtract'
    });

    if (balanceError) {
      console.error('Balance error:', balanceError);
      return new Response(JSON.stringify({ error: 'Failed to deduct balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create bond
    const { data: bond, error: bondError } = await serviceClient.from('bonds').insert({
      user_id: user.id,
      amount: purchaseAmount,
      term_weeks: termWeeks,
      annual_yield: annualYield,
      monthly_yield: monthlyYield,
      maturity_date: maturityDate.toISOString(),
      total_return: totalReturn,
    }).select().single();

    if (bondError) {
      // Refund on error
      await serviceClient.rpc('modify_user_balance', {
        p_user_id: user.id,
        p_amount: purchaseAmount,
        p_operation: 'add'
      });
      throw bondError;
    }

    // Record transaction
    const termLabels: Record<number, string> = {
      4: '4 Week T-Bill',
      13: '3 Month T-Bill',
      26: '6 Month T-Bill',
      52: '1 Year T-Bill',
    };

    await serviceClient.from('transactions').insert({
      user_id: user.id,
      type: 'bond_purchase',
      amount: -purchaseAmount,
      description: `Purchased ${termLabels[termWeeks]}`,
    });

    console.log(`User ${user.id} purchased ${termLabels[termWeeks]} for M$${purchaseAmount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      bond,
      totalReturn,
      maturityDate: maturityDate.toISOString(),
      message: `Purchased M$${purchaseAmount} ${termLabels[termWeeks]}. Returns M$${totalReturn.toFixed(2)} at maturity.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bond purchase error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Purchase failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
