import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FEE_RATE = 0.005; // 0.5%

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

    const { itemId } = await req.json();
    
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Item ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get market item
    const { data: item, error: itemError } = await serviceClient
      .from('market_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already owned
    const { data: existingItem } = await serviceClient
      .from('user_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existingItem) {
      return new Response(JSON.stringify({ error: 'You already own this item' }), {
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

    if (item.price > currentBalance) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct balance
    const { error: balanceError } = await serviceClient.rpc('modify_user_balance', {
      p_user_id: user.id,
      p_amount: item.price,
      p_operation: 'subtract'
    });

    if (balanceError) {
      console.error('Balance error:', balanceError);
      return new Response(JSON.stringify({ error: 'Failed to deduct balance' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add item to user's inventory
    const { error: insertError } = await serviceClient
      .from('user_items')
      .insert({
        user_id: user.id,
        item_id: itemId,
      });

    if (insertError) {
      // Refund on error
      await serviceClient.rpc('modify_user_balance', {
        p_user_id: user.id,
        p_amount: item.price,
        p_operation: 'add'
      });
      throw insertError;
    }

    // Record transaction
    await serviceClient.from('transactions').insert({
      user_id: user.id,
      type: 'market_purchase',
      amount: -item.price,
      description: `Purchased ${item.name}`,
    });

    // Record fee to fee_pool
    const feeAmount = item.price * FEE_RATE;
    await serviceClient.from('fee_pool').insert({
      user_id: user.id,
      amount: feeAmount,
      source: 'market',
    });

    console.log(`User ${user.id} purchased ${item.name} for M$${item.price}`);

    return new Response(JSON.stringify({ 
      success: true, 
      item: item.name,
      message: `Purchased ${item.name}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Purchase error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Purchase failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
