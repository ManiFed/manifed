import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMarketRequest {
  question: string;
  description: string;
  closeTime: string; // ISO timestamp
  outcomeType: 'BINARY' | 'MULTIPLE_CHOICE' | 'POLL';
  initialProb?: number; // Required for BINARY
  answers?: string[]; // Required for MULTIPLE_CHOICE/POLL
  visibility?: 'public' | 'unlisted';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user from the JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's Manifold API key
    const { data: settings, error: settingsError } = await supabaseClient
      .from("user_manifold_settings")
      .select("manifold_api_key")
      .eq("user_id", user.id)
      .single();

    if (settingsError || !settings?.manifold_api_key) {
      return new Response(
        JSON.stringify({ error: "Please connect your Manifold API key in Settings first" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateMarketRequest = await req.json();
    console.log("[create-market] Creating market:", body.question);

    // Validate required fields
    if (!body.question || !body.closeTime || !body.outcomeType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: question, closeTime, outcomeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate BINARY markets need initialProb
    if (body.outcomeType === 'BINARY' && !body.initialProb) {
      body.initialProb = 50; // Default to 50%
    }

    // Validate MULTIPLE_CHOICE/POLL markets need answers
    if ((body.outcomeType === 'MULTIPLE_CHOICE' || body.outcomeType === 'POLL') && (!body.answers || body.answers.length < 2)) {
      return new Response(
        JSON.stringify({ error: "Multiple choice and poll markets require at least 2 answers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the Manifold API payload
    const manifoldPayload: Record<string, unknown> = {
      outcomeType: body.outcomeType,
      question: body.question,
      description: body.description || '',
      closeTime: new Date(body.closeTime).getTime(), // Convert to epoch ms
      visibility: body.visibility || 'public',
    };

    if (body.outcomeType === 'BINARY') {
      manifoldPayload.initialProb = body.initialProb;
    } else if (body.answers) {
      manifoldPayload.answers = body.answers;
    }

    console.log("[create-market] Sending to Manifold API:", JSON.stringify(manifoldPayload));

    // Create the market on Manifold
    const response = await fetch("https://api.manifold.markets/v0/market", {
      method: "POST",
      headers: {
        "Authorization": `Key ${settings.manifold_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manifoldPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("[create-market] Manifold API error:", responseData);
      return new Response(
        JSON.stringify({ error: responseData.message || responseData.error || "Failed to create market on Manifold" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-market] Market created successfully:", responseData.id);

    return new Response(
      JSON.stringify({
        success: true,
        market: {
          id: responseData.id,
          url: responseData.url || `https://manifold.markets/${responseData.creatorUsername}/${responseData.slug}`,
          question: responseData.question,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[create-market] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
