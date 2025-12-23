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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, apiKey, marketId, targetProbability, triggerDirection, amount, outcome, orderId } = await req.json();
    console.log(`[conditional-buy-order] Action: ${action}, User: ${user.id}`);

    if (action === 'get-market') {
      // Get market info for preview
      if (!marketId) {
        return new Response(
          JSON.stringify({ error: 'Market ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
      if (!marketResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Market not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const marketData = await marketResponse.json();

      return new Response(
        JSON.stringify({
          market: {
            id: marketData.id,
            question: marketData.question,
            url: marketData.url,
            probability: marketData.probability,
            closeTime: marketData.closeTime,
            isResolved: marketData.isResolved
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-order') {
      // Create a new conditional buy order
      if (!apiKey || !marketId || targetProbability === undefined || !triggerDirection || !amount || !outcome) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate API key
      const meResponse = await fetch('https://api.manifold.markets/v0/me', {
        headers: { 'Authorization': `Key ${apiKey}` }
      });
      if (!meResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const userData = await meResponse.json();

      if (userData.balance < amount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get market info
      const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
      if (!marketResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Market not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const marketData = await marketResponse.json();

      if (marketData.isResolved) {
        return new Response(
          JSON.stringify({ error: 'Market is already resolved' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if trigger condition is already met
      const currentProb = marketData.probability;
      const conditionMet = triggerDirection === 'above' 
        ? currentProb >= targetProbability
        : currentProb <= targetProbability;

      console.log(`[conditional-buy-order] Current: ${currentProb}, Target: ${targetProbability}, Direction: ${triggerDirection}, Condition met: ${conditionMet}`);

      // Save API key securely for later execution
      const { data: settings, error: settingsError } = await supabaseClient
        .from('user_manifold_settings')
        .upsert({
          user_id: user.id,
          manifold_api_key: apiKey,
          manifold_username: userData.username,
          manifold_user_id: userData.id
        }, { onConflict: 'user_id' });

      // Create the order
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const orderStatus = conditionMet ? 'triggered' : 'monitoring';
      let betData = null;

      // If condition is already met, execute immediately
      if (conditionMet) {
        console.log(`[conditional-buy-order] Executing immediately - condition already met`);
        
        const betResponse = await fetch('https://api.manifold.markets/v0/bet', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: Math.floor(amount),
            contractId: marketId,
            outcome: outcome
          })
        });

        if (betResponse.ok) {
          betData = await betResponse.json();
          console.log(`[conditional-buy-order] Bet executed:`, betData);
        } else {
          const errorText = await betResponse.text();
          console.error(`[conditional-buy-order] Bet failed:`, errorText);
        }
      }

      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('conditional_buy_orders')
        .insert({
          user_id: user.id,
          market_id: marketId,
          market_question: marketData.question,
          market_url: marketData.url,
          target_probability: targetProbability,
          trigger_direction: triggerDirection,
          amount: amount,
          outcome: outcome,
          current_probability: currentProb,
          status: betData ? 'filled' : orderStatus,
          bet_id: betData?.betId || betData?.id || null,
          triggered_at: conditionMet ? new Date().toISOString() : null,
          filled_at: betData ? new Date().toISOString() : null,
          last_checked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        console.error(`[conditional-buy-order] Failed to save order:`, orderError);
        return new Response(
          JSON.stringify({ error: 'Failed to create order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          order: orderData,
          bet: betData,
          message: betData 
            ? 'Condition met! Order executed immediately.'
            : `Order created. Will execute when probability goes ${triggerDirection} ${(targetProbability * 100).toFixed(0)}%`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel-order') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: updateError } = await supabaseAdmin
        .from('conditional_buy_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to cancel order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Order cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-orders') {
      const { data: orders, error: ordersError } = await supabaseClient
        .from('conditional_buy_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch orders' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ orders }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[conditional-buy-order] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
