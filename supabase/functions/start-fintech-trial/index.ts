import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log(`[FINTECH-TRIAL] Starting trial for user ${userData.user.id}`);

    // Check if user already had a trial or subscription
    const { data: existingSub } = await supabase
      .from('fintech_subscriptions')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (existingSub) {
      // Check if they already used trial
      if (existingSub.trial_started_at) {
        throw new Error("You've already used your free trial");
      }
      // Check if they have an active paid subscription
      if (existingSub.is_active && !existingSub.is_trial && existingSub.expires_at) {
        const expiresAt = new Date(existingSub.expires_at);
        if (expiresAt > new Date()) {
          throw new Error("You already have an active subscription");
        }
      }
    }

    // Start 7-day trial
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error: subError } = await supabase
      .from('fintech_subscriptions')
      .upsert({
        user_id: userData.user.id,
        plan_type: 'trial',
        mana_price: 0,
        started_at: now.toISOString(),
        expires_at: trialEndsAt.toISOString(),
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        is_active: true,
        is_trial: true,
        is_gifted: false,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error("[FINTECH-TRIAL] DB error:", subError);
      throw new Error("Failed to start trial");
    }

    console.log(`[FINTECH-TRIAL] Trial started until ${trialEndsAt.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt: trialEndsAt.toISOString(),
        message: "Your 7-day free trial is now active!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[FINTECH-TRIAL] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
