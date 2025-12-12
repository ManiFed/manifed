import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRANSACTION_FEE = 0.005; // 0.5%
const AMM_FEE = 0.003; // 0.3%

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
    
    // User client to get authenticated user
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

    // Service role client for privileged operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { coinId, amount, tradeType } = await req.json();
    
    if (!coinId || !amount || !tradeType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tradeAmount = parseFloat(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get memecoin
    const { data: coin, error: coinError } = await serviceClient
      .from('memecoins')
      .select('*')
      .eq('id', coinId)
      .single();

    if (coinError || !coin) {
      return new Response(JSON.stringify({ error: 'Memecoin not found' }), {
        status: 404,
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

    if (tradeType === 'buy') {
      // Minimum M$10 for buys
      if (tradeAmount < 10) {
        return new Response(JSON.stringify({ error: 'Minimum buy amount is M$10' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const txFee = tradeAmount * TRANSACTION_FEE;
      const totalCost = tradeAmount + txFee;

      if (totalCost > currentBalance) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate tokens out (AMM formula)
      const ammFee = tradeAmount * AMM_FEE;
      const manaInAfterFee = tradeAmount - ammFee;
      const k = coin.pool_mana * coin.pool_tokens;
      const newPoolMana = coin.pool_mana + manaInAfterFee;
      const newPoolTokens = k / newPoolMana;
      const tokensOut = coin.pool_tokens - newPoolTokens;
      const pricePerToken = tradeAmount / tokensOut;

      // Deduct balance using service role
      const { error: balanceError } = await serviceClient.rpc('modify_user_balance', {
        p_user_id: user.id,
        p_amount: totalCost,
        p_operation: 'subtract'
      });

      if (balanceError) {
        console.error('Balance error:', balanceError);
        return new Response(JSON.stringify({ error: 'Failed to deduct balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update pool
      await serviceClient.from('memecoins').update({ 
        pool_mana: newPoolMana, 
        pool_tokens: newPoolTokens 
      }).eq('id', coinId);

      // Record trade
      await serviceClient.from('memecoin_trades').insert({
        memecoin_id: coinId,
        user_id: user.id,
        trade_type: 'buy',
        mana_amount: tradeAmount,
        token_amount: tokensOut,
        price_per_token: pricePerToken,
        fee_amount: txFee,
      });

      // Update holdings
      const { data: holding } = await serviceClient
        .from('memecoin_holdings')
        .select('*')
        .eq('user_id', user.id)
        .eq('memecoin_id', coinId)
        .maybeSingle();

      if (holding) {
        await serviceClient.from('memecoin_holdings')
          .update({ amount: holding.amount + tokensOut })
          .eq('id', holding.id);
      } else {
        await serviceClient.from('memecoin_holdings')
          .insert({ user_id: user.id, memecoin_id: coinId, amount: tokensOut });
      }

      // Record transaction
      await serviceClient.from('transactions').insert({
        user_id: user.id,
        type: 'memecoin_buy',
        amount: -totalCost,
        description: `Bought ${tokensOut.toFixed(2)} ${coin.symbol}`,
      });

      // Record fee to fee_pool (server-side with service role)
      await serviceClient.from('fee_pool').insert({
        user_id: user.id,
        amount: txFee,
        source: 'memecoin',
      });

      console.log(`User ${user.id} bought ${tokensOut.toFixed(2)} ${coin.symbol} for M$${tradeAmount}`);

      return new Response(JSON.stringify({ 
        success: true, 
        tokensOut,
        fee: txFee,
        message: `Bought ${tokensOut.toFixed(2)} ${coin.symbol} for M$${tradeAmount}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (tradeType === 'sell') {
      // Get user's holding
      const { data: holding } = await serviceClient
        .from('memecoin_holdings')
        .select('*')
        .eq('user_id', user.id)
        .eq('memecoin_id', coinId)
        .maybeSingle();

      if (!holding || holding.amount < tradeAmount) {
        return new Response(JSON.stringify({ error: 'Insufficient tokens' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate mana out (AMM formula)
      const k = coin.pool_mana * coin.pool_tokens;
      const newPoolTokens = coin.pool_tokens + tradeAmount;
      const newPoolMana = k / newPoolTokens;
      const manaOut = coin.pool_mana - newPoolMana;
      const ammFee = manaOut * AMM_FEE;
      const manaOutAfterAmmFee = manaOut - ammFee;
      const txFee = manaOutAfterAmmFee * TRANSACTION_FEE;
      const netMana = manaOutAfterAmmFee - txFee;

      // Check minimum output
      if (netMana < 10) {
        return new Response(JSON.stringify({ error: 'Sell must result in at least M$10 output' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update pool
      await serviceClient.from('memecoins').update({ 
        pool_mana: newPoolMana, 
        pool_tokens: newPoolTokens 
      }).eq('id', coinId);

      // Credit balance using service role
      const { error: balanceError } = await serviceClient.rpc('modify_user_balance', {
        p_user_id: user.id,
        p_amount: netMana,
        p_operation: 'add'
      });

      if (balanceError) {
        console.error('Balance error:', balanceError);
        return new Response(JSON.stringify({ error: 'Failed to credit balance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Record trade
      await serviceClient.from('memecoin_trades').insert({
        memecoin_id: coinId,
        user_id: user.id,
        trade_type: 'sell',
        mana_amount: manaOutAfterAmmFee,
        token_amount: tradeAmount,
        price_per_token: manaOutAfterAmmFee / tradeAmount,
        fee_amount: txFee,
      });

      // Update holdings
      await serviceClient.from('memecoin_holdings')
        .update({ amount: holding.amount - tradeAmount })
        .eq('id', holding.id);

      // Record transaction
      await serviceClient.from('transactions').insert({
        user_id: user.id,
        type: 'memecoin_sell',
        amount: netMana,
        description: `Sold ${tradeAmount} ${coin.symbol}`,
      });

      // Record fee to fee_pool
      await serviceClient.from('fee_pool').insert({
        user_id: user.id,
        amount: txFee,
        source: 'memecoin',
      });

      console.log(`User ${user.id} sold ${tradeAmount} ${coin.symbol} for M$${netMana.toFixed(2)}`);

      return new Response(JSON.stringify({ 
        success: true, 
        manaOut: netMana,
        fee: txFee,
        message: `Sold ${tradeAmount} ${coin.symbol} for M$${netMana.toFixed(2)}`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid trade type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Trade error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Trade failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
