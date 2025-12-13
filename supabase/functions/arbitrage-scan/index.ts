import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManifoldMarket {
  id: string;
  question: string;
  probability?: number;
  url: string;
  creatorUsername: string;
  resolution?: string;
  isResolved: boolean;
  closeTime?: number;
  groupSlugs?: string[];
  description?: string;
  textDescription?: string;
  answers?: Array<{ id: string; text: string; probability: number }>;
  outcomeType: string;
}

interface ArbitrageOpportunity {
  id: string;
  type: 'mutually_exclusive' | 'exhaustive_incomplete' | 'parent_child';
  markets: {
    id: string;
    question: string;
    probability: number;
    url: string;
  }[];
  expectedProfit: number;
  requiredCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  status: 'pending';
}

// Check if market has clear, objective resolution criteria
function hasObjectiveResolution(market: ManifoldMarket): boolean {
  const subjectiveKeywords = [
    'subjective', 'opinion', 'feel', 'think', 'believe',
    'best', 'worst', 'most', 'least', 'favorite'
  ];
  
  const text = (market.question + ' ' + (market.textDescription || '')).toLowerCase();
  return !subjectiveKeywords.some(keyword => text.includes(keyword));
}

// Check if market is still tradeable
function isTradeable(market: ManifoldMarket): boolean {
  if (market.isResolved) return false;
  if (market.resolution) return false;
  if (market.closeTime && market.closeTime < Date.now()) return false;
  return true;
}

// Find mutually exclusive markets where probabilities sum > 100%
function findMutuallyExclusiveArbitrage(markets: ManifoldMarket[]): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const groupedMarkets: Record<string, ManifoldMarket[]> = {};

  // Group markets by similar topics/groups
  for (const market of markets) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'BINARY') continue;
    
    const groups = market.groupSlugs || [];
    for (const group of groups) {
      if (!groupedMarkets[group]) groupedMarkets[group] = [];
      groupedMarkets[group].push(market);
    }
  }

  // Look for related markets with probability sum > 100%
  for (const [group, groupMarkets] of Object.entries(groupedMarkets)) {
    if (groupMarkets.length < 2) continue;

    // Find pairs of markets that might be mutually exclusive
    for (let i = 0; i < groupMarkets.length; i++) {
      for (let j = i + 1; j < groupMarkets.length; j++) {
        const m1 = groupMarkets[i];
        const m2 = groupMarkets[j];
        
        const p1 = m1.probability || 0.5;
        const p2 = m2.probability || 0.5;
        
        // Check if they appear to be mutually exclusive (one negates the other)
        const q1Lower = m1.question.toLowerCase();
        const q2Lower = m2.question.toLowerCase();
        
        // Simple heuristic: if one contains "not" or "won't" variation of the other
        const mightBeMutuallyExclusive = 
          (q1Lower.includes('not') && q2Lower.includes(q1Lower.replace(/not\s+/i, ''))) ||
          (q2Lower.includes('not') && q1Lower.includes(q2Lower.replace(/not\s+/i, '')));

        if (mightBeMutuallyExclusive && p1 + p2 > 1.02) { // At least 2% mispricing
          const profitMargin = (p1 + p2 - 1) * 100; // Profit in M$ per 100 invested
          const requiredCapital = 100; // Base capital to illustrate
          
          opportunities.push({
            id: `me_${m1.id}_${m2.id}`,
            type: 'mutually_exclusive',
            markets: [
              { id: m1.id, question: m1.question, probability: p1, url: m1.url },
              { id: m2.id, question: m2.question, probability: p2, url: m2.url },
            ],
            expectedProfit: profitMargin,
            requiredCapital,
            riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
            description: `Mutually exclusive markets sum to ${((p1 + p2) * 100).toFixed(1)}% (>${"100%"})`,
            status: 'pending',
          });
        }
      }
    }
  }

  return opportunities;
}

// Find multiple choice markets where probabilities don't sum to 100%
function findExhaustiveSetArbitrage(markets: ManifoldMarket[]): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const market of markets) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'MULTIPLE_CHOICE' || !market.answers) continue;

    const totalProb = market.answers.reduce((sum, a) => sum + a.probability, 0);
    
    // Check for significant deviation from 100%
    if (totalProb < 0.95 || totalProb > 1.05) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      
      opportunities.push({
        id: `es_${market.id}`,
        type: 'exhaustive_incomplete',
        markets: market.answers.map(a => ({
          id: `${market.id}_${a.id}`,
          question: `${market.question} → ${a.text}`,
          probability: a.probability,
          url: market.url,
        })),
        expectedProfit: profitMargin,
        requiredCapital: 100,
        riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
        description: totalProb < 1 
          ? `Exhaustive set sums to ${(totalProb * 100).toFixed(1)}% (<100%)`
          : `Exhaustive set sums to ${(totalProb * 100).toFixed(1)}% (>100%)`,
        status: 'pending',
      });
    }
  }

  return opportunities;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, opportunityId, markets } = await req.json();

    if (action === 'scan') {
      console.log("Starting arbitrage scan for user:", user.id);

      // Fetch active markets from Manifold API
      // Using the correct v0 API endpoint with valid parameters
      const marketsResponse = await fetch(
        'https://api.manifold.markets/v0/search-markets?limit=200&filter=open'
      );

      if (!marketsResponse.ok) {
        const errorText = await marketsResponse.text();
        console.error("Manifold API error:", marketsResponse.status, errorText);
        throw new Error(`Failed to fetch markets: ${marketsResponse.status} - ${errorText}`);
      }

      const allMarkets: ManifoldMarket[] = await marketsResponse.json();
      console.log(`Fetched ${allMarkets.length} markets`);

      // Filter to tradeable markets only
      const tradeableMarkets = allMarkets.filter(m => isTradeable(m) && hasObjectiveResolution(m));
      console.log(`${tradeableMarkets.length} tradeable markets with objective resolution`);

      // Find arbitrage opportunities
      const mutuallyExclusiveOpps = findMutuallyExclusiveArbitrage(tradeableMarkets);
      const exhaustiveSetOpps = findExhaustiveSetArbitrage(tradeableMarkets);

      const opportunities = [...mutuallyExclusiveOpps, ...exhaustiveSetOpps]
        .sort((a, b) => b.expectedProfit - a.expectedProfit)
        .slice(0, 20); // Return top 20 opportunities

      console.log(`Found ${opportunities.length} arbitrage opportunities`);

      return new Response(
        JSON.stringify({
          success: true,
          marketsScanned: allMarkets.length,
          opportunities,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'execute') {
      console.log("Executing arbitrage opportunity:", opportunityId);

      // Get user's API key for trading
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: settings } = await supabaseService
        .from('user_manifold_settings')
        .select('manifold_api_key')
        .eq('user_id', user.id)
        .single();

      if (!settings?.manifold_api_key) {
        return new Response(
          JSON.stringify({ error: "Manifold API key not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decrypt the API key
      const encryptionKey = Deno.env.get("API_ENCRYPTION_KEY");
      if (!encryptionKey) {
        throw new Error("Encryption key not configured");
      }

      // Simple decryption (matching save-api-key encryption)
      const [ivHex, encryptedHex] = settings.manifold_api_key.split(':');
      const iv = new Uint8Array(ivHex.match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16)));
      const encrypted = new Uint8Array(encryptedHex.match(/.{2}/g)!.map((byte: string) => parseInt(byte, 16)));
      
      const keyData = new TextEncoder().encode(encryptionKey.slice(0, 32).padEnd(32, '0'));
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encrypted
      );

      const apiKey = new TextDecoder().decode(decrypted);

      // For now, we'll simulate the trade execution
      // In production, you would place actual limit orders on each market
      console.log("Would execute trades on markets:", markets);

      // Placeholder response - actual implementation would:
      // 1. Calculate optimal bet sizing per market
      // 2. Check current market prices for slippage
      // 3. Place limit orders atomically if possible
      // 4. Monitor for fills and adjust
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Trade execution simulated successfully",
          opportunityId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Arbitrage scan error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
