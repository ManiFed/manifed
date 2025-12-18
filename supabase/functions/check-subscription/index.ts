import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Tier definitions with limits
const TIERS = {
  free: {
    arbitrageScans: 3,
    marketQueries: 5,
    scanInterval: null,
    queryInterval: 'month',
  },
  basic: {
    productId: 'prod_Tck6DaVe4R3cWv',
    arbitrageScans: 10,
    marketQueries: 20,
    scanInterval: 'month',
    queryInterval: 'month',
  },
  pro: {
    productId: 'prod_Tck6cZ15Oc03JA',
    arbitrageScans: 25,
    marketQueries: 40,
    scanInterval: 'month',
    queryInterval: 'month',
  },
  premium: {
    productId: 'prod_Tck6LV1MCbB6mm',
    arbitrageScans: 60, // 1 per 12 hours = ~60/month
    marketQueries: 80, // 20/week = 80/month
    scanInterval: 'month',
    queryInterval: 'month',
  },
};

function getTierFromProductId(productId: string | null): string {
  if (!productId) return 'free';
  for (const [tier, config] of Object.entries(TIERS)) {
    if ('productId' in config && config.productId === productId) {
      return tier;
    }
  }
  return 'free';
}

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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let subscribed = false;
    let productId = null;
    let subscriptionEnd = null;
    let tier = 'free';

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        subscribed = true;
        const subscription = subscriptions.data[0];
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        productId = subscription.items.data[0].price.product as string;
        tier = getTierFromProductId(productId);
        logStep("Active subscription found", { subscriptionId: subscription.id, tier, endDate: subscriptionEnd });

        // Update or create subscription record
        await supabaseClient
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            product_id: productId,
            price_id: subscription.items.data[0].price.id,
            status: tier,
            current_period_end: subscriptionEnd,
          }, { onConflict: 'user_id' });
      }
    }

    // Get current usage
    const { data: usageData } = await supabaseClient
      .from('user_subscriptions')
      .select('arbitrage_scans_used, market_queries_used, usage_reset_at')
      .eq('user_id', user.id)
      .single();

    // Check if usage needs reset (monthly)
    let scansUsed = 0;
    let queriesUsed = 0;
    if (usageData) {
      const resetAt = new Date(usageData.usage_reset_at);
      const now = new Date();
      const monthDiff = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
      
      if (monthDiff >= 1) {
        // Reset usage
        await supabaseClient
          .from('user_subscriptions')
          .update({
            arbitrage_scans_used: 0,
            market_queries_used: 0,
            usage_reset_at: now.toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        scansUsed = usageData.arbitrage_scans_used;
        queriesUsed = usageData.market_queries_used;
      }
    } else {
      // Create free tier record
      await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          status: 'free',
        });
    }

    const tierConfig = TIERS[tier as keyof typeof TIERS] || TIERS.free;

    return new Response(JSON.stringify({
      subscribed,
      tier,
      product_id: productId,
      subscription_end: subscriptionEnd,
      limits: {
        arbitrageScans: tierConfig.arbitrageScans,
        marketQueries: tierConfig.marketQueries,
      },
      usage: {
        arbitrageScans: scansUsed,
        marketQueries: queriesUsed,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
