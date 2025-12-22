import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MANIFED_USERNAME = "ManiFed";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { apiKey, planType, amount } = await req.json();

    if (!apiKey) throw new Error("API key is required");
    if (!planType) throw new Error("Plan type is required");
    if (!amount || amount < 1) throw new Error("Invalid amount");

    console.log(`[FINTECH-SUB] Processing ${planType} subscription for ${amount} mana`);

    // Verify API key and check balance
    const meResponse = await fetch("https://api.manifold.markets/v0/me", {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!meResponse.ok) {
      throw new Error("Invalid Manifold API key");
    }

    const me = await meResponse.json();
    console.log(`[FINTECH-SUB] Verified user: @${me.username}, balance: ${me.balance}`);

    if (me.balance < amount) {
      throw new Error(`Insufficient balance. You have M$${me.balance.toFixed(0)} but need M$${amount}`);
    }

    // Get ManiFed user ID
    const manifedResponse = await fetch(`https://api.manifold.markets/v0/user/${MANIFED_USERNAME}`);
    if (!manifedResponse.ok) {
      throw new Error("Could not find ManiFed account");
    }
    const manifedUser = await manifedResponse.json();

    // Send mana to ManiFed
    const sendResponse = await fetch("https://api.manifold.markets/v0/managram", {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toIds: [manifedUser.id],
        amount: amount,
        message: `ManiFed Fintech ${planType} subscription`,
      }),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error("[FINTECH-SUB] Managram failed:", errorText);
      throw new Error("Failed to send payment. Check your balance and try again.");
    }

    console.log(`[FINTECH-SUB] Payment received: M$${amount} from @${me.username}`);

    // Calculate expiry date
    let expiresAt: Date;
    const now = new Date();
    switch (planType) {
      case 'monthly':
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'yearly':
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    // Create or update subscription
    const { error: subError } = await supabase
      .from('fintech_subscriptions')
      .upsert({
        user_id: userData.user.id,
        plan_type: planType,
        mana_price: amount,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        is_gifted: false,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error("[FINTECH-SUB] DB error:", subError);
      throw new Error("Failed to activate subscription");
    }

    console.log(`[FINTECH-SUB] Subscription activated until ${expiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt: expiresAt.toISOString(),
        message: `Your ${planType} subscription is now active!`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FINTECH-SUB] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});