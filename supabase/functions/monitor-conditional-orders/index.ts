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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[monitor-conditional-orders] Starting monitoring run');

    // Get all monitoring orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('conditional_buy_orders')
      .select('*')
      .eq('status', 'monitoring');

    if (ordersError) {
      console.error('[monitor-conditional-orders] Failed to fetch orders:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[monitor-conditional-orders] Found ${orders?.length || 0} monitoring orders`);

    const results = [];

    for (const order of orders || []) {
      try {
        // Get current market probability
        const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${order.market_id}/prob`);
        
        if (!marketResponse.ok) {
          console.error(`[monitor-conditional-orders] Failed to fetch market ${order.market_id}`);
          continue;
        }

        const probData = await marketResponse.json();
        const currentProb = probData.prob;

        console.log(`[monitor-conditional-orders] Order ${order.id}: current=${currentProb}, target=${order.target_probability}, direction=${order.trigger_direction}`);

        // Update current probability
        await supabaseAdmin
          .from('conditional_buy_orders')
          .update({ 
            current_probability: currentProb,
            last_checked_at: new Date().toISOString()
          })
          .eq('id', order.id);

        // Check if trigger condition is met
        const conditionMet = order.trigger_direction === 'above' 
          ? currentProb >= order.target_probability
          : currentProb <= order.target_probability;

        if (conditionMet) {
          console.log(`[monitor-conditional-orders] Condition met for order ${order.id}!`);

          // Get user's API key
          const { data: settings, error: settingsError } = await supabaseAdmin
            .from('user_manifold_settings')
            .select('manifold_api_key')
            .eq('user_id', order.user_id)
            .single();

          if (settingsError || !settings?.manifold_api_key) {
            console.error(`[monitor-conditional-orders] No API key found for user ${order.user_id}`);
            await supabaseAdmin
              .from('conditional_buy_orders')
              .update({ status: 'failed' })
              .eq('id', order.id);
            continue;
          }

          // Execute the bet
          const betResponse = await fetch('https://api.manifold.markets/v0/bet', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${settings.manifold_api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: Math.floor(order.amount),
              contractId: order.market_id,
              outcome: order.outcome
            })
          });

          if (betResponse.ok) {
            const betData = await betResponse.json();
            console.log(`[monitor-conditional-orders] Bet executed for order ${order.id}:`, betData);

            await supabaseAdmin
              .from('conditional_buy_orders')
              .update({ 
                status: 'filled',
                bet_id: betData.betId || betData.id,
                triggered_at: new Date().toISOString(),
                filled_at: new Date().toISOString()
              })
              .eq('id', order.id);

            results.push({ orderId: order.id, status: 'filled', bet: betData });
          } else {
            const errorText = await betResponse.text();
            console.error(`[monitor-conditional-orders] Bet failed for order ${order.id}:`, errorText);

            await supabaseAdmin
              .from('conditional_buy_orders')
              .update({ 
                status: 'failed',
                triggered_at: new Date().toISOString()
              })
              .eq('id', order.id);

            results.push({ orderId: order.id, status: 'failed', error: errorText });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (orderError: unknown) {
        console.error(`[monitor-conditional-orders] Error processing order ${order.id}:`, orderError);
        const errMsg = orderError instanceof Error ? orderError.message : 'Unknown error';
        results.push({ orderId: order.id, status: 'error', error: errMsg });
      }
    }

    console.log(`[monitor-conditional-orders] Completed. Processed ${orders?.length || 0} orders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ordersProcessed: orders?.length || 0,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[monitor-conditional-orders] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
