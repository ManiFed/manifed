import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Position {
  contractId: string;
  totalShares: { YES?: number; NO?: number };
  invested: number;
  hasYesShares: boolean;
  hasNoShares: boolean;
}

interface MarketInfo {
  id: string;
  question: string;
  url: string;
  probability: number;
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

    const { action, apiKey, marketId, targetExitPrice, orderId } = await req.json();
    console.log(`[limit-sell-order] Action: ${action}, User: ${user.id}, Market: ${marketId}`);

    if (action === 'get-position') {
      // Get user's position in a market
      if (!apiKey || !marketId) {
        return new Response(
          JSON.stringify({ error: 'API key and market ID are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user info from API key
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
      console.log(`[limit-sell-order] Got user: ${userData.username}`);

      // Get market info - try by slug first, then by ID
      let marketData: MarketInfo;
      let contractId: string;
      
      // First try to get market by slug
      let marketResponse = await fetch(`https://api.manifold.markets/v0/slug/${marketId}`);
      
      if (!marketResponse.ok) {
        // If slug fails, try by ID directly
        marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
        if (!marketResponse.ok) {
          console.error(`[limit-sell-order] Market not found for: ${marketId}`);
          return new Response(
            JSON.stringify({ error: 'Market not found. Please check the URL or ID.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      marketData = await marketResponse.json();
      contractId = marketData.id;
      console.log(`[limit-sell-order] Found market: ${contractId} - ${marketData.question}`);

      // Get user's position in this market using the contract ID
      const positionResponse = await fetch(
        `https://api.manifold.markets/v0/market/${contractId}/positions?userId=${userData.id}`
      );

      if (!positionResponse.ok) {
        console.error(`[limit-sell-order] Failed to fetch position: ${await positionResponse.text()}`);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch position' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const positions = await positionResponse.json();
      console.log(`[limit-sell-order] Positions:`, positions);

      if (!positions || positions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No position found in this market' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const position = positions[0];

      return new Response(
        JSON.stringify({
          market: {
            id: contractId,
            question: marketData.question,
            url: marketData.url,
            probability: marketData.probability
          },
          position: {
            yesShares: position.totalShares?.YES || 0,
            noShares: position.totalShares?.NO || 0,
            invested: position.invested,
            hasYesShares: position.hasYesShares,
            hasNoShares: position.hasNoShares,
          },
          user: {
            id: userData.id,
            username: userData.username,
            balance: userData.balance
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'place-limit-sell') {
      // Place a limit sell order by creating an opposite limit order
      if (!apiKey || !marketId || !targetExitPrice) {
        return new Response(
          JSON.stringify({ error: 'API key, market ID, and target exit price are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user info
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

      // Get market info - try by slug first, then by ID
      let marketData: MarketInfo;
      let contractId: string;
      
      let marketResponse = await fetch(`https://api.manifold.markets/v0/slug/${marketId}`);
      if (!marketResponse.ok) {
        marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
        if (!marketResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Market not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      marketData = await marketResponse.json();
      contractId = marketData.id;

      // Get user's position using contract ID
      const positionResponse = await fetch(
        `https://api.manifold.markets/v0/market/${contractId}/positions?userId=${userData.id}`
      );
      const positions = await positionResponse.json();
      
      if (!positions || positions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No position found in this market' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const position = positions[0];
      const hasYesShares = position.hasYesShares && (position.totalShares?.YES || 0) > 0;
      const hasNoShares = position.hasNoShares && (position.totalShares?.NO || 0) > 0;

      if (!hasYesShares && !hasNoShares) {
        return new Response(
          JSON.stringify({ error: 'No shares held in this market' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine position type and calculate hedge order
      const positionType = hasYesShares ? 'YES' : 'NO';
      const sharesHeld = hasYesShares ? position.totalShares.YES : position.totalShares.NO;
      
      // Calculate entry price (approximate from invested/shares)
      const entryPrice = position.invested / sharesHeld;

      // For YES position: place NO limit order at (1 - targetExitPrice)
      // For NO position: place YES limit order at (1 - targetExitPrice)
      const oppositeOutcome = positionType === 'YES' ? 'NO' : 'YES';
      const limitProb = positionType === 'YES' 
        ? 1 - targetExitPrice  // If holding YES, buy NO at this limit
        : targetExitPrice;     // If holding NO, buy YES at this limit

      // Cash required = N × (1 - Yₜ) for YES position, N × Yₜ for NO position
      const cashRequired = positionType === 'YES' 
        ? sharesHeld * (1 - targetExitPrice)
        : sharesHeld * targetExitPrice;

      // Check if user has enough balance BEFORE attempting to place order
      if (userData.balance < cashRequired) {
        console.error(`[limit-sell-order] Insufficient balance: has ${userData.balance}, needs ${cashRequired}`);
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient balance',
            details: `You need Ṁ${Math.ceil(cashRequired)} to place this order, but you only have Ṁ${Math.floor(userData.balance)}. Please add more mana to your Manifold account.`,
            required: Math.ceil(cashRequired),
            available: Math.floor(userData.balance)
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Expected profit = N × (Yₜ - Y₀) for YES position
      const expectedProfit = positionType === 'YES'
        ? sharesHeld * (targetExitPrice - entryPrice)
        : sharesHeld * ((1 - targetExitPrice) - (1 - entryPrice));

      console.log(`[limit-sell-order] Placing limit order: ${oppositeOutcome} at ${limitProb}, amount: ${cashRequired}`);

      // Place the limit order
      const betResponse = await fetch('https://api.manifold.markets/v0/bet', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.floor(cashRequired),
          contractId: contractId,
          outcome: oppositeOutcome,
          limitProb: Math.round(limitProb * 100) / 100 // Round to 2 decimal places
        })
      });

      if (!betResponse.ok) {
        const errorText = await betResponse.text();
        console.error(`[limit-sell-order] Bet failed:`, errorText);
        return new Response(
          JSON.stringify({ error: `Failed to place limit order: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const betData = await betResponse.json();
      console.log(`[limit-sell-order] Bet placed:`, betData);

      // Save order to database using service role
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('limit_sell_orders')
        .insert({
          user_id: user.id,
          market_id: contractId,
          market_question: marketData.question,
          market_url: marketData.url,
          position_type: positionType,
          shares_held: sharesHeld,
          entry_price: entryPrice,
          target_exit_price: targetExitPrice,
          limit_order_id: betData.betId || betData.id,
          cash_required: cashRequired,
          expected_profit: expectedProfit,
          status: betData.isFilled ? 'filled' : 'pending',
          filled_at: betData.isFilled ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (orderError) {
        console.error(`[limit-sell-order] Failed to save order:`, orderError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          order: orderData,
          bet: betData,
          message: betData.isFilled 
            ? 'Limit order filled immediately!' 
            : 'Limit order placed successfully. Will fill when market reaches target price.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel-order') {
      if (!apiKey || !orderId) {
        return new Response(
          JSON.stringify({ error: 'API key and order ID are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get order from database
      const { data: order, error: orderError } = await supabaseClient
        .from('limit_sell_orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (order.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: 'Order is not pending' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cancel the limit order on Manifold
      if (order.limit_order_id) {
        const cancelResponse = await fetch(
          `https://api.manifold.markets/v0/bet/cancel/${order.limit_order_id}`,
          {
            method: 'POST',
            headers: { 'Authorization': `Key ${apiKey}` }
          }
        );

        if (!cancelResponse.ok) {
          console.error(`[limit-sell-order] Failed to cancel on Manifold`);
        }
      }

      // Update status in database
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseAdmin
        .from('limit_sell_orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({ success: true, message: 'Order cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-orders') {
      const { data: orders, error: ordersError } = await supabaseClient
        .from('limit_sell_orders')
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
    console.error('[limit-sell-order] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
