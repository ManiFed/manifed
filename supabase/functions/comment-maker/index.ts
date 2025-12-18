import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const ENCRYPTION_KEY = Deno.env.get("API_ENCRYPTION_KEY") || "";

// Decrypt API key
async function decryptApiKey(storedKey: string): Promise<string> {
  try {
    const decoded = atob(storedKey);
    if (decoded.length < 28) return storedKey;
  } catch {
    return storedKey;
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const combined = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, marketData, instructions, comment } = await req.json();

    if (action === 'generate') {
      // Generate 3 comment options using AI
      const systemPrompt = `You are an AI that generates witty, engaging comments for prediction markets. 
Generate comments that are insightful, sometimes humorous, and always relevant to the market question.
The user will provide instructions about the tone and style they want.
Always respond with exactly 3 different comment options in JSON format.
Include a bit of Trump-like confidence and patriotism when appropriate, but keep it subtle and funny.`;

      const userPrompt = `Market Question: "${marketData.question}"
Current Probability: ${(marketData.probability * 100).toFixed(1)}% YES

User Instructions: ${instructions}

Generate 3 different comment options. Each should have a different tone/approach.
Respond in this exact JSON format:
{
  "options": [
    {"id": "1", "content": "comment text here", "tone": "Confident"},
    {"id": "2", "content": "comment text here", "tone": "Analytical"},
    {"id": "3", "content": "comment text here", "tone": "Humorous"}
  ]
}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", errorText);
        throw new Error("Failed to generate comments");
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({ options: parsed.options }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === 'post') {
      // Post comment to Manifold
      const { data: userSettings } = await supabase
        .from("user_manifold_settings")
        .select("manifold_api_key")
        .eq("user_id", user.id)
        .single();

      if (!userSettings?.manifold_api_key) {
        return new Response(JSON.stringify({ error: "Manifold account not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiKey = await decryptApiKey(userSettings.manifold_api_key);

      // Convert plain text to TipTap JSON format required by Manifold API
      const tiptapContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: comment,
              },
            ],
          },
        ],
      };

      const postResponse = await fetch("https://api.manifold.markets/v0/comment", {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: marketData.id,
          content: tiptapContent,
        }),
      });

      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        console.error("Manifold API error:", errorText);
        throw new Error("Failed to post comment to Manifold");
      }

      const result = await postResponse.json();
      return new Response(JSON.stringify({ success: true, commentId: result.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Comment maker error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});