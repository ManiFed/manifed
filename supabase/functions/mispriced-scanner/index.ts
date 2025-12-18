import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketData {
  id: string;
  question: string;
  probability: number;
  url: string;
  totalLiquidity: number;
  volume24Hours: number;
  closeTime?: number;
  creatorUsername: string;
}

interface MispricedMarket {
  id: string;
  question: string;
  probability: number;
  url: string;
  liquidity: number;
  volume: number;
  direction: 'underpriced' | 'overpriced';
  expectedProbability: number;
  profitPotential: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { config } = await req.json();
    const minLiquidity = config?.minLiquidity || 100;
    const minVolume = config?.minVolume || 50;
    const maxMarkets = config?.maxMarkets || 500;

    console.log("Fetching markets from Manifold API...");

    // Fetch recent active markets
    const marketsResponse = await fetch(
      `https://api.manifold.markets/v0/search-markets?limit=${maxMarkets}&filter=open&sort=liquidity`
    );

    if (!marketsResponse.ok) {
      throw new Error("Failed to fetch markets from Manifold");
    }

    const allMarkets: MarketData[] = await marketsResponse.json();
    console.log(`Fetched ${allMarkets.length} markets`);

    // Filter by liquidity and volume
    const filteredMarkets = allMarkets.filter(
      (m) => (m.totalLiquidity || 0) >= minLiquidity && (m.volume24Hours || 0) >= minVolume
    );
    console.log(`Filtered to ${filteredMarkets.length} markets with sufficient liquidity`);

    // Use AI to analyze markets for mispricing
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Batch markets for AI analysis (analyze up to 20 at a time)
    const marketsToAnalyze = filteredMarkets.slice(0, 50);
    const mispricedMarkets: MispricedMarket[] = [];

    // Process in batches of 10
    for (let i = 0; i < marketsToAnalyze.length; i += 10) {
      const batch = marketsToAnalyze.slice(i, i + 10);
      
      const marketsSummary = batch.map((m, idx) => 
        `${idx + 1}. "${m.question}" - Current: ${(m.probability * 100).toFixed(1)}%, Liquidity: M$${m.totalLiquidity?.toFixed(0) || 0}`
      ).join('\n');

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are a prediction market analyst. Analyze markets to find mispriced probabilities.
For each market, determine if the current probability seems too high (overpriced) or too low (underpriced) based on:
- Common knowledge and current events
- Base rates and historical patterns
- Market sentiment vs reality

Return ONLY valid JSON array with this format:
[{
  "index": <1-based index>,
  "direction": "underpriced" | "overpriced" | "fair",
  "expectedProbability": <your estimated true probability 0-1>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<brief 1-2 sentence explanation>"
}]

Only include markets where |current - expected| > 0.1 (10% difference).
If market seems fairly priced, use "fair" and exclude from results.
Be conservative - only flag clear mispricings.`
            },
            {
              role: "user",
              content: `Analyze these prediction markets for potential mispricings:\n\n${marketsSummary}`
            }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI analysis failed for batch", i);
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      
      try {
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const analyses = JSON.parse(jsonMatch[0]);
          
          for (const analysis of analyses) {
            if (analysis.direction === 'fair') continue;
            
            const marketIdx = analysis.index - 1;
            if (marketIdx < 0 || marketIdx >= batch.length) continue;
            
            const market = batch[marketIdx];
            const profitPotential = Math.abs(market.probability - analysis.expectedProbability);
            
            if (profitPotential < 0.1) continue; // Skip if difference is too small
            
            mispricedMarkets.push({
              id: market.id,
              question: market.question,
              probability: market.probability,
              url: `https://manifold.markets/${market.creatorUsername}/${market.id}`,
              liquidity: market.totalLiquidity || 0,
              volume: market.volume24Hours || 0,
              direction: analysis.direction,
              expectedProbability: analysis.expectedProbability,
              profitPotential,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
            });
          }
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
      }
    }

    // Sort by profit potential
    mispricedMarkets.sort((a, b) => b.profitPotential - a.profitPotential);

    console.log(`Found ${mispricedMarkets.length} potentially mispriced markets`);

    return new Response(
      JSON.stringify({
        success: true,
        markets: mispricedMarkets.slice(0, 30), // Return top 30
        totalScanned: filteredMarkets.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mispriced scanner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});