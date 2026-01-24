import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserStats {
  id: string;
  username: string;
  avatarUrl?: string;
  profitRank?: number;
  balance?: number;
  totalDeposits?: number;
  createdTime?: number;
}

interface BetData {
  id: string;
  userId: string;
  contractId: string;
  amount: number;
  outcome: string;
  createdTime: number;
  probBefore: number;
  probAfter: number;
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

    const { minAccuracy = 60, searchQuery = "" } = await req.json();

    console.log("Fetching top traders from Manifold...");

    // Fetch leaderboard users
    const leaderboardRes = await fetch(
      "https://api.manifold.markets/v0/users?limit=100"
    );
    const allUsers: UserStats[] = await leaderboardRes.json();

    // Filter by search query if provided
    let filteredUsers = allUsers;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredUsers = allUsers.filter((u) =>
        u.username.toLowerCase().includes(query)
      );
    }

    // Get top users by profit rank
    const topUsers = filteredUsers
      .filter((u) => u.profitRank && u.profitRank <= 1000)
      .slice(0, 30);

    // Analyze each trader with AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const traders: any[] = [];
    const recentMoves: any[] = [];

    // Process traders in batches
    for (const userData of topUsers.slice(0, 20)) {
      try {
        // Fetch user's recent bets
        const betsRes = await fetch(
          `https://api.manifold.markets/v0/bets?userId=${userData.id}&limit=50`
        );
        const bets: BetData[] = await betsRes.json();

        if (!bets || bets.length === 0) continue;

        // Calculate basic stats
        const now = Date.now();
        const recentBets = bets.filter(
          (b) => now - b.createdTime < 7 * 24 * 60 * 60 * 1000
        );
        const totalAmount = bets.reduce((sum, b) => sum + Math.abs(b.amount), 0);

        // Estimate accuracy based on bet patterns
        const largeBets = bets.filter((b) => Math.abs(b.amount) > 50);
        const estimatedAccuracy = Math.min(
          95,
          50 + (userData.profitRank ? (1000 - userData.profitRank) / 20 : 0)
        );

        if (estimatedAccuracy < minAccuracy) continue;

        // Get top markets
        const marketIds = [...new Set(bets.slice(0, 10).map((b) => b.contractId))];
        const topMarkets: string[] = [];
        
        for (const marketId of marketIds.slice(0, 3)) {
          try {
            const marketRes = await fetch(
              `https://api.manifold.markets/v0/market/${marketId}`
            );
            const market = await marketRes.json();
            if (market?.question) {
              topMarkets.push(market.question);
            }
          } catch {
            // Skip failed market fetches
          }
        }

        traders.push({
          id: userData.id,
          username: userData.username,
          avatarUrl: userData.avatarUrl,
          accuracy: estimatedAccuracy,
          totalBets: bets.length,
          profitLoss: userData.profitRank ? (1000 - userData.profitRank) * 100 : 0,
          recentActivity: recentBets.length > 0 
            ? `${recentBets.length} bets this week`
            : "Inactive recently",
          isWatched: false,
          topMarkets,
        });

        // Add recent large moves
        for (const bet of largeBets.slice(0, 3)) {
          try {
            const marketRes = await fetch(
              `https://api.manifold.markets/v0/market/${bet.contractId}`
            );
            const market = await marketRes.json();

            recentMoves.push({
              id: bet.id,
              trader: {
                id: userData.id,
                username: userData.username,
                accuracy: estimatedAccuracy,
              },
              market: {
                id: bet.contractId,
                question: market?.question || "Unknown market",
                probability: market?.probability || 0.5,
                url: market?.url || `https://manifold.markets/markets/${bet.contractId}`,
              },
              action: bet.outcome === "YES" ? "BUY_YES" : "BUY_NO",
              amount: Math.abs(bet.amount),
              timestamp: new Date(bet.createdTime).toISOString(),
              impact: Math.abs(bet.probAfter - bet.probBefore),
            });
          } catch {
            // Skip failed market fetches
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userData.username}:`, error);
      }
    }

    // Use AI to analyze patterns and provide insights
    if (recentMoves.length > 0) {
      const moveSummary = recentMoves.slice(0, 10).map((m) => 
        `${m.trader.username} bet M$${m.amount} ${m.action} on "${m.market.question}"`
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
              content: `You analyze smart money movements in prediction markets. For each major bet, provide a brief 1-sentence analysis of why this trader might be making this move. Be concise and insightful.`,
            },
            {
              role: "user",
              content: `Analyze these recent smart money moves:\n\n${moveSummary}\n\nProvide brief analysis for the top 5 most significant moves.`,
            },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const analysis = aiData.choices?.[0]?.message?.content || "";
        
        // Add AI analysis to moves
        const lines = analysis.split("\n").filter((l: string) => l.trim());
        for (let i = 0; i < Math.min(lines.length, recentMoves.length); i++) {
          recentMoves[i].aiAnalysis = lines[i];
        }
      }
    }

    // Sort traders by accuracy
    traders.sort((a, b) => b.accuracy - a.accuracy);

    // Sort moves by amount
    recentMoves.sort((a, b) => b.amount - a.amount);

    return new Response(
      JSON.stringify({
        traders: traders.slice(0, 20),
        recentMoves: recentMoves.slice(0, 30),
        alerts: [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Smart money scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
