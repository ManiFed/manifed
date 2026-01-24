import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Position {
  marketId: string;
  marketQuestion: string;
  outcome: "YES" | "NO";
  shares: number;
  currentValue: number;
  probability: number;
  url: string;
}

interface HedgeOpportunity {
  id: string;
  sourcePosition: Position;
  hedgeMarket: {
    id: string;
    question: string;
    probability: number;
    url: string;
  };
  correlation: number;
  correlationType: "positive" | "negative" | "inverse";
  suggestedAction: "BUY_YES" | "BUY_NO";
  suggestedAmount: number;
  riskReduction: number;
  aiReasoning: string;
  confidence: "high" | "medium" | "low";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    // Get user's API key
    const { data: settings } = await supabase
      .from("user_manifold_settings")
      .select("manifold_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.manifold_api_key) {
      // Return empty state with helpful message instead of throwing error
      return new Response(
        JSON.stringify({
          positions: [],
          hedgeOpportunities: [],
          stats: {
            totalValue: 0,
            riskScore: 0,
            correlatedExposure: 0,
            diversificationScore: 0,
          },
          message: "Please configure your Manifold API key in Settings to scan your portfolio.",
          requiresApiKey: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt API key
    const API_ENCRYPTION_KEY = Deno.env.get("API_ENCRYPTION_KEY");
    let apiKey = settings.manifold_api_key;
    
    if (API_ENCRYPTION_KEY && apiKey.includes(":")) {
      try {
        const [ivHex, encryptedHex] = apiKey.split(":");
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
        const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
        
        const keyData = new TextEncoder().encode(API_ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
        const cryptoKey = await crypto.subtle.importKey("raw", keyData, "AES-GCM", false, ["decrypt"]);
        
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encrypted);
        apiKey = new TextDecoder().decode(decrypted);
      } catch {
        // Use as-is if decryption fails
      }
    }

    if (action === "execute_hedge") {
      // Execute a hedge trade
      const { marketId, outcome, amount } = body;
      
      const betRes = await fetch("https://api.manifold.markets/v0/bet", {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: marketId,
          amount,
          outcome,
        }),
      });

      if (!betRes.ok) {
        const error = await betRes.text();
        throw new Error(`Bet failed: ${error}`);
      }

      const betResult = await betRes.json();
      return new Response(
        JSON.stringify({ success: true, bet: betResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's positions
    console.log("Fetching user positions...");
    const positionsRes = await fetch(
      `https://api.manifold.markets/v0/bets?userId=${user.id}&limit=200`,
      {
        headers: { Authorization: `Key ${apiKey}` },
      }
    );

    // Get user info to find their Manifold ID
    const meRes = await fetch("https://api.manifold.markets/v0/me", {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const meData = await meRes.json();
    const manifoldUserId = meData.id;

    // Fetch actual positions
    const userBetsRes = await fetch(
      `https://api.manifold.markets/v0/bets?userId=${manifoldUserId}&limit=500`,
      {
        headers: { Authorization: `Key ${apiKey}` },
      }
    );
    const userBets = await userBetsRes.json();

    // Aggregate bets into positions
    const positionMap = new Map<string, { yes: number; no: number; marketId: string }>();
    
    for (const bet of userBets) {
      const key = bet.contractId;
      const current = positionMap.get(key) || { yes: 0, no: 0, marketId: bet.contractId };
      
      if (bet.outcome === "YES") {
        current.yes += bet.shares || 0;
      } else {
        current.no += bet.shares || 0;
      }
      
      positionMap.set(key, current);
    }

    // Convert to positions array
    const positions: Position[] = [];
    const marketIds = [...positionMap.keys()].slice(0, 20);

    for (const marketId of marketIds) {
      const pos = positionMap.get(marketId)!;
      if (pos.yes < 1 && pos.no < 1) continue;

      try {
        const marketRes = await fetch(
          `https://api.manifold.markets/v0/market/${marketId}`
        );
        const market = await marketRes.json();

        if (!market || market.isResolved) continue;

        const outcome = pos.yes > pos.no ? "YES" : "NO";
        const shares = outcome === "YES" ? pos.yes : pos.no;
        const probability = market.probability || 0.5;
        const currentValue = shares * (outcome === "YES" ? probability : 1 - probability);

        positions.push({
          marketId,
          marketQuestion: market.question,
          outcome,
          shares,
          currentValue,
          probability,
          url: market.url || `https://manifold.markets/${marketId}`,
        });
      } catch {
        // Skip failed market fetches
      }
    }

    // Calculate portfolio stats
    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const riskScore = Math.min(100, positions.length > 0 ? 
      Math.round(positions.reduce((max, p) => Math.max(max, p.currentValue / totalValue * 100), 0)) : 0);

    // Use AI to find correlations and hedges
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const hedgeOpportunities: HedgeOpportunity[] = [];

    if (positions.length > 0) {
      // Fetch potential hedge markets
      const searchRes = await fetch(
        "https://api.manifold.markets/v0/search-markets?limit=100&filter=open&sort=liquidity"
      );
      const potentialHedges = await searchRes.json();

      // Use AI to find correlations
      const positionSummary = positions.slice(0, 10).map((p) => 
        `${p.outcome} position: "${p.marketQuestion}" (${(p.probability * 100).toFixed(0)}%)`
      ).join("\n");

      const hedgeMarketSummary = potentialHedges.slice(0, 30).map((m: any, i: number) => 
        `${i + 1}. "${m.question}" - ${(m.probability * 100).toFixed(0)}%`
      ).join("\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a portfolio risk analyst. Find markets that could hedge existing positions.
Return ONLY valid JSON array:
[{
  "positionIndex": <0-based index of position>,
  "hedgeMarketIndex": <1-based index from hedge list>,
  "correlationType": "positive" | "negative" | "inverse",
  "correlation": <0.5-0.95>,
  "suggestedAction": "BUY_YES" | "BUY_NO",
  "riskReduction": <5-40>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<1 sentence explanation>"
}]
Only include genuine hedges with correlation > 0.6.`,
            },
            {
              role: "user",
              content: `Current Positions:\n${positionSummary}\n\nPotential Hedge Markets:\n${hedgeMarketSummary}`,
            },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content || "";

        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const hedges = JSON.parse(jsonMatch[0]);

            for (const hedge of hedges) {
              const posIdx = hedge.positionIndex;
              const hedgeIdx = hedge.hedgeMarketIndex - 1;

              if (posIdx < 0 || posIdx >= positions.length) continue;
              if (hedgeIdx < 0 || hedgeIdx >= potentialHedges.length) continue;

              const position = positions[posIdx];
              const hedgeMarket = potentialHedges[hedgeIdx];

              hedgeOpportunities.push({
                id: crypto.randomUUID(),
                sourcePosition: position,
                hedgeMarket: {
                  id: hedgeMarket.id,
                  question: hedgeMarket.question,
                  probability: hedgeMarket.probability,
                  url: hedgeMarket.url || `https://manifold.markets/${hedgeMarket.id}`,
                },
                correlation: hedge.correlation,
                correlationType: hedge.correlationType,
                suggestedAction: hedge.suggestedAction,
                suggestedAmount: Math.round(position.currentValue * 0.25),
                riskReduction: hedge.riskReduction,
                aiReasoning: hedge.reasoning,
                confidence: hedge.confidence,
              });
            }
          }
        } catch (parseError) {
          console.error("Failed to parse AI hedge response:", parseError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        positions,
        hedgeOpportunities,
        stats: {
          totalValue: Math.round(totalValue),
          riskScore,
          correlatedExposure: Math.round(riskScore * 0.7),
          diversificationScore: Math.round(100 - riskScore),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Portfolio hedger error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
