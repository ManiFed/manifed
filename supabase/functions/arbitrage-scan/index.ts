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
  volume?: number;
  volume24Hours?: number;
  totalLiquidity?: number;
  uniqueBettorCount?: number;
  createdTime?: number;
}

interface ArbitrageOpportunity {
  id: string;
  type: 'mutually_exclusive' | 'exhaustive_incomplete' | 'semantic_pair' | 'multi_market';
  markets: {
    id: string;
    question: string;
    probability: number;
    url: string;
    liquidity?: number;
    volume?: number;
    action: 'BUY_YES' | 'BUY_NO';
    optimalBet?: number;
  }[];
  expectedProfit: number;
  maxLoss: number;
  expectedVariance: number;
  requiredCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  status: 'pending';
  dynamicThreshold: number;
  liquidityScore: number;
  similarityScore?: number;
  priceImpactEstimate: number;
}

interface ScanConfig {
  minLiquidity: number;
  minVolume: number;
  baseThreshold: number;
  dynamicThresholdEnabled: boolean;
  semanticMatchingEnabled: boolean;
  dryRun: boolean;
}

// Tokenize and normalize text for comparison
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

const stopWords = new Set([
  'the', 'will', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
  'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'were',
  'they', 'their', 'what', 'when', 'where', 'which', 'who', 'how', 'than',
  'that', 'this', 'these', 'those', 'then', 'some', 'such', 'into', 'other',
  'before', 'after', 'during', 'between', 'under', 'over', 'through', 'about'
]);

// Calculate Jaccard similarity between two questions
function calculateSimilarity(q1: string, q2: string): number {
  const tokens1 = new Set(tokenize(q1));
  const tokens2 = new Set(tokenize(q2));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return intersection.size / union.size;
}

// Check if two questions might be asking opposite things
function areOppositeQuestions(q1: string, q2: string): { isOpposite: boolean; confidence: number } {
  const lower1 = q1.toLowerCase();
  const lower2 = q2.toLowerCase();
  
  // Negation patterns
  const negationPatterns = [
    { positive: /will (.+) happen/i, negative: /will (.+) not happen/i },
    { positive: /will (.+) win/i, negative: /will (.+) lose/i },
    { positive: /yes on (.+)/i, negative: /no on (.+)/i },
    { positive: /(.+) before (\d+)/i, negative: /(.+) after (\d+)/i },
    { positive: /(.+) above (\d+)/i, negative: /(.+) below (\d+)/i },
    { positive: /(.+) more than/i, negative: /(.+) less than/i },
  ];
  
  // Check for simple negation (one question has 'not' where the other doesn't)
  const words1 = lower1.split(/\s+/);
  const words2 = lower2.split(/\s+/);
  
  const hasNot1 = words1.includes('not') || words1.includes("won't") || words1.includes("n't");
  const hasNot2 = words2.includes('not') || words2.includes("won't") || words2.includes("n't");
  
  // If similar questions but one has negation
  const baseSimilarity = calculateSimilarity(q1, q2);
  if (baseSimilarity > 0.5 && hasNot1 !== hasNot2) {
    return { isOpposite: true, confidence: baseSimilarity };
  }
  
  // Check win/lose opposites
  const winLosePattern1 = lower1.match(/will (.+?) (win|lose|beat|defeat)/);
  const winLosePattern2 = lower2.match(/will (.+?) (win|lose|beat|defeat)/);
  
  if (winLosePattern1 && winLosePattern2) {
    const subject1 = winLosePattern1[1];
    const action1 = winLosePattern1[2];
    const subject2 = winLosePattern2[1];
    const action2 = winLosePattern2[2];
    
    const subjectSimilarity = calculateSimilarity(subject1, subject2);
    const oppositeActions = 
      (action1 === 'win' && action2 === 'lose') ||
      (action1 === 'lose' && action2 === 'win') ||
      (action1 === 'beat' && action2 === 'lose') ||
      (action1 === 'defeat' && action2 === 'lose');
    
    if (subjectSimilarity > 0.6 && oppositeActions) {
      return { isOpposite: true, confidence: subjectSimilarity };
    }
  }
  
  return { isOpposite: false, confidence: 0 };
}

// Check if market has clear, objective resolution criteria
function hasObjectiveResolution(market: ManifoldMarket): boolean {
  const subjectiveKeywords = [
    'subjective', 'opinion', 'feel', 'think', 'believe',
    'best', 'worst', 'favorite', 'prefer', 'personally',
    'vibes', 'seems', 'might', 'probably'
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

// Calculate dynamic threshold based on liquidity and volatility
function calculateDynamicThreshold(market1: ManifoldMarket, market2?: ManifoldMarket): number {
  const baseFee = 0.005; // 0.5% base fee
  const baseThreshold = 0.02; // 2% minimum threshold
  
  const liq1 = market1.totalLiquidity || 100;
  const liq2 = market2?.totalLiquidity || liq1;
  const minLiquidity = Math.min(liq1, liq2);
  
  // Lower liquidity = higher threshold needed (more slippage expected)
  const liquidityFactor = Math.max(0.5, Math.min(2, 1000 / minLiquidity));
  
  // Recent volume indicates active trading = lower threshold acceptable
  const vol1 = market1.volume24Hours || 0;
  const vol2 = market2?.volume24Hours || vol1;
  const avgVolume = (vol1 + vol2) / 2;
  const volumeFactor = avgVolume > 100 ? 0.8 : avgVolume > 50 ? 0.9 : 1.0;
  
  return (baseThreshold + baseFee) * liquidityFactor * volumeFactor;
}

// Estimate price impact of a trade
function estimatePriceImpact(market: ManifoldMarket, betAmount: number): number {
  const liquidity = market.totalLiquidity || 100;
  // Simplified AMM price impact: larger bets relative to liquidity = more impact
  const impactFactor = betAmount / (liquidity + betAmount);
  return impactFactor * 0.5; // Conservative estimate
}

// Calculate optimal bet sizing using Kelly criterion (simplified)
function calculateOptimalBet(probability: number, edge: number, bankroll: number): number {
  // Kelly fraction = edge / odds
  const impliedOdds = (1 / probability) - 1;
  const kellyFraction = edge / impliedOdds;
  
  // Use fractional Kelly (quarter Kelly) for safety
  const quarterKelly = kellyFraction * 0.25;
  
  // Cap at 10% of bankroll
  const maxBet = bankroll * 0.1;
  
  return Math.max(0, Math.min(quarterKelly * bankroll, maxBet));
}

// Calculate liquidity score for a market
function calculateLiquidityScore(market: ManifoldMarket): number {
  const liquidity = market.totalLiquidity || 0;
  const volume = market.volume || 0;
  const bettors = market.uniqueBettorCount || 0;
  
  // Weighted score
  const score = (
    Math.log10(liquidity + 1) * 30 +
    Math.log10(volume + 1) * 40 +
    Math.min(bettors, 100) * 0.3
  );
  
  return Math.min(100, score);
}

// Find semantically similar market pairs
function findSemanticPairArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const processedPairs = new Set<string>();
  
  // Filter to binary markets with sufficient liquidity
  const eligibleMarkets = markets.filter(m => 
    isTradeable(m) && 
    hasObjectiveResolution(m) && 
    m.outcomeType === 'BINARY' &&
    (m.totalLiquidity || 0) >= config.minLiquidity &&
    (m.volume || 0) >= config.minVolume
  );
  
  console.log(`Analyzing ${eligibleMarkets.length} eligible markets for semantic pairs`);
  
  // Group by tags for faster comparison
  const tagGroups: Record<string, ManifoldMarket[]> = {};
  for (const market of eligibleMarkets) {
    const groups = market.groupSlugs || ['ungrouped'];
    for (const group of groups) {
      if (!tagGroups[group]) tagGroups[group] = [];
      tagGroups[group].push(market);
    }
  }
  
  // Compare within tag groups
  for (const [tag, groupMarkets] of Object.entries(tagGroups)) {
    if (groupMarkets.length < 2) continue;
    
    for (let i = 0; i < groupMarkets.length && i < 50; i++) {
      for (let j = i + 1; j < groupMarkets.length && j < 50; j++) {
        const m1 = groupMarkets[i];
        const m2 = groupMarkets[j];
        
        const pairKey = [m1.id, m2.id].sort().join(':');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        // Check semantic similarity
        const similarity = calculateSimilarity(m1.question, m2.question);
        if (similarity < 0.4) continue;
        
        // Check if they're opposite questions
        const { isOpposite, confidence } = areOppositeQuestions(m1.question, m2.question);
        
        const p1 = m1.probability || 0.5;
        const p2 = m2.probability || 0.5;
        
        // Calculate dynamic threshold
        const threshold = calculateDynamicThreshold(m1, m2);
        
        // Same question: arbitrage if one YES + other NO < 1
        if (similarity > 0.7 && !isOpposite) {
          // If same question, buy YES in cheaper and NO in expensive
          const yesNo = p1 + (1 - p2);
          const noYes = (1 - p1) + p2;
          
          if (yesNo < 1 - threshold || noYes < 1 - threshold) {
            const spread = Math.min(yesNo, noYes);
            const profitMargin = (1 - spread) * 100;
            const avgLiquidity = ((m1.totalLiquidity || 100) + (m2.totalLiquidity || 100)) / 2;
            const priceImpact = estimatePriceImpact(m1, 50) + estimatePriceImpact(m2, 50);
            
            const action1: 'BUY_YES' | 'BUY_NO' = yesNo < noYes ? 'BUY_YES' : 'BUY_NO';
            const action2: 'BUY_YES' | 'BUY_NO' = yesNo < noYes ? 'BUY_NO' : 'BUY_YES';
            
            opportunities.push({
              id: `sp_${m1.id}_${m2.id}`,
              type: 'semantic_pair',
              markets: [
                { id: m1.id, question: m1.question, probability: p1, url: m1.url, liquidity: m1.totalLiquidity, volume: m1.volume, action: action1 },
                { id: m2.id, question: m2.question, probability: p2, url: m2.url, liquidity: m2.totalLiquidity, volume: m2.volume, action: action2 },
              ],
              expectedProfit: profitMargin * (1 - priceImpact),
              maxLoss: 0, // Guaranteed arbitrage
              expectedVariance: profitMargin * priceImpact,
              requiredCapital: 100,
              riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
              description: `Similar questions (${(similarity * 100).toFixed(0)}% match) with spread of ${(spread * 100).toFixed(1)}%`,
              status: 'pending',
              dynamicThreshold: threshold,
              liquidityScore: calculateLiquidityScore(m1),
              similarityScore: similarity,
              priceImpactEstimate: priceImpact,
            });
          }
        }
        
        // Opposite questions: arbitrage if both YES probabilities sum > 1 or < 1
        if (isOpposite && confidence > 0.5) {
          const totalProb = p1 + p2;
          
          if (Math.abs(totalProb - 1) > threshold) {
            const profitMargin = Math.abs(totalProb - 1) * 100;
            const avgLiquidity = ((m1.totalLiquidity || 100) + (m2.totalLiquidity || 100)) / 2;
            const priceImpact = estimatePriceImpact(m1, 50) + estimatePriceImpact(m2, 50);
            
            const action1: 'BUY_YES' | 'BUY_NO' = totalProb > 1 ? 'BUY_NO' : 'BUY_YES';
            const action2: 'BUY_YES' | 'BUY_NO' = totalProb > 1 ? 'BUY_NO' : 'BUY_YES';
            
            opportunities.push({
              id: `op_${m1.id}_${m2.id}`,
              type: 'mutually_exclusive',
              markets: [
                { id: m1.id, question: m1.question, probability: p1, url: m1.url, liquidity: m1.totalLiquidity, volume: m1.volume, action: action1 },
                { id: m2.id, question: m2.question, probability: p2, url: m2.url, liquidity: m2.totalLiquidity, volume: m2.volume, action: action2 },
              ],
              expectedProfit: profitMargin * (1 - priceImpact),
              maxLoss: 0,
              expectedVariance: profitMargin * priceImpact,
              requiredCapital: 100,
              riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
              description: totalProb > 1
                ? `Opposite questions sum to ${(totalProb * 100).toFixed(1)}% (>100%)`
                : `Opposite questions sum to ${(totalProb * 100).toFixed(1)}% (<100%)`,
              status: 'pending',
              dynamicThreshold: threshold,
              liquidityScore: calculateLiquidityScore(m1),
              similarityScore: confidence,
              priceImpactEstimate: priceImpact,
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

// Find multiple choice markets where probabilities don't sum to 100%
function findExhaustiveSetArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const market of markets) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'MULTIPLE_CHOICE' || !market.answers) continue;
    if ((market.totalLiquidity || 0) < config.minLiquidity) continue;

    const totalProb = market.answers.reduce((sum, a) => sum + a.probability, 0);
    const threshold = calculateDynamicThreshold(market);
    
    // Check for significant deviation from 100%
    if (Math.abs(totalProb - 1) > threshold) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      const priceImpact = estimatePriceImpact(market, 50);
      
      // Determine optimal actions for each answer
      const marketDetails = market.answers.map(a => ({
        id: `${market.id}_${a.id}`,
        question: `${market.question} → ${a.text}`,
        probability: a.probability,
        url: market.url,
        liquidity: market.totalLiquidity,
        volume: market.volume,
        action: (totalProb > 1 ? 'BUY_NO' : 'BUY_YES') as 'BUY_YES' | 'BUY_NO',
      }));
      
      opportunities.push({
        id: `es_${market.id}`,
        type: 'exhaustive_incomplete',
        markets: marketDetails,
        expectedProfit: profitMargin * (1 - priceImpact),
        maxLoss: 0,
        expectedVariance: profitMargin * priceImpact,
        requiredCapital: 100,
        riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
        description: totalProb < 1 
          ? `Exhaustive set sums to ${(totalProb * 100).toFixed(1)}% (<100%)`
          : `Exhaustive set sums to ${(totalProb * 100).toFixed(1)}% (>100%)`,
        status: 'pending',
        dynamicThreshold: threshold,
        liquidityScore: calculateLiquidityScore(market),
        priceImpactEstimate: priceImpact,
      });
    }
  }

  return opportunities;
}

// Find multi-market outcome sets (e.g., election outcomes)
function findMultiMarketArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Group markets by common themes/events
  const eventGroups: Record<string, ManifoldMarket[]> = {};
  
  // Common event patterns to look for
  const eventPatterns = [
    /(\d{4}) (election|primary|vote)/i,
    /(president|presidential) (election|race|winner)/i,
    /(world cup|olympics|championship|super bowl)/i,
    /(apple|google|microsoft|amazon|meta|tesla) (stock|price|earnings)/i,
  ];
  
  for (const market of markets) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'BINARY') continue;
    if ((market.totalLiquidity || 0) < config.minLiquidity * 0.5) continue;
    
    for (const pattern of eventPatterns) {
      const match = market.question.match(pattern);
      if (match) {
        const eventKey = match[0].toLowerCase();
        if (!eventGroups[eventKey]) eventGroups[eventKey] = [];
        eventGroups[eventKey].push(market);
        break;
      }
    }
  }
  
  // Analyze each event group for arbitrage
  for (const [event, eventMarkets] of Object.entries(eventGroups)) {
    if (eventMarkets.length < 2) continue;
    
    // Look for mutually exclusive outcomes within the event
    // E.g., "Will X win?" and "Will Y win?" for the same election
    const totalProb = eventMarkets.reduce((sum, m) => sum + (m.probability || 0.5), 0);
    
    // If probabilities of mutually exclusive outcomes sum to > 1 or < 1 significantly
    const threshold = 0.05 * eventMarkets.length; // Scale threshold with number of markets
    
    if (Math.abs(totalProb - 1) > threshold && eventMarkets.length <= 10) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      const avgLiquidity = eventMarkets.reduce((sum, m) => sum + (m.totalLiquidity || 0), 0) / eventMarkets.length;
      const priceImpact = eventMarkets.reduce((sum, m) => sum + estimatePriceImpact(m, 50 / eventMarkets.length), 0);
      
      opportunities.push({
        id: `mm_${event.replace(/\s+/g, '_')}_${eventMarkets[0].id}`,
        type: 'multi_market',
        markets: eventMarkets.map(m => ({
          id: m.id,
          question: m.question,
          probability: m.probability || 0.5,
          url: m.url,
          liquidity: m.totalLiquidity,
          volume: m.volume,
          action: (totalProb > 1 ? 'BUY_NO' : 'BUY_YES') as 'BUY_YES' | 'BUY_NO',
        })),
        expectedProfit: profitMargin * (1 - priceImpact),
        maxLoss: profitMargin * 0.1, // Some risk due to resolution uncertainty
        expectedVariance: profitMargin * priceImpact * 1.5,
        requiredCapital: 100 * eventMarkets.length,
        riskLevel: deviation > 0.15 ? 'low' : deviation > 0.08 ? 'medium' : 'high',
        description: `Multi-market "${event}" (${eventMarkets.length} markets) sums to ${(totalProb * 100).toFixed(1)}%`,
        status: 'pending',
        dynamicThreshold: threshold,
        liquidityScore: avgLiquidity > 500 ? 80 : avgLiquidity > 100 ? 50 : 20,
        priceImpactEstimate: priceImpact,
      });
    }
  }
  
  return opportunities;
}

// Fetch markets with pagination to get 1000+
async function fetchAllMarkets(limit: number = 1000): Promise<ManifoldMarket[]> {
  const allMarkets: ManifoldMarket[] = [];
  const batchSize = 100; // API max per request
  let lastId: string | null = null;
  
  while (allMarkets.length < limit) {
    let url = `https://api.manifold.markets/v0/search-markets?limit=${batchSize}&filter=open&sort=liquidity`;
    if (lastId) {
      url += `&before=${lastId}`;
    }
    
    console.log(`Fetching batch: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Manifold API error:", response.status, errorText);
      break;
    }
    
    const markets: ManifoldMarket[] = await response.json();
    if (markets.length === 0) break;
    
    allMarkets.push(...markets);
    lastId = markets[markets.length - 1].id;
    
    console.log(`Fetched ${allMarkets.length} markets so far`);
    
    if (markets.length < batchSize) break;
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return allMarkets;
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

    const { action, opportunityId, markets, config: userConfig } = await req.json();

    if (action === 'scan') {
      console.log("Starting enhanced arbitrage scan for user:", user.id);

      // Merge user config with defaults
      const config: ScanConfig = {
        minLiquidity: userConfig?.minLiquidity ?? 50,
        minVolume: userConfig?.minVolume ?? 10,
        baseThreshold: userConfig?.baseThreshold ?? 0.02,
        dynamicThresholdEnabled: userConfig?.dynamicThresholdEnabled ?? true,
        semanticMatchingEnabled: userConfig?.semanticMatchingEnabled ?? true,
        dryRun: userConfig?.dryRun ?? true,
      };

      console.log("Scan config:", config);

      // Fetch 1000+ markets with pagination
      const allMarkets = await fetchAllMarkets(1200);
      console.log(`Fetched ${allMarkets.length} total markets`);

      // Filter to tradeable markets only
      const tradeableMarkets = allMarkets.filter(m => isTradeable(m) && hasObjectiveResolution(m));
      console.log(`${tradeableMarkets.length} tradeable markets with objective resolution`);

      // Find arbitrage opportunities using all methods
      const exhaustiveSetOpps = findExhaustiveSetArbitrage(tradeableMarkets, config);
      console.log(`Found ${exhaustiveSetOpps.length} exhaustive set opportunities`);
      
      const multiMarketOpps = findMultiMarketArbitrage(tradeableMarkets, config);
      console.log(`Found ${multiMarketOpps.length} multi-market opportunities`);
      
      let semanticPairOpps: ArbitrageOpportunity[] = [];
      if (config.semanticMatchingEnabled) {
        semanticPairOpps = findSemanticPairArbitrage(tradeableMarkets, config);
        console.log(`Found ${semanticPairOpps.length} semantic pair opportunities`);
      }

      // Combine and sort by expected profit adjusted for risk
      const allOpportunities = [...exhaustiveSetOpps, ...multiMarketOpps, ...semanticPairOpps];
      
      // Score opportunities by profit-to-risk ratio
      const scoredOpportunities = allOpportunities.map(opp => ({
        ...opp,
        score: (opp.expectedProfit - opp.maxLoss) / (opp.expectedVariance + 1) * opp.liquidityScore / 100
      }));
      
      const opportunities = scoredOpportunities
        .sort((a, b) => b.score - a.score)
        .slice(0, 50) // Return top 50 opportunities
        .map(({ score, ...opp }) => opp);

      console.log(`Returning ${opportunities.length} arbitrage opportunities`);

      return new Response(
        JSON.stringify({
          success: true,
          marketsScanned: allMarkets.length,
          tradeableMarkets: tradeableMarkets.length,
          opportunities,
          scanConfig: config,
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

      // Execute trades
      const results = [];
      for (const market of markets) {
        console.log(`Placing ${market.action} bet on market ${market.id}`);
        
        // Calculate bet amount (use optimalBet or default)
        const betAmount = market.optimalBet || 10;
        const outcome = market.action === 'BUY_YES' ? 'YES' : 'NO';
        
        // Check current market price before trading
        const marketDataRes = await fetch(`https://api.manifold.markets/v0/market/${market.id}`);
        if (!marketDataRes.ok) {
          results.push({ marketId: market.id, success: false, error: 'Failed to fetch market data' });
          continue;
        }
        
        const marketData = await marketDataRes.json();
        const currentProb = marketData.probability || 0.5;
        const expectedProb = market.probability;
        
        // Check slippage
        const slippage = Math.abs(currentProb - expectedProb);
        if (slippage > 0.05) { // 5% slippage limit
          results.push({ 
            marketId: market.id, 
            success: false, 
            error: `Slippage too high: ${(slippage * 100).toFixed(1)}% (expected ${(expectedProb * 100).toFixed(1)}%, got ${(currentProb * 100).toFixed(1)}%)` 
          });
          continue;
        }
        
        // Place the bet using limit orders
        const betRes = await fetch('https://api.manifold.markets/v0/bet', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractId: market.id,
            amount: betAmount,
            outcome: outcome,
            limitProb: outcome === 'YES' ? currentProb + 0.02 : currentProb - 0.02, // 2% limit
          }),
        });
        
        if (!betRes.ok) {
          const errorText = await betRes.text();
          results.push({ marketId: market.id, success: false, error: errorText });
          continue;
        }
        
        const betResult = await betRes.json();
        results.push({ marketId: market.id, success: true, betId: betResult.betId });
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return new Response(
        JSON.stringify({
          success: successCount > 0,
          message: `Executed ${successCount}/${markets.length} trades`,
          opportunityId,
          results,
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
