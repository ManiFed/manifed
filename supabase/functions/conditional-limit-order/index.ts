import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConditionalOrder {
  id: string;
  user_id: string;
  market_id: string;
  market_question: string;
  market_url: string;
  side: 'YES' | 'NO';
  amount: number;
  target_probability: number;
  trigger_direction: 'above' | 'below';
  status: 'pending' | 'triggered' | 'filled' | 'cancelled' | 'failed';
  created_at: string;
}

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, marketId, marketUrl, side, amount, targetProbability, orderId } = await req.json();
    console.log(`[conditional-limit] Action: ${action}, User: ${user.id}`);

    if (action === 'create-order') {
      // Validate inputs
      if (!marketId || !side || !amount || targetProbability === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current market probability
      const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
      if (!marketResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Market not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const marketData = await marketResponse.json();
      const currentProb = marketData.probability * 100;
      const targetProb = targetProbability;

      // Determine trigger direction based on side and target
      // YES limit above current = wait for price to drop to target (trigger when <= target)
      // YES limit below current = execute immediately (should not happen in this function)
      // NO limit below current = wait for price to rise to target (trigger when >= target)
      // NO limit above current = execute immediately (should not happen in this function)
      
      let triggerDirection: 'above' | 'below';
      let shouldExecuteNow = false;

      if (side === 'YES') {
        if (targetProb >= currentProb) {
          // YES at or above current price - execute immediately (normal limit order)
          shouldExecuteNow = true;
          triggerDirection = 'below';
        } else {
          // YES below current price - wait for probability to fall
          triggerDirection = 'below'; // Trigger when prob falls to or below target
        }
      } else {
        // NO
        if (targetProb <= currentProb) {
          // NO at or below current price - execute immediately
          shouldExecuteNow = true;
          triggerDirection = 'above';
        } else {
          // NO above current price - wait for probability to rise
          triggerDirection = 'above'; // Trigger when prob rises to or above target
        }
      }

      if (shouldExecuteNow) {
        // This is a normal limit order at or better than current price
        // Return a message indicating to use the normal limit order flow
        return new Response(
          JSON.stringify({ 
            executeNow: true,
            message: 'Target price is at or better than current. Use normal limit order.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create conditional order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('conditional_buy_orders')
        .insert({
          user_id: user.id,
          market_id: marketId,
          market_question: marketData.question,
          market_url: marketUrl || marketData.url,
          outcome: side,
          amount: amount,
          target_probability: targetProb / 100, // Store as decimal
          trigger_direction: triggerDirection,
          current_probability: currentProb / 100,
          status: 'monitoring',
        })
        .select()
        .single();

      if (orderError) {
        console.error('[conditional-limit] Failed to create order:', orderError);
        return new Response(
          JSON.stringify({ error: 'Failed to create order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[conditional-limit] Created order ${order.id}: ${side} ${amount}M @ ${targetProb}%`);

      return new Response(
        JSON.stringify({
          success: true,
          order,
          message: `Conditional order created. Will execute when probability ${triggerDirection === 'below' ? 'falls to' : 'rises to'} ${targetProb}%`
        }),
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

    if (action === 'cancel-order') {
      if (!orderId) {
        return new Response(
          JSON.stringify({ error: 'Order ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseClient
        .from('conditional_buy_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) {
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

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[conditional-limit] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
