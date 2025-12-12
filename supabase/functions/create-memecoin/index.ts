import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRANSACTION_FEE = 0.005; // 0.5%

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

    const { name, symbol, emoji, initialLiquidity } = await req.json();
    
    if (!name || !symbol || !initialLiquidity) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const liquidity = parseFloat(initialLiquidity);
    if (isNaN(liquidity) || liquidity < 100) {
      return new Response(JSON.stringify({ error: 'Minimum liquidity is M$100' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fee = liquidity * TRANSACTION_FEE;
    const totalCost = liquidity + fee;

    // Get user balance
    const { data: balanceData } = await serviceClient
      .from('user_balances')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const currentBalance = balanceData?.balance || 0;

    if (totalCost > currentBalance) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct balance
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

    // Create memecoin
    const { data: newCoin, error: coinError } = await serviceClient.from('memecoins').insert({
      name,
      symbol: symbol.toUpperCase(),
      image_url: emoji || '🪙',
      creator_id: user.id,
      pool_mana: liquidity,
      pool_tokens: liquidity * 2,
      total_supply: 1000000,
    }).select().single();

    if (coinError) {
      // Refund on error
      await serviceClient.rpc('modify_user_balance', {
        p_user_id: user.id,
        p_amount: totalCost,
        p_operation: 'add'
      });
      throw coinError;
    }

    // Record transaction
    await serviceClient.from('transactions').insert({
      user_id: user.id,
      type: 'memecoin_create',
      amount: -totalCost,
      description: `Created memecoin ${name}`,
    });

    // Record fee to fee_pool
    await serviceClient.from('fee_pool').insert({
      user_id: user.id,
      amount: fee,
      source: 'memecoin_create',
    });

    console.log(`User ${user.id} created memecoin ${name} (${symbol}) with M$${liquidity} liquidity`);

    return new Response(JSON.stringify({ 
      success: true, 
      coin: newCoin,
      fee,
      message: `Created ${name} with M$${liquidity} liquidity`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Create memecoin error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Creation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
