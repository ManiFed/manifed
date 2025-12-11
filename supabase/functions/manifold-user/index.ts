import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManifoldUser {
  id: string;
  createdTime: number;
  name: string;
  username: string;
  url: string;
  avatarUrl?: string;
  bio?: string;
  balance: number;
  totalDeposits: number;
  lastBetTime?: number;
  currentBettingStreak?: number;
}

interface ManifoldPortfolio {
  investmentValue: number;
  balance: number;
  totalDeposits: number;
  loanTotal: number;
  profit?: number;
  dailyProfit: number;
}

// New credit score formula based on MMR
// Variables: B=balance, P=profit, A=ageDays, L=netLoanBalance, r=rank, n=transactionCount
function calculateCreditScore(
  user: ManifoldUser,
  portfolio: ManifoldPortfolio | null,
): {
  score: number;
  status: string;
  factors: { name: string; impact: string; value: string }[];
} {
  const factors: { name: string; impact: string; value: string }[] = [];

  // Extract values
  const B = portfolio?.balance ?? user.balance; // balance
  const P = portfolio?.profit ?? 0; // calculatedProfit
  const A = (Date.now() - user.createdTime) / (1000 * 60 * 60 * 24); // ageDays
  const L = portfolio?.loanTotal ? -portfolio.loanTotal : 0; // netLoanBalance (negative when you owe)
  const r = 50; // rank (we don't have this from API, use middle value)
  const R_max = 100; // maxRank
  const n = user.currentBettingStreak ?? 0; // using streak as proxy for activity

  // Weights
  const w_B = 0.1;
  const w_L = 0.15;
  const w_P = 0.5;
  const w_A = 0.05;
  const w_rank = 0.1;
  const w_txn = 0.1;

  // Rank term: rankWeight = clamp[0,1](1 - (r-1)/(R_max-1))
  const rankWeight = Math.max(0, Math.min(1, 1 - (r - 1) / (R_max - 1)));
  const rankMMR = 1000 * rankWeight;

  // Transaction activity term (piecewise)
  let transactionMMR: number;
  if (n < 5) {
    transactionMMR = -1000000;
  } else if (n <= 20) {
    transactionMMR = -100000 + 90000 * ((n - 5) / 15);
  } else if (n <= 100) {
    transactionMMR = -10000 + 10000 * ((n - 20) / 80);
  } else if (n <= 1000) {
    transactionMMR = 1000 * ((n - 100) / 900);
  } else {
    transactionMMR = 1000;
  }

  // Main formula: MMR = w_B*B + w_L*L + w_P*P + w_A*A + w_rank*rankMMR + w_txn*transactionMMR
  const rawMMR = w_B * B + w_L * L + w_P * P + w_A * A + w_rank * rankMMR + w_txn * transactionMMR;

  // Signed log transform
  const transform = (x: number): number => Math.sign(x) * Math.log10(1 + Math.abs(x));

  // Constants for normalization
  const minMMR = -500000;
  const maxMMR = 2000000;

  // Apply transform and normalize
  const t_min = transform(minMMR);
  const t_max = transform(maxMMR);
  const t = transform(rawMMR);

  const normalized = (t - t_min) / (t_max - t_min);
  const score = Math.round(Math.max(0, Math.min(1000, normalized * 1000)));

  // Build factors for display
  factors.push({
    name: "Balance",
    impact: B >= 1000 ? "positive" : B <= 100 ? "negative" : "neutral",
    value: `M$${B.toLocaleString()}`,
  });

  factors.push({
    name: "All-Time Profit",
    impact: P >= 1000 ? "positive" : P <= -1000 ? "negative" : "neutral",
    value: `${P >= 0 ? "+" : ""}M$${P.toLocaleString()}`,
  });

  factors.push({
    name: "Account Age",
    impact: A >= 365 ? "positive" : A <= 30 ? "negative" : "neutral",
    value: `${Math.floor(A)} days`,
  });

  if (L !== 0) {
    factors.push({
      name: "Loan Balance",
      impact: L >= 0 ? "neutral" : "negative",
      value: `M$${L.toLocaleString()}`,
    });
  }

  factors.push({
    name: "Activity",
    impact: n >= 20 ? "positive" : n <= 5 ? "negative" : "neutral",
    value: n > 0 ? `${n} day streak` : "No recent activity",
  });

  // Determine status based on score (0-1000 scale)
  let status: string;
  if (score >= 800) status = "excellent";
  else if (score >= 600) status = "good";
  else if (score >= 400) status = "fair";
  else if (score >= 200) status = "poor";
  else status = "very_poor";

  return { score, status, factors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, apiKey } = await req.json();

    if (!username) {
      return new Response(JSON.stringify({ error: "Username is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching Manifold user data for: ${username}`);

    // Fetch user data from Manifold API
    const userResponse = await fetch(`https://api.manifold.markets/v0/user/${username}`);

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return new Response(JSON.stringify({ error: "User not found on Manifold Markets" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Failed to fetch user: ${userResponse.status}`);
    }

    const userData: ManifoldUser = await userResponse.json();
    console.log(`Found user: ${userData.name} (${userData.username})`);

    // Fetch portfolio data
    let portfolioData: ManifoldPortfolio | null = null;
    try {
      const portfolioResponse = await fetch(`https://api.manifold.markets/v0/get-user-portfolio?userId=${userData.id}`);
      if (portfolioResponse.ok) {
        portfolioData = await portfolioResponse.json();
        console.log("Portfolio data fetched successfully");
      }
    } catch (e) {
      console.log("Could not fetch portfolio data:", e);
    }

    // If API key provided, verify it belongs to this user
    let isVerified = false;
    if (apiKey) {
      try {
        const meResponse = await fetch("https://api.manifold.markets/v0/me", {
          headers: { Authorization: `Key ${apiKey}` },
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          isVerified = meData.id === userData.id;
        }
      } catch (e) {
        console.log("Could not verify API key:", e);
      }
    }

    // Calculate credit score
    const creditScore = calculateCreditScore(userData, portfolioData);

    return new Response(
      JSON.stringify({
        user: {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          avatarUrl: userData.avatarUrl,
          bio: userData.bio,
          balance: userData.balance,
          totalDeposits: userData.totalDeposits,
          createdTime: userData.createdTime,
          lastBetTime: userData.lastBetTime,
          currentBettingStreak: userData.currentBettingStreak,
        },
        portfolio: portfolioData
          ? {
              investmentValue: portfolioData.investmentValue,
              balance: portfolioData.balance,
              totalDeposits: portfolioData.totalDeposits,
              loanTotal: portfolioData.loanTotal,
              profit: portfolioData.profit,
              dailyProfit: portfolioData.dailyProfit,
            }
          : null,
        creditScore,
        isVerified,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in manifold-user function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
