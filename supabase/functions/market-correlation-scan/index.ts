import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Market {
  id: string;
  question: string;
  probability: number;
  url: string;
  volume24h: number;
  liquidity: number;
}

interface CorrelationPair {
  id: string;
  market1: Market;
  market2: Market;
  correlationType: "positive" | "negative" | "inverse";
  correlationStrength: number;
  probabilityDivergence: number;
  aiAnalysis: string;
  arbitrageOpportunity: boolean;
  suggestedAction?: {
    market1: "BUY_YES" | "BUY_NO" | null;
    market2: "BUY_YES" | "BUY_NO" | null;
    expectedProfit: number;
  };
  lastUpdated: string;
  isWatched: boolean;
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

    const { minCorrelation = 70, searchQuery = "" } = await req.json();
    const minCorrelationDecimal = minCorrelation / 100;

    console.log("Fetching markets for correlation analysis...");

    // Fetch active markets with good liquidity
    const marketsRes = await fetch(
      "https://api.manifold.markets/v0/search-markets?limit=200&filter=open&sort=liquidity"
    );
    const allMarkets = await marketsRes.json();

    // Filter by search query if provided
    let filteredMarkets = allMarkets;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredMarkets = allMarkets.filter((m: any) =>
        m.question.toLowerCase().includes(query)
      );
    }

    // Only analyze markets with sufficient liquidity
    const validMarkets = filteredMarkets
      .filter((m: any) => (m.totalLiquidity || 0) >= 100)
      .slice(0, 100);

    console.log(`Analyzing ${validMarkets.length} markets for correlations...`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const correlationPairs: CorrelationPair[] = [];

    // Process markets in batches for AI analysis
    const batchSize = 30;
    for (let i = 0; i < Math.min(validMarkets.length, 60); i += batchSize) {
      const batch = validMarkets.slice(i, i + batchSize);
      
      const marketSummary = batch.map((m: any, idx: number) => 
        `${idx + 1}. "${m.question}" - ${(m.probability * 100).toFixed(0)}% (Liq: M$${(m.totalLiquidity || 0).toFixed(0)})`
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
              content: `You find correlated prediction markets that should logically resolve together.
Return ONLY valid JSON array of correlation pairs:
[{
  "market1Index": <1-based index>,
  "market2Index": <1-based index>,
  "correlationType": "positive" | "negative" | "inverse",
  "correlationStrength": <0.6-0.95>,
  "isArbitrage": <true if probabilities disagree significantly>,
  "analysis": "<1 sentence explaining the correlation>",
  "suggestedAction": {
    "market1": "BUY_YES" | "BUY_NO" | null,
    "market2": "BUY_YES" | "BUY_NO" | null,
    "expectedProfit": <estimated profit if arbitrage>
  } or null
}]

Focus on:
- Markets about the same event/person/outcome
- Logically connected predictions (if A then B)
- Inverse relationships (if A wins, B loses)

Only include pairs with correlation > 0.6.`,
            },
            {
              role: "user",
              content: `Find correlated market pairs:\n\n${marketSummary}`,
            },
          ],
        }),
      });

      if (!aiRes.ok) {
        console.error("AI analysis failed for batch", i);
        continue;
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const pairs = JSON.parse(jsonMatch[0]);

          for (const pair of pairs) {
            const m1Idx = pair.market1Index - 1;
            const m2Idx = pair.market2Index - 1;

            if (m1Idx < 0 || m1Idx >= batch.length) continue;
            if (m2Idx < 0 || m2Idx >= batch.length) continue;
            if (pair.correlationStrength < minCorrelationDecimal) continue;

            const m1 = batch[m1Idx];
            const m2 = batch[m2Idx];

            const probDivergence = Math.abs(m1.probability - m2.probability) * 100;
            
            // For inverse correlations, check if probs sum to ~100%
            let adjustedDivergence = probDivergence;
            if (pair.correlationType === "inverse") {
              adjustedDivergence = Math.abs((m1.probability + m2.probability) - 1) * 100;
            }

            correlationPairs.push({
              id: crypto.randomUUID(),
              market1: {
                id: m1.id,
                question: m1.question,
                probability: m1.probability,
                url: m1.url || `https://manifold.markets/${m1.id}`,
                volume24h: m1.volume24Hours || 0,
                liquidity: m1.totalLiquidity || 0,
              },
              market2: {
                id: m2.id,
                question: m2.question,
                probability: m2.probability,
                url: m2.url || `https://manifold.markets/${m2.id}`,
                volume24h: m2.volume24Hours || 0,
                liquidity: m2.totalLiquidity || 0,
              },
              correlationType: pair.correlationType,
              correlationStrength: pair.correlationStrength,
              probabilityDivergence: adjustedDivergence,
              aiAnalysis: pair.analysis,
              arbitrageOpportunity: pair.isArbitrage || adjustedDivergence > 15,
              suggestedAction: pair.suggestedAction || undefined,
              lastUpdated: new Date().toISOString(),
              isWatched: false,
            });
          }
        }
      } catch (parseError) {
        console.error("Failed to parse AI correlation response:", parseError);
      }
    }

    // Sort by arbitrage opportunity first, then by divergence
    correlationPairs.sort((a, b) => {
      if (a.arbitrageOpportunity !== b.arbitrageOpportunity) {
        return a.arbitrageOpportunity ? -1 : 1;
      }
      return b.probabilityDivergence - a.probabilityDivergence;
    });

    const avgDivergence = correlationPairs.length > 0
      ? correlationPairs.reduce((sum, p) => sum + p.probabilityDivergence, 0) / correlationPairs.length
      : 0;

    console.log(`Found ${correlationPairs.length} correlated pairs`);

    return new Response(
      JSON.stringify({
        pairs: correlationPairs.slice(0, 50),
        marketsScanned: validMarkets.length,
        avgDivergence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Market correlation scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
