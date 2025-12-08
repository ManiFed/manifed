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

// MEANER Credit score formula - average should be ~50, worst is 0
// Each factor can add or subtract points from base of 25
function calculateCreditScore(user: ManifoldUser, portfolio: ManifoldPortfolio | null): {
  score: number;
  status: string;
  factors: { name: string; impact: string; value: string }[];
} {
  let score = 25; // Lower base score
  const factors: { name: string; impact: string; value: string }[] = [];
  
  // Account age factor (-5 to +15 points) - penalize new accounts
  const accountAgeMs = Date.now() - user.createdTime;
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
  let ageFactor: number;
  if (accountAgeDays < 30) {
    ageFactor = -5; // New account penalty
  } else if (accountAgeDays < 90) {
    ageFactor = 0;
  } else if (accountAgeDays < 365) {
    ageFactor = (accountAgeDays - 90) / 30; // ~9 points max in first year
  } else {
    ageFactor = Math.min(15, 9 + (accountAgeDays - 365) / 60); // Slower growth after year 1
  }
  score += ageFactor;
  factors.push({
    name: "Account Age",
    impact: ageFactor >= 8 ? "positive" : ageFactor <= 0 ? "negative" : "neutral",
    value: `${Math.floor(accountAgeDays)} days`
  });

  // Balance factor (-5 to +10 points) - penalize low/zero balance
  let balanceFactor: number;
  if (user.balance < 50) {
    balanceFactor = -5;
  } else if (user.balance < 500) {
    balanceFactor = 0;
  } else {
    balanceFactor = Math.min(10, Math.log10(user.balance / 500) * 5);
  }
  score += balanceFactor;
  factors.push({
    name: "Current Balance",
    impact: balanceFactor >= 5 ? "positive" : balanceFactor <= 0 ? "negative" : "neutral",
    value: `M$${user.balance.toLocaleString()}`
  });

  // Total deposits factor (-5 to +10 points) - penalize no real money in
  let depositFactor: number;
  if (user.totalDeposits <= 0) {
    depositFactor = -5;
  } else if (user.totalDeposits < 100) {
    depositFactor = -2;
  } else if (user.totalDeposits < 1000) {
    depositFactor = 2;
  } else {
    depositFactor = Math.min(10, Math.log10(user.totalDeposits / 100) * 3);
  }
  score += depositFactor;
  factors.push({
    name: "Total Deposits",
    impact: depositFactor >= 5 ? "positive" : depositFactor <= 0 ? "negative" : "neutral",
    value: `M$${user.totalDeposits.toLocaleString()}`
  });

  // Recent activity factor (-10 to +10 points) - heavily penalize inactivity
  if (user.lastBetTime) {
    const lastBetDaysAgo = (Date.now() - user.lastBetTime) / (1000 * 60 * 60 * 24);
    let activityFactor: number;
    if (lastBetDaysAgo < 3) {
      activityFactor = 10;
    } else if (lastBetDaysAgo < 7) {
      activityFactor = 7;
    } else if (lastBetDaysAgo < 14) {
      activityFactor = 3;
    } else if (lastBetDaysAgo < 30) {
      activityFactor = 0;
    } else if (lastBetDaysAgo < 90) {
      activityFactor = -5;
    } else {
      activityFactor = -10;
    }
    score += activityFactor;
    factors.push({
      name: "Recent Activity",
      impact: activityFactor >= 5 ? "positive" : activityFactor <= -5 ? "negative" : "neutral",
      value: lastBetDaysAgo < 1 ? "Today" : `${Math.floor(lastBetDaysAgo)} days ago`
    });
  } else {
    score -= 10;
    factors.push({
      name: "Recent Activity",
      impact: "negative",
      value: "Never"
    });
  }

  // Betting streak factor (0 to +5 points)
  if (user.currentBettingStreak) {
    const streakFactor = Math.min(5, user.currentBettingStreak / 3);
    score += streakFactor;
    factors.push({
      name: "Betting Streak",
      impact: user.currentBettingStreak >= 7 ? "positive" : "neutral",
      value: `${user.currentBettingStreak} days`
    });
  }

  // Portfolio factors if available
  if (portfolio) {
    // Investment value factor (-5 to +10 points)
    let investFactor: number;
    if (portfolio.investmentValue < 100) {
      investFactor = -5;
    } else if (portfolio.investmentValue < 1000) {
      investFactor = 0;
    } else {
      investFactor = Math.min(10, Math.log10(portfolio.investmentValue / 1000) * 5);
    }
    score += investFactor;
    factors.push({
      name: "Investment Value",
      impact: investFactor >= 5 ? "positive" : investFactor <= 0 ? "negative" : "neutral",
      value: `M$${portfolio.investmentValue.toLocaleString()}`
    });

    // Profit factor (-15 to +15 points) - biggest swing factor
    if (portfolio.profit !== undefined) {
      let profitFactor: number;
      if (portfolio.profit < -5000) {
        profitFactor = -15;
      } else if (portfolio.profit < -1000) {
        profitFactor = -10;
      } else if (portfolio.profit < 0) {
        profitFactor = Math.max(-10, portfolio.profit / 100);
      } else if (portfolio.profit < 1000) {
        profitFactor = portfolio.profit / 200;
      } else {
        profitFactor = Math.min(15, 5 + Math.log10(portfolio.profit / 1000) * 5);
      }
      score += profitFactor;
      factors.push({
        name: "All-Time Profit",
        impact: profitFactor >= 5 ? "positive" : profitFactor <= -5 ? "negative" : "neutral",
        value: `${portfolio.profit >= 0 ? '+' : ''}M$${portfolio.profit.toLocaleString()}`
      });
    }
  } else {
    // No portfolio data is bad
    score -= 5;
    factors.push({
      name: "Portfolio Data",
      impact: "negative",
      value: "Unavailable"
    });
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine status based on score - meaner thresholds
  let status: string;
  if (score >= 80) status = "excellent";
  else if (score >= 60) status = "good";
  else if (score >= 40) status = "fair";
  else if (score >= 20) status = "poor";
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