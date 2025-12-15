import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketData {
  id: string;
  question: string;
  probability: number;
  volume: number;
  liquidity: number;
  createdTime: number;
  closeTime?: number;
  description?: string;
  creatorUsername: string;
  url: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { marketData, question, conversationHistory } = await req.json() as {
      marketData: MarketData;
      question: string;
      conversationHistory: Message[];
    };

    console.log('Market Agent request:', { marketId: marketData.id, question });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context about the market
    const marketContext = `
MARKET INFORMATION:
- Question: ${marketData.question}
- Current Probability: ${(marketData.probability * 100).toFixed(1)}% YES
- Volume: M$${marketData.volume.toLocaleString()}
- Liquidity: M$${marketData.liquidity.toFixed(0)}
- Creator: @${marketData.creatorUsername}
- Created: ${new Date(marketData.createdTime).toLocaleDateString()}
${marketData.closeTime ? `- Closes: ${new Date(marketData.closeTime).toLocaleDateString()}` : ''}
${marketData.description ? `- Description: ${marketData.description.slice(0, 1000)}` : ''}
`;

    const systemPrompt = `You are ManiFed's AI Market Agent, an expert analyst for Manifold Markets prediction markets.

${marketContext}

Your role is to help users understand and analyze this prediction market. You can:
- Explain what the market is asking and its implications
- Analyze the current probability and whether it seems reasonable
- Discuss factors that could affect the outcome
- Provide betting advice (with appropriate caveats about uncertainty)
- Explain market mechanics like liquidity and volume
- Compare to similar markets or historical events
- Identify potential risks or biases in the market

Be concise but informative. When giving betting advice, always acknowledge uncertainty and never guarantee outcomes. Use a confident but measured tone, like a seasoned trader giving advice to a colleague.

If asked about things unrelated to this market or prediction markets in general, politely redirect the conversation.`;

    // Build messages array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: question },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.';

    console.log('Market Agent response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Market Agent error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
