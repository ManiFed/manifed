import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndexMarket {
  id: string;
  question: string;
  url: string;
  allocation: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, markets, totalAmount } = await req.json();

    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!markets || markets.length === 0) {
      throw new Error("No markets provided");
    }

    if (!totalAmount || totalAmount < 10) {
      throw new Error("Minimum investment is M$10");
    }

    console.log(`[EXECUTE-INDEX-FUND] Executing ${markets.length} trades for M$${totalAmount}`);

    // Verify API key is valid
    const meResponse = await fetch("https://api.manifold.markets/v0/me", {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!meResponse.ok) {
      throw new Error("Invalid API key");
    }

    const me = await meResponse.json();
    console.log(`[EXECUTE-INDEX-FUND] Verified user: @${me.username}`);

    // Check balance
    if (me.balance < totalAmount) {
      throw new Error(`Insufficient balance. You have M$${me.balance.toFixed(0)} but need M$${totalAmount}`);
    }

    let tradesExecuted = 0;
    const errors: string[] = [];

    // Execute trades
    for (const market of markets as IndexMarket[]) {
      const betAmount = Math.floor(totalAmount * (market.allocation / 100));
      
      if (betAmount < 1) {
        console.log(`[EXECUTE-INDEX-FUND] Skipping ${market.id}: amount too small`);
        continue;
      }

      try {
        const response = await fetch("https://api.manifold.markets/v0/bet", {
          method: "POST",
          headers: {
            Authorization: `Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId: market.id,
            amount: betAmount,
            outcome: "YES",
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`[EXECUTE-INDEX-FUND] Bet failed for ${market.id}:`, error);
          errors.push(`${market.question.slice(0, 30)}...: ${error}`);
          continue;
        }

        tradesExecuted++;
        console.log(`[EXECUTE-INDEX-FUND] Placed M$${betAmount} YES on ${market.id}`);
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.error(`[EXECUTE-INDEX-FUND] Error placing bet:`, error);
        errors.push(`${market.question.slice(0, 30)}...: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // API key is NOT stored - it was only used for this request

    return new Response(
      JSON.stringify({
        success: true,
        tradesExecuted,
        errors: errors.length > 0 ? errors : undefined,
        message: `Executed ${tradesExecuted} of ${markets.length} trades`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[EXECUTE-INDEX-FUND] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
