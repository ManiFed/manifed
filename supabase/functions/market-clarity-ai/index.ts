import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketDraft {
  title: string;
  description: string;
  resolutionCriteria: string;
  marketType: string;
  closeDate?: string;
}

interface ClarityIssue {
  id: string;
  type: 'ambiguity' | 'timeline' | 'criteria' | 'scope' | 'measurability';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
  field: 'title' | 'description' | 'resolutionCriteria';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[market-clarity-ai] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { draft, action } = await req.json() as { draft: MarketDraft; action: 'analyze' | 'suggest' | 'rewrite' };

    console.log(`[market-clarity-ai] Action: ${action}, Title: ${draft.title?.slice(0, 50)}...`);

    const systemPrompt = `You are an expert prediction market analyst. Your job is to help creators write clear, unambiguous, and well-structured prediction markets.

Key principles for good prediction markets:
1. **Clarity**: The question must be unambiguous. Anyone reading it should understand exactly what is being asked.
2. **Measurability**: There must be a clear, objective way to determine the outcome.
3. **Timeline**: Specific dates/times with timezone, not vague terms like "soon" or "by end of year".
4. **Resolution criteria**: Explicit rules for how YES/NO will be determined, including edge cases.
5. **Sources**: Specify what sources will be used to verify the outcome.

Common issues to flag:
- Subjective terms (significant, major, successful)
- Vague timing (soon, eventually, by end of)
- Open-ended lists (etc., and more)
- Missing edge case handling
- Unclear resolution authority`;

    let userPrompt = '';
    let toolConfig: Record<string, unknown> | undefined;

    if (action === 'analyze') {
      userPrompt = `Analyze this prediction market draft for clarity issues:

**Title**: ${draft.title || '(empty)'}
**Description**: ${draft.description || '(empty)'}
**Resolution Criteria**: ${draft.resolutionCriteria || '(empty)'}
**Market Type**: ${draft.marketType}
**Close Date**: ${draft.closeDate || '(not set)'}

Identify ALL issues that could lead to disputes or unclear resolution. For each issue, specify:
1. Which field it's in (title, description, or resolutionCriteria)
2. The severity (low, medium, high)
3. The type of issue (ambiguity, timeline, criteria, scope, measurability)
4. A clear explanation of the problem
5. A specific suggestion for fixing it`;

      toolConfig = {
        tools: [{
          type: "function",
          function: {
            name: "report_issues",
            description: "Report clarity issues found in the market draft",
            parameters: {
              type: "object",
              properties: {
                score: {
                  type: "number",
                  description: "Overall clarity score from 0-100"
                },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["ambiguity", "timeline", "criteria", "scope", "measurability"] },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      field: { type: "string", enum: ["title", "description", "resolutionCriteria"] },
                      message: { type: "string" },
                      suggestion: { type: "string" }
                    },
                    required: ["type", "severity", "field", "message", "suggestion"]
                  }
                },
                summary: {
                  type: "string",
                  description: "Brief summary of the main concerns"
                }
              },
              required: ["score", "issues", "summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "report_issues" } }
      };
    } else if (action === 'suggest') {
      userPrompt = `Based on this market draft, suggest improvements:

**Title**: ${draft.title || '(empty)'}
**Description**: ${draft.description || '(empty)'}
**Resolution Criteria**: ${draft.resolutionCriteria || '(empty)'}
**Market Type**: ${draft.marketType}

Provide 3 specific, actionable suggestions to improve clarity and reduce dispute risk. Focus on the most impactful changes.`;

      toolConfig = {
        tools: [{
          type: "function",
          function: {
            name: "provide_suggestions",
            description: "Provide improvement suggestions for the market",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      field: { type: "string", enum: ["title", "description", "resolutionCriteria", "general"] },
                      suggestion: { type: "string" },
                      example: { type: "string", description: "Optional example of improved text" }
                    },
                    required: ["priority", "field", "suggestion"]
                  }
                }
              },
              required: ["suggestions"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "provide_suggestions" } }
      };
    } else if (action === 'rewrite') {
      userPrompt = `Rewrite this market to be clearer and more professional:

**Title**: ${draft.title || '(empty)'}
**Description**: ${draft.description || '(empty)'}
**Resolution Criteria**: ${draft.resolutionCriteria || '(empty)'}
**Market Type**: ${draft.marketType}
**Close Date**: ${draft.closeDate || '(not set)'}

Provide improved versions that:
1. Remove all ambiguity
2. Include specific measurable criteria
3. Handle edge cases
4. Specify resolution sources`;

      toolConfig = {
        tools: [{
          type: "function",
          function: {
            name: "provide_rewrite",
            description: "Provide improved versions of market fields",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Improved title" },
                description: { type: "string", description: "Improved description" },
                resolutionCriteria: { type: "string", description: "Improved resolution criteria" },
                changes: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of key changes made"
                }
              },
              required: ["title", "description", "resolutionCriteria", "changes"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "provide_rewrite" } }
      };
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        ...toolConfig
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[market-clarity-ai] AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again in a moment" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    
    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("[market-clarity-ai] No tool call in response");
      return new Response(
        JSON.stringify({ error: "AI returned unexpected format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`[market-clarity-ai] ${action} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, action, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[market-clarity-ai] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
