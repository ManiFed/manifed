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

interface FeedbackExample {
  market_1_question: string;
  market_2_question: string;
  is_valid_opportunity: boolean;
  feedback_reason: string | null;
}

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

    const { action, pairs, opportunityId, feedback } = await req.json();

    // Fetch recent feedback examples for context
    const { data: feedbackExamples } = await supabase
      .from("arbitrage_feedback")
      .select("market_1_question, market_2_question, is_valid_opportunity, feedback_reason")
      .order("created_at", { ascending: false })
      .limit(20);

    if (action === "analyze_pairs") {
      // AI-powered semantic analysis of market pairs
      const results = await analyzePairsWithAI(pairs, feedbackExamples || [], LOVABLE_API_KEY);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "explain_opportunity") {
      // Generate detailed explanation for an opportunity
      const explanation = await explainOpportunity(pairs[0], feedbackExamples || [], LOVABLE_API_KEY);
      return new Response(JSON.stringify({ explanation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit_feedback") {
      // Store user feedback for learning
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

async function analyzePairsWithAI(
  pairs: MarketPair[],
  feedbackExamples: FeedbackExample[],
  apiKey: string
): Promise<Array<{
  pairIndex: number;
  isValidArbitrage: boolean;
  confidence: number;
  reason: string;
  suggestedAction: string;
}>> {
  const results = [];

  // Process in batches of 5 for efficiency
  const batchSize = 5;
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (pair, batchIndex) => {
      const pairIndex = i + batchIndex;
      
      // Build examples from feedback
      const validExamples = feedbackExamples
        .filter(f => f.is_valid_opportunity)
        .slice(0, 3)
        .map(f => `✓ VALID: "${f.market_1_question}" vs "${f.market_2_question}"${f.feedback_reason ? ` - ${f.feedback_reason}` : ''}`);
      
      const invalidExamples = feedbackExamples
        .filter(f => !f.is_valid_opportunity)
        .slice(0, 3)
        .map(f => `✗ INVALID: "${f.market_1_question}" vs "${f.market_2_question}"${f.feedback_reason ? ` - ${f.feedback_reason}` : ''}`);

      const prompt = `You are an expert prediction market arbitrage analyst. Analyze whether these two markets represent a valid arbitrage opportunity.

MARKET 1: "${pair.market1.question}"
- Probability: ${(pair.market1.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market1.liquidity || 'unknown'}

MARKET 2: "${pair.market2.question}"
- Probability: ${(pair.market2.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market2.liquidity || 'unknown'}

Expected Profit: ${pair.expectedProfit.toFixed(2)}%
Match Reason: ${pair.matchReason || 'Unknown'}

CRITICAL RULES FOR VALID ARBITRAGE:
1. Markets must ask EXACTLY the same question (semantically equivalent) OR be logical opposites
2. "Will X be nominated" is NOT the same as "Will X win" - these are DIFFERENT events
3. "Will X happen by 2025" is NOT the same as "Will X happen in 2026" - different timeframes
4. Both markets must have objective, verifiable resolution criteria
5. The probability spread must be large enough to profit after fees (~2%)

${validExamples.length > 0 ? `\nEXAMPLES OF VALID ARBITRAGE (from user feedback):\n${validExamples.join('\n')}` : ''}
${invalidExamples.length > 0 ? `\nEXAMPLES OF INVALID ARBITRAGE (from user feedback):\n${invalidExamples.join('\n')}` : ''}

Analyze this pair and respond with ONLY valid JSON:
{
  "isValid": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation of why this is/isn't valid arbitrage",
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
              { role: "system", content: "You are an expert arbitrage analyst. Respond only with valid JSON." },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("AI API error:", response.status, errorText);
          throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            pairIndex,
            isValidArbitrage: parsed.isValid === true,
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
            reason: parsed.reason || "Analysis completed",
            suggestedAction: parsed.suggestedAction || "SKIP",
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

async function explainOpportunity(
  pair: MarketPair,
  feedbackExamples: FeedbackExample[],
  apiKey: string
): Promise<{
  summary: string;
  riskAssessment: string;
  executionStrategy: string;
  confidence: number;
}> {
  const prompt = `You are an expert prediction market arbitrage advisor. Provide a detailed analysis of this arbitrage opportunity.

MARKET 1: "${pair.market1.question}"
- Current Probability: ${(pair.market1.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market1.liquidity || 'unknown'}

MARKET 2: "${pair.market2.question}"
- Current Probability: ${(pair.market2.probability * 100).toFixed(1)}%
- Liquidity: M$${pair.market2.liquidity || 'unknown'}

Expected Profit Margin: ${pair.expectedProfit.toFixed(2)}%

Provide a comprehensive analysis in this exact JSON format:
{
  "summary": "2-3 sentence explanation of why this is/isn't a good arbitrage opportunity",
  "riskAssessment": "Key risks: resolution differences, liquidity concerns, timing issues",
  "executionStrategy": "Recommended order of execution, position sizing, and exit strategy",
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
        temperature: 0.2,
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
