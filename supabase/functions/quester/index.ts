import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUESTER_MARKET_ID = "quester"; // The quester market slug
const QUESTER_MARKET_URL = "https://manifold.markets/ManiFed/quester";
const MONTHLY_FEE = 10; // M$ per month for non-subscribers

async function decryptApiKey(storedKey: string): Promise<string> {
  if (!storedKey.includes(':')) {
    return storedKey; // Legacy unencrypted key
  }

  const encryptionKey = Deno.env.get("API_ENCRYPTION_KEY");
  if (!encryptionKey) {
    throw new Error("Encryption key not configured");
  }

  const [ivHex, encryptedHex] = storedKey.split(':');
  const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16)));
  const encrypted = new Uint8Array(encryptedHex.match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16)));
  
  const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action } = await req.json();
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check if user has a subscription
    const { data: subscription } = await supabaseService
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasSubscription = subscription && subscription.status !== 'free';

    if (action === 'subscribe') {
      // Check if already subscribed
      const { data: existing } = await supabaseService
        .from('quester_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing?.is_active) {
        return new Response(
          JSON.stringify({ error: "Already subscribed to Quester" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If no ManiFed subscription, charge 10 mana
      if (!hasSubscription) {
        // Get user's API key
        const { data: settings } = await supabaseService
          .from('user_manifold_settings')
          .select('manifold_api_key')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!settings?.manifold_api_key) {
          return new Response(
            JSON.stringify({ error: "Please connect your Manifold account first" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send the 10 mana fee via managram
        const apiKey = await decryptApiKey(settings.manifold_api_key);
        
        const manaResponse = await fetch("https://api.manifold.markets/v0/managram", {
          method: "POST",
          headers: {
            "Authorization": `Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            toIds: ["rFT1GdVb6dZZQXXoHcBsANSJBle2"], // ManiFed user ID
            amount: MONTHLY_FEE,
            message: "Quester subscription fee - 1 month",
          }),
        });

        if (!manaResponse.ok) {
          const errorText = await manaResponse.text();
          throw new Error(`Failed to send subscription fee: ${errorText}`);
        }
      }

      // Create or update subscription
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (existing) {
        await supabaseService
          .from('quester_subscriptions')
          .update({
            is_active: true,
            started_at: new Date().toISOString(),
            next_trade_at: tomorrow.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabaseService
          .from('quester_subscriptions')
          .insert({
            user_id: user.id,
            is_active: true,
            next_trade_at: tomorrow.toISOString(),
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: hasSubscription 
            ? "Quester activated! Included in your ManiFed subscription."
            : `Quester activated! Charged M$${MONTHLY_FEE} for 1 month.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'unsubscribe') {
      await supabaseService
        .from('quester_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: true, message: "Quester deactivated." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'status') {
      const { data: questerSub } = await supabaseService
        .from('quester_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          isActive: questerSub?.is_active || false,
          lastTradeAt: questerSub?.last_trade_at,
          nextTradeAt: questerSub?.next_trade_at,
          isFree: hasSubscription,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'execute_trade') {
      // This would be called by a cron job
      // For now, let's make it available for manual triggering too
      
      const { data: settings } = await supabaseService
        .from('user_manifold_settings')
        .select('manifold_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.manifold_api_key) {
        throw new Error("Manifold API key not found");
      }

      const apiKey = await decryptApiKey(settings.manifold_api_key);

      // First, buy 1 share YES
      const buyResponse = await fetch("https://api.manifold.markets/v0/bet", {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: QUESTER_MARKET_ID,
          amount: 1,
          outcome: "YES",
        }),
      });

      if (!buyResponse.ok) {
        const errorText = await buyResponse.text();
        throw new Error(`Failed to buy share: ${errorText}`);
      }

      // Wait a moment, then sell
      await new Promise(resolve => setTimeout(resolve, 1000));

      const sellResponse = await fetch("https://api.manifold.markets/v0/market/" + QUESTER_MARKET_ID + "/sell", {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          outcome: "YES",
          shares: 1,
        }),
      });

      // Update subscription
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await supabaseService
        .from('quester_subscriptions')
        .update({
          last_trade_at: new Date().toISOString(),
          next_trade_at: tomorrow.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Trade executed! Bought and sold 1 share on Quester market.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Quester error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});