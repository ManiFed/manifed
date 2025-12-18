import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MFAI Credit limits per tier
const CREDIT_LIMITS = {
  free: 15,
  basic: 50,
  pro: 100,
  premium: 200,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { type, amount = 1 } = await req.json();
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin (unlimited access)
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (isAdmin) {
      return new Response(JSON.stringify({
        success: true,
        current: 0,
        limit: Infinity,
        isAdmin: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get current subscription
    let { data: subscription } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      const { data: newSub } = await supabaseClient
        .from('user_subscriptions')
        .insert({ user_id: user.id, status: 'free' })
        .select()
        .single();
      subscription = newSub;
    }

    const tier = subscription.status || 'free';
    const limit = CREDIT_LIMITS[tier as keyof typeof CREDIT_LIMITS] || 15;
    const creditsUsed = subscription.mfai_credits_used || 0;

    // Check if usage reset is needed (monthly)
    const resetAt = new Date(subscription.usage_reset_at);
    const now = new Date();
    const monthDiff = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
    
    let currentCredits = creditsUsed;
    if (monthDiff >= 1) {
      await supabaseClient
        .from('user_subscriptions')
        .update({
          mfai_credits_used: 0,
          usage_reset_at: now.toISOString(),
        })
        .eq('user_id', user.id);
      currentCredits = 0;
    }

    // For MFAI credits
    if (type === 'mfai_credits') {
      if (currentCredits + amount > limit) {
        return new Response(JSON.stringify({
          success: false,
          error: 'limit_reached',
          message: `You need ${amount} credits but only have ${limit - currentCredits} remaining. Upgrade for more!`,
          current: currentCredits,
          limit,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      await supabaseClient
        .from('user_subscriptions')
        .update({ mfai_credits_used: currentCredits + amount })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        success: true,
        current: currentCredits + amount,
        limit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Legacy support for old usage types - map to credits
    const creditCosts: Record<string, number> = {
      'arbitrage_scan': 5,
      'market_query': 1,
      'comment_post': 1,
    };

    const cost = creditCosts[type] || 1;

    if (currentCredits + cost > limit) {
      return new Response(JSON.stringify({
        success: false,
        error: 'limit_reached',
        message: `You need ${cost} credits but only have ${limit - currentCredits} remaining.`,
        current: currentCredits,
        limit,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    await supabaseClient
      .from('user_subscriptions')
      .update({ mfai_credits_used: currentCredits + cost })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      success: true,
      current: currentCredits + cost,
      limit,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[INCREMENT-USAGE] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
