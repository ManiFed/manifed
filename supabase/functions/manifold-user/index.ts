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

// Credit score formula based on Manifold profile data
function calculateCreditScore(user: ManifoldUser, portfolio: ManifoldPortfolio | null): {
  score: number;
  status: string;
  factors: { name: string; impact: string; value: string }[];
} {
  let score = 50; // Base score
  const factors: { name: string; impact: string; value: string }[] = [];
  
  // Account age factor (up to +15 points)
  const accountAgeMs = Date.now() - user.createdTime;
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
  const ageFactor = Math.min(15, accountAgeDays / 30); // 1 point per month, max 15
  score += ageFactor;
  factors.push({
    name: "Account Age",
    impact: ageFactor >= 10 ? "positive" : ageFactor >= 5 ? "neutral" : "negative",
    value: `${Math.floor(accountAgeDays)} days`
  });

  // Balance factor (up to +10 points)
  const balanceFactor = Math.min(10, Math.log10(Math.max(1, user.balance)) * 2);
  score += balanceFactor;
  factors.push({
    name: "Current Balance",
    impact: user.balance >= 1000 ? "positive" : user.balance >= 100 ? "neutral" : "negative",
    value: `M$${user.balance.toLocaleString()}`
  });

  // Total deposits factor (up to +10 points)
  const depositFactor = Math.min(10, Math.log10(Math.max(1, user.totalDeposits)) * 2);
  score += depositFactor;
  factors.push({
    name: "Total Deposits",
    impact: user.totalDeposits >= 5000 ? "positive" : user.totalDeposits >= 500 ? "neutral" : "negative",
    value: `M$${user.totalDeposits.toLocaleString()}`
  });

  // Recent activity factor (up to +10 points)
  if (user.lastBetTime) {
    const lastBetDaysAgo = (Date.now() - user.lastBetTime) / (1000 * 60 * 60 * 24);
    const activityFactor = lastBetDaysAgo < 7 ? 10 : lastBetDaysAgo < 30 ? 5 : 0;
    score += activityFactor;
    factors.push({
      name: "Recent Activity",
      impact: lastBetDaysAgo < 7 ? "positive" : lastBetDaysAgo < 30 ? "neutral" : "negative",
      value: lastBetDaysAgo < 1 ? "Today" : `${Math.floor(lastBetDaysAgo)} days ago`
    });
  }

  // Betting streak factor (up to +5 points)
  if (user.currentBettingStreak) {
    const streakFactor = Math.min(5, user.currentBettingStreak / 2);
    score += streakFactor;
    factors.push({
      name: "Betting Streak",
      impact: user.currentBettingStreak >= 5 ? "positive" : "neutral",
      value: `${user.currentBettingStreak} days`
    });
  }

  // Portfolio factors if available
  if (portfolio) {
    // Investment value factor (up to +10 points)
    const investFactor = Math.min(10, Math.log10(Math.max(1, portfolio.investmentValue)) * 2);
    score += investFactor;
    factors.push({
      name: "Investment Value",
      impact: portfolio.investmentValue >= 5000 ? "positive" : portfolio.investmentValue >= 500 ? "neutral" : "negative",
      value: `M$${portfolio.investmentValue.toLocaleString()}`
    });

    // Profit factor (up to +10 or -10 points)
    if (portfolio.profit !== undefined) {
      const profitFactor = Math.max(-10, Math.min(10, portfolio.profit / 1000));
      score += profitFactor;
      factors.push({
        name: "All-Time Profit",
        impact: portfolio.profit > 0 ? "positive" : portfolio.profit < -500 ? "negative" : "neutral",
        value: `M$${portfolio.profit.toLocaleString()}`
      });
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine status based on score
  let status: string;
  if (score >= 90) status = "excellent";
  else if (score >= 70) status = "good";
  else if (score >= 50) status = "fair";
  else if (score >= 30) status = "new";
  else status = "poor";

  return { score, status, factors };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, apiKey } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching Manifold user data for: ${username}`);

    // Fetch user data from Manifold API
    const userResponse = await fetch(`https://api.manifold.markets/v0/user/${username}`);
    
    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: "User not found on Manifold Markets" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Failed to fetch user: ${userResponse.status}`);
    }

    const userData: ManifoldUser = await userResponse.json();
    console.log(`Found user: ${userData.name} (${userData.username})`);

    // Fetch portfolio data
    let portfolioData: ManifoldPortfolio | null = null;
    try {
      const portfolioResponse = await fetch(
        `https://api.manifold.markets/v0/get-user-portfolio?userId=${userData.id}`
      );
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
          headers: { Authorization: `Key ${apiKey}` }
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
        portfolio: portfolioData ? {
          investmentValue: portfolioData.investmentValue,
          balance: portfolioData.balance,
          totalDeposits: portfolioData.totalDeposits,
          loanTotal: portfolioData.loanTotal,
          profit: portfolioData.profit,
          dailyProfit: portfolioData.dailyProfit,
        } : null,
        creditScore,
        isVerified,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in manifold-user function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});