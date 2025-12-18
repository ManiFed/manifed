import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tier limits
const TIER_LIMITS = {
  free: { arbitrageScans: 3, marketQueries: 5, commentPosts: 3 },
  basic: { arbitrageScans: 10, marketQueries: 20, commentPosts: 5 },
  pro: { arbitrageScans: 25, marketQueries: 40, commentPosts: 10 },
  premium: { arbitrageScans: 60, marketQueries: 80, commentPosts: 20 },
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
    const { type } = await req.json(); // 'arbitrage_scan', 'market_query', or 'comment_post'
    if (!type || !['arbitrage_scan', 'market_query', 'comment_post'].includes(type)) {
      throw new Error("Invalid usage type");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get current subscription
    let { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Create if doesn't exist
    if (!subscription) {
      const { data: newSub, error: createError } = await supabaseClient
        .from('user_subscriptions')
        .insert({ user_id: user.id, status: 'free' })
        .select()
        .single();
      if (createError) throw createError;
      subscription = newSub;
    }

    const tier = subscription.status || 'free';
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] || TIER_LIMITS.free;

    // Check if usage reset is needed
    const resetAt = new Date(subscription.usage_reset_at);
    const now = new Date();
    const monthDiff = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
    
    if (monthDiff >= 1) {
      await supabaseClient
        .from('user_subscriptions')
        .update({
          arbitrage_scans_used: 0,
          market_queries_used: 0,
          usage_reset_at: now.toISOString(),
        })
        .eq('user_id', user.id);
      subscription.arbitrage_scans_used = 0;
      subscription.market_queries_used = 0;
    }

    // Check limits
    if (type === 'arbitrage_scan') {
      if (subscription.arbitrage_scans_used >= limits.arbitrageScans) {
        return new Response(JSON.stringify({
          success: false,
          error: 'limit_reached',
          message: `You've reached your monthly limit of ${limits.arbitrageScans} arbitrage scans. Upgrade your plan for more.`,
          current: subscription.arbitrage_scans_used,
          limit: limits.arbitrageScans,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      await supabaseClient
        .from('user_subscriptions')
        .update({ arbitrage_scans_used: subscription.arbitrage_scans_used + 1 })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        success: true,
        current: subscription.arbitrage_scans_used + 1,
        limit: limits.arbitrageScans,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (type === 'market_query') {
      if (subscription.market_queries_used >= limits.marketQueries) {
        return new Response(JSON.stringify({
          success: false,
          error: 'limit_reached',
          message: `You've reached your monthly limit of ${limits.marketQueries} market queries. Upgrade your plan for more.`,
          current: subscription.market_queries_used,
          limit: limits.marketQueries,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      await supabaseClient
        .from('user_subscriptions')
        .update({ market_queries_used: subscription.market_queries_used + 1 })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        success: true,
        current: subscription.market_queries_used + 1,
        limit: limits.marketQueries,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // comment_post
      const commentPostsUsed = (subscription as any).comment_posts_used || 0;
      if (commentPostsUsed >= limits.commentPosts) {
        return new Response(JSON.stringify({
          success: false,
          error: 'limit_reached',
          message: `You've reached your monthly limit of ${limits.commentPosts} AI comment posts. Upgrade your plan for more.`,
          current: commentPostsUsed,
          limit: limits.commentPosts,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }

      await supabaseClient
        .from('user_subscriptions')
        .update({ comment_posts_used: commentPostsUsed + 1 })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        success: true,
        current: commentPostsUsed + 1,
        limit: limits.commentPosts,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[INCREMENT-USAGE] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
