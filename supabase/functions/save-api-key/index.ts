import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENCRYPTION_KEY = Deno.env.get("API_ENCRYPTION_KEY") || "";

// Simple AES-GCM encryption using Web Crypto API
async function encryptApiKey(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Derive a key from the encryption secret
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encoder.encode(plaintext)
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and validate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create client with user token for auth validation
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key length (reasonable limits)
    if (apiKey.length < 10 || apiKey.length > 500) {
      return new Response(
        JSON.stringify({ error: "Invalid API key format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Saving encrypted API key for user ${user.id}`);

    // Verify the API key by fetching user info from Manifold
    const meResponse = await fetch("https://api.manifold.markets/v0/me", {
      headers: { Authorization: `Key ${apiKey}` }
    });

    if (!meResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid Manifold API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const manifoldUser = await meResponse.json();
    console.log(`Verified Manifold user: ${manifoldUser.username}`);

    // Encrypt the API key before storing
    const encryptedApiKey = await encryptApiKey(apiKey);

    // Upsert the settings with encrypted key
    const { error: upsertError } = await supabase
      .from("user_manifold_settings")
      .upsert({
        user_id: user.id,
        manifold_api_key: encryptedApiKey,
        manifold_user_id: manifoldUser.id,
        manifold_username: manifoldUser.username,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Error saving settings:", upsertError);
      throw upsertError;
    }

    console.log(`Successfully saved encrypted API key for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        username: manifoldUser.username,
        userId: manifoldUser.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in save-api-key function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
