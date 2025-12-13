import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketPair {
  market1: {
    id: string;
    question: string;
    probability: number;
    liquidity?: number;
  };
  market2: {
    id: string;
    question: string;
    probability: number;
    liquidity?: number;
  };
  expectedProfit: number;
  matchReason?: string;
}

interface Market {
  id: string;
  question: string;
  probability?: number;
  liquidity?: number;
  volume?: number;
  outcomeType?: string;
  groupSlugs?: string[];
}

interface CanonicalEvent {
  subject: string;
  event: string;
  year: string | null;
  jurisdiction: string | null;
  condition: string | null;
}

interface FeedbackExample {
  market_1_question: string;
  market_2_question: string;
  is_valid_opportunity: boolean;
  feedback_reason: string | null;
}

interface ClusterResult {
  clusterId: string;
  markets: Market[];
  canonicalEvent: CanonicalEvent;
  confidence: number;
}

// ============= TOPIC BUCKETING =============

function getTopicBucket(question: string, groupSlugs?: string[]): string[] {
  const buckets: string[] = [];
  const lowerQ = question.toLowerCase();
  
  // Check slugs first
  if (groupSlugs) {
    if (groupSlugs.some(s => s.includes('election') || s.includes('politics') || s.includes('congress'))) {
      buckets.push('politics');
    }
    if (groupSlugs.some(s => s.includes('sport') || s.includes('nfl') || s.includes('nba') || s.includes('soccer'))) {
      buckets.push('sports');
    }
    if (groupSlugs.some(s => s.includes('crypto') || s.includes('bitcoin') || s.includes('ethereum'))) {
      buckets.push('crypto');
    }
    if (groupSlugs.some(s => s.includes('tech') || s.includes('ai') || s.includes('company'))) {
      buckets.push('tech');
    }
  }
  
  // Keyword-based bucketing
  if (/president|elect|nominate|vote|congress|senate|governor|mayor|republican|democrat|gop/i.test(lowerQ)) {
    buckets.push('politics');
  }
  if (/super bowl|world cup|olympics|championship|win.*game|playoff|nfl|nba|mlb|nhl|fifa/i.test(lowerQ)) {
    buckets.push('sports');
  }
  if (/bitcoin|btc|ethereum|eth|crypto|token|blockchain|defi|nft/i.test(lowerQ)) {
    buckets.push('crypto');
  }
  if (/\$\d|stock|ipo|acquisition|revenue|market cap|valuation|billion|million.*company/i.test(lowerQ)) {
    buckets.push('finance');
  }
  if (/openai|gpt|claude|llm|ai model|artificial intelligence|agi|google.*ai|microsoft.*ai/i.test(lowerQ)) {
    buckets.push('ai');
  }
  if (/oscar|grammy|emmy|golden globe|award|box office|movie|film|album|artist/i.test(lowerQ)) {
    buckets.push('entertainment');
  }
  if (/war|invasion|attack|military|nato|ukraine|russia|china|taiwan|iran|israel/i.test(lowerQ)) {
    buckets.push('geopolitics');
  }
  
  // Extract year as a bucket dimension
  const yearMatch = lowerQ.match(/\b(202\d)\b/);
  if (yearMatch) {
    buckets.push(`year_${yearMatch[1]}`);
  }
  
  if (buckets.length === 0) {
    buckets.push('general');
  }
  
  return [...new Set(buckets)];
}

// ============= SIMILARITY FOR RAG =============

function calculateQuestionSimilarity(q1: string, q2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const tokens1 = new Set(normalize(q1));
  const tokens2 = new Set(normalize(q2));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  
  return intersection / union;
}

function findMostSimilarFeedback(pair: MarketPair, feedback: FeedbackExample[], topK: number = 3): FeedbackExample[] {
  const combined = `${pair.market1.question} ${pair.market2.question}`;
  
  const scored = feedback.map(f => ({
    example: f,
    score: (calculateQuestionSimilarity(pair.market1.question, f.market_1_question) +
            calculateQuestionSimilarity(pair.market2.question, f.market_2_question) +
            calculateQuestionSimilarity(pair.market1.question, f.market_2_question) +
            calculateQuestionSimilarity(pair.market2.question, f.market_1_question)) / 2
  }));
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(s => s.score > 0.1)
    .map(s => s.example);
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, pairs, markets, feedback } = await req.json();

    // Fetch recent feedback examples for RAG
    const { data: allFeedback } = await supabase
      .from("arbitrage_feedback")
      .select("market_1_question, market_2_question, is_valid_opportunity, feedback_reason")
      .order("created_at", { ascending: false })
      .limit(100);

    const feedbackExamples = allFeedback || [];

    // ============= SEMANTIC CLUSTERING (AI-first matching) =============
    if (action === "cluster_markets") {
      const clusteredMarkets = await clusterMarketsWithAI(markets, feedbackExamples, LOVABLE_API_KEY);
      return new Response(JSON.stringify({ clusters: clusteredMarkets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============= ANALYZE PAIRS =============
    if (action === "analyze_pairs") {
      const results = await analyzePairsWithAI(pairs, feedbackExamples, LOVABLE_API_KEY);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============= EXPLAIN OPPORTUNITY =============
    if (action === "explain_opportunity") {
      const relevantFeedback = findMostSimilarFeedback(pairs[0], feedbackExamples);
      const explanation = await explainOpportunity(pairs[0], relevantFeedback, LOVABLE_API_KEY);
      return new Response(JSON.stringify({ explanation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============= SUBMIT FEEDBACK =============
    if (action === "submit_feedback") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        throw new Error("Authorization required");
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        throw new Error("Invalid user");
      }

      const { error } = await supabase.from("arbitrage_feedback").insert({
        user_id: user.id,
        opportunity_id: feedback.opportunityId,
        market_1_id: feedback.market1Id,
        market_1_question: feedback.market1Question,
        market_2_id: feedback.market2Id,
        market_2_question: feedback.market2Question,
        opportunity_type: feedback.opportunityType,
        expected_profit: feedback.expectedProfit,
        is_valid_opportunity: feedback.isValid,
        feedback_reason: feedback.reason,
        ai_confidence_score: feedback.aiConfidence,
        ai_analysis: feedback.aiAnalysis,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("AI Arbitrage error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============= AI CLUSTERING =============

async function clusterMarketsWithAI(
  markets: Market[],
  feedbackExamples: FeedbackExample[],
  apiKey: string
): Promise<ClusterResult[]> {
  // Step 1: Topic bucketing for scalable pre-filtering
  const bucketedMarkets: Record<string, Market[]> = {};
  
  for (const market of markets) {
    const buckets = getTopicBucket(market.question, market.groupSlugs);
    for (const bucket of buckets) {
      if (!bucketedMarkets[bucket]) bucketedMarkets[bucket] = [];
      bucketedMarkets[bucket].push(market);
    }
  }

  console.log(`Bucketed ${markets.length} markets into ${Object.keys(bucketedMarkets).length} buckets`);

  const allClusters: ClusterResult[] = [];
  
  // Step 2: Within each bucket, ask AI to generate canonical event keys
  for (const [bucket, bucketMarkets] of Object.entries(bucketedMarkets)) {
    if (bucketMarkets.length < 2 || bucketMarkets.length > 50) continue;
    
    // Sample if too large
    const sampled = bucketMarkets.length > 20 
      ? shuffleArray(bucketMarkets).slice(0, 20) 
      : bucketMarkets;
    
    const clusters = await getCanonicalClusters(sampled, bucket, apiKey);
    allClusters.push(...clusters);
  }

  return allClusters;
}

async function getCanonicalClusters(
  markets: Market[],
  bucket: string,
  apiKey: string
): Promise<ClusterResult[]> {
  const marketList = markets.map((m, i) => 
    `[${i}] "${m.question}" (${(m.probability || 0.5) * 100}%)`
  ).join('\n');

  const prompt = `You are an expert at identifying semantically equivalent prediction market questions.

Given these ${markets.length} markets in the "${bucket}" category:

${marketList}

For each market, extract a CANONICAL EVENT KEY with these fields:
- subject: The main entity (person, team, company, event name)
- event: The specific outcome being predicted (win, nominated, reach, pass, etc.)
- year: The year or timeframe (null if not specified)
- jurisdiction: Geographic scope (null if not specified)  
- condition: Any special conditions (primary, general, first round, etc. - null if none)

CRITICAL RULES:
1. "Will X be nominated" and "Will X win" are DIFFERENT events (nominate ≠ win)
2. "Will X happen by 2025" and "Will X happen in 2026" are DIFFERENT years
3. Only markets with IDENTICAL canonical keys should cluster together
4. Be conservative - when in doubt, keep markets separate

Return JSON array:
[
  {
    "marketIndex": 0,
    "canonical": {
      "subject": "string",
      "event": "string", 
      "year": "string or null",
      "jurisdiction": "string or null",
      "condition": "string or null"
    },
    "clusterKey": "subject|event|year|condition"
  },
  ...
]`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract canonical event representations from prediction market questions. Respond only with valid JSON array." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI clustering error:", response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Group by clusterKey
    const clusterMap: Record<string, { markets: Market[]; canonical: CanonicalEvent }> = {};
    
    for (const item of parsed) {
      const market = markets[item.marketIndex];
      if (!market) continue;
      
      const key = item.clusterKey || `${item.canonical.subject}|${item.canonical.event}|${item.canonical.year}`;
      
      if (!clusterMap[key]) {
        clusterMap[key] = { 
          markets: [], 
          canonical: item.canonical 
        };
      }
      clusterMap[key].markets.push(market);
    }

    // Only return clusters with 2+ markets (potential arbitrage)
    return Object.entries(clusterMap)
      .filter(([_, cluster]) => cluster.markets.length >= 2)
      .map(([clusterId, cluster]) => ({
        clusterId,
        markets: cluster.markets,
        canonicalEvent: cluster.canonical,
        confidence: 0.8,
      }));
      
  } catch (error) {
    console.error("Clustering error:", error);
    return [];
  }
}

// ============= PAIR ANALYSIS WITH RAG =============

async function analyzePairsWithAI(
  pairs: MarketPair[],
  allFeedback: FeedbackExample[],
  apiKey: string
): Promise<Array<{
  pairIndex: number;
  isValidArbitrage: boolean;
  confidence: number;
  reason: string;
  suggestedAction: string;
  canonicalEvent?: CanonicalEvent;
}>> {
  const results = [];

  // Process in batches of 5 for efficiency
  const batchSize = 5;
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (pair, batchIndex) => {
      const pairIndex = i + batchIndex;
      
      // RAG: Find most similar labeled examples
      const relevantExamples = findMostSimilarFeedback(pair, allFeedback, 5);
      
      const validExamples = relevantExamples
        .filter(f => f.is_valid_opportunity)
        .slice(0, 2)
        .map(f => `✓ "${f.market_1_question}" = "${f.market_2_question}"${f.feedback_reason ? ` (${f.feedback_reason})` : ''}`);
      
      const invalidExamples = relevantExamples
        .filter(f => !f.is_valid_opportunity)
        .slice(0, 3)
        .map(f => `✗ "${f.market_1_question}" ≠ "${f.market_2_question}"${f.feedback_reason ? ` - ${f.feedback_reason}` : ''}`);

      const prompt = `Analyze if these two prediction markets represent a valid arbitrage opportunity.

MARKET 1: "${pair.market1.question}"
- Probability: ${(pair.market1.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market1.liquidity || 'unknown'}

MARKET 2: "${pair.market2.question}"
- Probability: ${(pair.market2.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market2.liquidity || 'unknown'}

Spread: ${pair.expectedProfit.toFixed(2)}%

VALID ARBITRAGE REQUIRES:
1. Questions must be SEMANTICALLY IDENTICAL (same subject, same event type, same timeframe, same conditions)
2. OR they must be LOGICAL OPPOSITES (X wins vs X loses)
3. "nominated" ≠ "elected" ≠ "wins" - these are different events!
4. Different years/timeframes = NOT equivalent

${validExamples.length > 0 ? `\nSIMILAR VALID PAIRS (user-verified):\n${validExamples.join('\n')}` : ''}
${invalidExamples.length > 0 ? `\nSIMILAR INVALID PAIRS (user-verified):\n${invalidExamples.join('\n')}` : ''}

First extract the canonical event for each market, then determine if they match.

Respond with JSON:
{
  "market1Canonical": { "subject": "", "event": "", "year": "", "condition": "" },
  "market2Canonical": { "subject": "", "event": "", "year": "", "condition": "" },
  "canonicalsMatch": true/false,
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation",
  "suggestedAction": "BUY_YES_M1_NO_M2" or "BUY_NO_M1_YES_M2" or "SKIP"
}`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an expert arbitrage analyst. Extract canonical events and determine equivalence. Respond only with valid JSON." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("AI API error:", response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            pairIndex,
            isValidArbitrage: parsed.isValid === true && parsed.canonicalsMatch === true,
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            reason: parsed.reason || "Analysis completed",
            suggestedAction: parsed.suggestedAction || "SKIP",
            canonicalEvent: parsed.market1Canonical,
          };
        }
        
        return {
          pairIndex,
          isValidArbitrage: false,
          confidence: 0.3,
          reason: "Could not parse AI response",
          suggestedAction: "SKIP",
        };
      } catch (error: unknown) {
        console.error("Error analyzing pair:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          pairIndex,
          isValidArbitrage: false,
          confidence: 0,
          reason: `Analysis error: ${message}`,
          suggestedAction: "SKIP",
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

// ============= EXPLAIN OPPORTUNITY =============

async function explainOpportunity(
  pair: MarketPair,
  relevantFeedback: FeedbackExample[],
  apiKey: string
): Promise<{
  summary: string;
  riskAssessment: string;
  executionStrategy: string;
  confidence: number;
}> {
  const feedbackContext = relevantFeedback.length > 0
    ? `\nSimilar past opportunities:\n${relevantFeedback.map(f => 
        `- ${f.is_valid_opportunity ? '✓ Valid' : '✗ Invalid'}: "${f.market_1_question}" vs "${f.market_2_question}"${f.feedback_reason ? ` (${f.feedback_reason})` : ''}`
      ).join('\n')}`
    : '';

  const prompt = `You are an expert prediction market arbitrage advisor.

MARKET 1: "${pair.market1.question}"
- Probability: ${(pair.market1.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market1.liquidity || 'unknown'}

MARKET 2: "${pair.market2.question}"
- Probability: ${(pair.market2.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market2.liquidity || 'unknown'}

Spread: ${pair.expectedProfit.toFixed(2)}%
${feedbackContext}

Provide comprehensive analysis:
{
  "summary": "2-3 sentence explanation of the opportunity and whether it's valid",
  "riskAssessment": "Key risks: resolution differences, liquidity, timing, semantic mismatch risks",
  "executionStrategy": "If valid: order of execution, position sizing, exit strategy. If invalid: why to skip",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert arbitrage advisor. Provide detailed, actionable analysis. Respond only with valid JSON." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "Analysis unavailable",
        riskAssessment: parsed.riskAssessment || "Risk assessment unavailable",
        executionStrategy: parsed.executionStrategy || "Execute with caution",
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      };
    }
    
    return {
      summary: "Could not generate analysis",
      riskAssessment: "Unknown",
      executionStrategy: "Proceed with caution",
      confidence: 0.3,
    };
  } catch (error: unknown) {
    console.error("Error explaining opportunity:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      summary: `Analysis error: ${message}`,
      riskAssessment: "Unable to assess",
      executionStrategy: "Do not proceed",
      confidence: 0,
    };
  }
}

// ============= UTILS =============

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
