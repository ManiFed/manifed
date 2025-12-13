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
  matchReason?: string;
}

interface ScanConfig {
  minLiquidity: number;
  minVolume: number;
  baseThreshold: number;
  dynamicThresholdEnabled: boolean;
  semanticMatchingEnabled: boolean;
  dryRun: boolean;
  fullScan: boolean;
  maxMarkets: number;
}

// ============= TOPIC BUCKETING (Scalable Pre-filtering) =============

function getTopicBuckets(market: ManifoldMarket): string[] {
  const buckets: string[] = [];
  const lowerQ = market.question.toLowerCase();
  const slugs = market.groupSlugs || [];
  
  // Check slugs first (high quality)
  if (slugs.some(s => /election|politic|congress|senate|president/i.test(s))) {
    buckets.push('politics');
  }
  if (slugs.some(s => /sport|nfl|nba|soccer|baseball|football/i.test(s))) {
    buckets.push('sports');
  }
  if (slugs.some(s => /crypto|bitcoin|ethereum|defi/i.test(s))) {
    buckets.push('crypto');
  }
  if (slugs.some(s => /tech|ai|company|startup/i.test(s))) {
    buckets.push('tech');
  }
  
  // Keyword-based bucketing
  if (/president|elect|nominate|vote|congress|senate|governor|republican|democrat|primary|ballot/i.test(lowerQ)) {
    if (!buckets.includes('politics')) buckets.push('politics');
  }
  if (/super bowl|world cup|olympics|championship|playoff|nfl|nba|mlb|nhl|fifa|win.*game|beat/i.test(lowerQ)) {
    if (!buckets.includes('sports')) buckets.push('sports');
  }
  if (/bitcoin|btc|ethereum|eth|crypto|token|blockchain|defi/i.test(lowerQ)) {
    if (!buckets.includes('crypto')) buckets.push('crypto');
  }
  if (/openai|gpt|claude|llm|ai model|artificial intelligence|agi/i.test(lowerQ)) {
    buckets.push('ai');
  }
  if (/oscar|grammy|emmy|golden globe|award|box office|movie|film/i.test(lowerQ)) {
    buckets.push('entertainment');
  }
  if (/war|invasion|attack|military|nato|ukraine|russia|china|taiwan|iran|israel/i.test(lowerQ)) {
    buckets.push('geopolitics');
  }
  
  // Year extraction as bucket dimension  
  const yearMatch = lowerQ.match(/\b(202\d)\b/);
  if (yearMatch) {
    buckets.push(`year_${yearMatch[1]}`);
  }
  
  // Entity extraction for finer bucketing
  const entityPatterns = [
    /trump|biden|harris|vance|desantis|haley|pence|obama|newsom|sanders/i,
    /musk|bezos|zuckerberg|altman|pichai|nadella/i,
  ];
  for (const pattern of entityPatterns) {
    const match = lowerQ.match(pattern);
    if (match) {
      buckets.push(`entity_${match[0].toLowerCase()}`);
    }
  }
  
  if (buckets.length === 0) {
    buckets.push('general');
  }
  
  return [...new Set(buckets)];
}

// ============= MARKET VALIDATION =============

function hasObjectiveResolution(market: ManifoldMarket): boolean {
  const subjectiveKeywords = [
    'subjective', 'opinion', 'feel', 'think', 'believe',
    'best', 'worst', 'favorite', 'prefer', 'personally',
    'vibes', 'seems', 'might', 'probably', 'i think',
    'my prediction', 'personal market'
  ];
  
  const text = (market.question + ' ' + (market.textDescription || '')).toLowerCase();
  return !subjectiveKeywords.some(keyword => text.includes(keyword));
}

function isTradeable(market: ManifoldMarket): boolean {
  if (market.isResolved) return false;
  if (market.resolution) return false;
  if (market.closeTime && market.closeTime < Date.now()) return false;
  return true;
}

// ============= DYNAMIC THRESHOLD CALCULATION =============

function calculateDynamicThreshold(market1: ManifoldMarket, market2?: ManifoldMarket, config?: ScanConfig): number {
  const baseFee = 0.005;
  const baseThreshold = config?.baseThreshold || 0.02;
  
  const liq1 = market1.totalLiquidity || 100;
  const liq2 = market2?.totalLiquidity || liq1;
  const minLiquidity = Math.min(liq1, liq2);
  
  const liquidityFactor = Math.max(0.5, Math.min(2.5, 500 / (minLiquidity + 100)));
  
  const vol1 = market1.volume24Hours || 0;
  const vol2 = market2?.volume24Hours || vol1;
  const avgVolume = (vol1 + vol2) / 2;
  const volumeFactor = avgVolume > 200 ? 0.7 : avgVolume > 100 ? 0.8 : avgVolume > 50 ? 0.9 : 1.0;
  
  const bettors1 = market1.uniqueBettorCount || 0;
  const bettors2 = market2?.uniqueBettorCount || bettors1;
  const avgBettors = (bettors1 + bettors2) / 2;
  const bettorFactor = avgBettors > 100 ? 1.2 : avgBettors > 50 ? 1.1 : 1.0;
  
  return (baseThreshold + baseFee) * liquidityFactor * volumeFactor * bettorFactor;
}

function estimatePriceImpact(market: ManifoldMarket, betAmount: number): number {
  const liquidity = market.totalLiquidity || 100;
  const impactFactor = betAmount / (liquidity + betAmount);
  return impactFactor * 0.5;
}

function calculateLiquidityScore(market: ManifoldMarket): number {
  const liquidity = market.totalLiquidity || 0;
  const volume = market.volume || 0;
  const bettors = market.uniqueBettorCount || 0;
  
  const score = (
    Math.log10(liquidity + 1) * 30 +
    Math.log10(volume + 1) * 40 +
    Math.min(bettors, 100) * 0.3
  );
  
  return Math.min(100, score);
}

// ============= LIGHTWEIGHT LOCAL MATCHING =============

// Extract canonical event components without AI
function extractLocalCanonical(question: string): {
  subject: string | null;
  verb: string | null;
  year: string | null;
  qualifier: string | null;
} {
  const lowerQ = question.toLowerCase();
  
  // Extract year
  const yearMatch = lowerQ.match(/\b(202\d)\b/);
  const year = yearMatch ? yearMatch[1] : null;
  
  // Extract subject (names)
  const namePatterns = /\b(trump|biden|harris|vance|desantis|haley|pence|obama|musk|bezos|zuckerberg|newsom|sanders)\b/i;
  const subjectMatch = lowerQ.match(namePatterns);
  const subject = subjectMatch ? subjectMatch[1].toLowerCase() : null;
  
  // Extract verb category
  const verbCategories: Record<string, RegExp> = {
    'win': /\b(win|wins|winning|won|victory|victorious|clinch|capture|secure|take|takes)\b/i,
    'nominate': /\b(nominate|nominated|nomination|nominee|select|selected)\b/i,
    'elect': /\b(elect|elected|election|become president)\b/i,
    'pass': /\b(pass|passed|passing|enact|enacted|approve|approved)\b/i,
    'fail': /\b(fail|failed|failing|reject|rejected|veto|vetoed)\b/i,
    'reach': /\b(reach|reaches|reached|hit|hits|surpass|exceed)\b/i,
  };
  
  let verb: string | null = null;
  for (const [category, pattern] of Object.entries(verbCategories)) {
    if (pattern.test(lowerQ)) {
      verb = category;
      break;
    }
  }
  
  // Extract qualifiers
  let qualifier: string | null = null;
  if (/primary/i.test(lowerQ)) qualifier = 'primary';
  else if (/general election/i.test(lowerQ)) qualifier = 'general';
  else if (/first round/i.test(lowerQ)) qualifier = 'first_round';
  else if (/runoff/i.test(lowerQ)) qualifier = 'runoff';
  
  return { subject, verb, year, qualifier };
}

// Check if two markets could be equivalent based on local extraction
function areLocallyEquivalent(m1: ManifoldMarket, m2: ManifoldMarket): {
  possible: boolean;
  confidence: number;
  reason: string;
} {
  const c1 = extractLocalCanonical(m1.question);
  const c2 = extractLocalCanonical(m2.question);
  
  // Must have same subject
  if (c1.subject && c2.subject && c1.subject !== c2.subject) {
    return { possible: false, confidence: 0, reason: `Different subjects: ${c1.subject} vs ${c2.subject}` };
  }
  
  // Must have same year
  if (c1.year && c2.year && c1.year !== c2.year) {
    return { possible: false, confidence: 0, reason: `Different years: ${c1.year} vs ${c2.year}` };
  }
  
  // CRITICAL: Different verbs = different events
  if (c1.verb && c2.verb && c1.verb !== c2.verb) {
    return { possible: false, confidence: 0, reason: `Different event types: ${c1.verb} vs ${c2.verb}` };
  }
  
  // Different qualifiers = different events
  if (c1.qualifier && c2.qualifier && c1.qualifier !== c2.qualifier) {
    return { possible: false, confidence: 0, reason: `Different conditions: ${c1.qualifier} vs ${c2.qualifier}` };
  }
  
  // Calculate token overlap
  const tokens1 = new Set(m1.question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const tokens2 = new Set(m2.question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  const overlap = intersection / union;
  
  if (overlap < 0.3) {
    return { possible: false, confidence: overlap, reason: 'Low token overlap' };
  }
  
  return { 
    possible: true, 
    confidence: overlap,
    reason: `Similar: ${c1.subject || 'unknown'} ${c1.verb || 'event'} ${c1.year || ''}`
  };
}

// ============= ARBITRAGE DETECTION =============

function findSemanticPairArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const processedPairs = new Set<string>();
  
  const eligibleMarkets = markets.filter(m => 
    isTradeable(m) && 
    hasObjectiveResolution(m) && 
    m.outcomeType === 'BINARY' &&
    (m.totalLiquidity || 0) >= config.minLiquidity &&
    (m.volume || 0) >= config.minVolume
  );
  
  console.log(`Analyzing ${eligibleMarkets.length} eligible markets for semantic pairs`);
  
  // Step 1: Bucket markets for scalable comparison
  const bucketedMarkets: Record<string, ManifoldMarket[]> = {};
  
  for (const market of eligibleMarkets) {
    const buckets = getTopicBuckets(market);
    for (const bucket of buckets) {
      if (!bucketedMarkets[bucket]) bucketedMarkets[bucket] = [];
      bucketedMarkets[bucket].push(market);
    }
  }
  
  console.log(`Created ${Object.keys(bucketedMarkets).length} topic buckets`);
  
  // Step 2: Compare only within buckets (reduces O(n²) to manageable)
  for (const [bucket, bucketMarkets] of Object.entries(bucketedMarkets)) {
    if (bucketMarkets.length < 2 || bucketMarkets.length > 100) continue;
    
    // Shuffle to prevent always scanning same markets first
    const shuffled = shuffleArray(bucketMarkets);
    
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < Math.min(shuffled.length, i + 30); j++) { // Limit comparisons per market
        const m1 = shuffled[i];
        const m2 = shuffled[j];
        
        const pairKey = [m1.id, m2.id].sort().join(':');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        // Local equivalence check (fast, no AI)
        const localCheck = areLocallyEquivalent(m1, m2);
        if (!localCheck.possible) continue;
        
        const p1 = m1.probability || 0.5;
        const p2 = m2.probability || 0.5;
        
        const threshold = calculateDynamicThreshold(m1, m2, config);
        
        // For equivalent questions: arbitrage if buying YES in one + NO in other < 1
        const yesNo = p1 + (1 - p2);
        const noYes = (1 - p1) + p2;
        const minCost = Math.min(yesNo, noYes);
        
        if (minCost < 1 - threshold) {
          const profitMargin = (1 - minCost) * 100;
          const priceImpact = estimatePriceImpact(m1, 50) + estimatePriceImpact(m2, 50);
          
          opportunities.push({
            id: `sp_${m1.id}_${m2.id}`,
            type: 'semantic_pair',
            markets: [
              { 
                id: m1.id, 
                question: m1.question, 
                probability: p1, 
                url: m1.url, 
                liquidity: m1.totalLiquidity, 
                volume: m1.volume, 
                action: yesNo < noYes ? 'BUY_YES' : 'BUY_NO' 
              },
              { 
                id: m2.id, 
                question: m2.question, 
                probability: p2, 
                url: m2.url, 
                liquidity: m2.totalLiquidity, 
                volume: m2.volume, 
                action: yesNo < noYes ? 'BUY_NO' : 'BUY_YES' 
              },
            ],
            expectedProfit: profitMargin * (1 - priceImpact),
            maxLoss: 0,
            expectedVariance: profitMargin * priceImpact,
            requiredCapital: 100,
            riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
            description: `Potential equivalent questions (${(localCheck.confidence * 100).toFixed(0)}% overlap) with ${(profitMargin).toFixed(1)}% spread`,
            status: 'pending',
            dynamicThreshold: threshold,
            liquidityScore: calculateLiquidityScore(m1),
            similarityScore: localCheck.confidence,
            priceImpactEstimate: priceImpact,
            matchReason: localCheck.reason,
          });
        }
      }
    }
  }
  
  return opportunities;
}

function findExhaustiveSetArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  // Shuffle to vary which markets are processed first
  const shuffled = shuffleArray(markets);

  for (const market of shuffled) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'MULTIPLE_CHOICE' || !market.answers) continue;
    if ((market.totalLiquidity || 0) < config.minLiquidity) continue;

    const totalProb = market.answers.reduce((sum, a) => sum + a.probability, 0);
    const threshold = calculateDynamicThreshold(market, undefined, config);
    
    if (Math.abs(totalProb - 1) > threshold) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      const priceImpact = estimatePriceImpact(market, 50);
      
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

function findMultiMarketArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Group markets by entity + year for multi-market detection
  const groupedMarkets: Record<string, ManifoldMarket[]> = {};
  
  for (const market of markets) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'BINARY') continue;
    if ((market.totalLiquidity || 0) < config.minLiquidity * 0.5) continue;
    
    const canonical = extractLocalCanonical(market.question);
    if (!canonical.subject || !canonical.verb) continue;
    
    const groupKey = `${canonical.subject}_${canonical.verb}_${canonical.year || 'any'}`;
    if (!groupedMarkets[groupKey]) groupedMarkets[groupKey] = [];
    groupedMarkets[groupKey].push(market);
  }
  
  for (const [groupKey, groupMarkets] of Object.entries(groupedMarkets)) {
    if (groupMarkets.length < 2 || groupMarkets.length > 15) continue;
    
    const totalProb = groupMarkets.reduce((sum, m) => sum + (m.probability || 0.5), 0);
    const threshold = 0.03 * groupMarkets.length;
    
    // Check if probabilities are inconsistent
    if (Math.abs(totalProb - 1) > threshold && groupMarkets.length <= 10) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      const avgLiquidity = groupMarkets.reduce((sum, m) => sum + (m.totalLiquidity || 0), 0) / groupMarkets.length;
      const priceImpact = groupMarkets.reduce((sum, m) => sum + estimatePriceImpact(m, 50 / groupMarkets.length), 0);
      
      opportunities.push({
        id: `mm_${groupKey}_${groupMarkets[0].id}`,
        type: 'multi_market',
        markets: groupMarkets.map(m => ({
          id: m.id,
          question: m.question,
          probability: m.probability || 0.5,
          url: m.url,
          liquidity: m.totalLiquidity,
          volume: m.volume,
          action: (totalProb > 1 ? 'BUY_NO' : 'BUY_YES') as 'BUY_YES' | 'BUY_NO',
        })),
        expectedProfit: profitMargin * (1 - priceImpact),
        maxLoss: profitMargin * 0.1,
        expectedVariance: profitMargin * priceImpact * 1.5,
        requiredCapital: 100 * groupMarkets.length,
        riskLevel: deviation > 0.15 ? 'low' : deviation > 0.08 ? 'medium' : 'high',
        description: `Multi-market group "${groupKey}" (${groupMarkets.length} markets) sums to ${(totalProb * 100).toFixed(1)}%`,
        status: 'pending',
        dynamicThreshold: threshold,
        liquidityScore: avgLiquidity > 500 ? 80 : avgLiquidity > 100 ? 50 : 20,
        priceImpactEstimate: priceImpact,
      });
    }
  }
  
  return opportunities;
}

// ============= MARKET FETCHING =============

async function fetchAllMarkets(maxMarkets: number = 5000): Promise<ManifoldMarket[]> {
  const allMarkets: ManifoldMarket[] = [];
  const batchSize = 500;
  let offset = 0;
  let consecutiveEmpty = 0;
  
  // Randomize sort order to get different markets each scan
  const sortOptions = ['liquidity', 'newest', 'score', '24-hour-vol'];
  const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
  
  console.log(`Starting to fetch up to ${maxMarkets} markets (sorted by ${randomSort})...`);
  
  while (allMarkets.length < maxMarkets && consecutiveEmpty < 3) {
    const url = `https://api.manifold.markets/v0/search-markets?limit=${batchSize}&offset=${offset}&filter=open&sort=${randomSort}`;
    
    console.log(`Fetching batch at offset ${offset}...`);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        break;
      }
      
      const markets: ManifoldMarket[] = await response.json();
      
      if (markets.length === 0) {
        consecutiveEmpty++;
        offset += batchSize;
        continue;
      }
      
      consecutiveEmpty = 0;
      allMarkets.push(...markets);
      offset += batchSize;
      
      console.log(`Fetched ${allMarkets.length} markets so far...`);
      
      if (markets.length < batchSize * 0.5) {
        console.log('Received partial batch, likely near end of results');
        break;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      console.error('Fetch error:', error);
      break;
    }
  }
  
  // Shuffle the final result for additional randomization
  const shuffled = shuffleArray(allMarkets);
  
  console.log(`Finished fetching ${shuffled.length} total markets`);
  return shuffled;
}

// ============= UTILS =============

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============= MAIN HANDLER =============

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

      const config: ScanConfig = {
        minLiquidity: userConfig?.minLiquidity ?? 50,
        minVolume: userConfig?.minVolume ?? 10,
        baseThreshold: userConfig?.baseThreshold ?? 0.02,
        dynamicThresholdEnabled: userConfig?.dynamicThresholdEnabled ?? true,
        semanticMatchingEnabled: userConfig?.semanticMatchingEnabled ?? true,
        dryRun: userConfig?.dryRun ?? true,
        fullScan: userConfig?.fullScan ?? false,
        maxMarkets: userConfig?.maxMarkets ?? 2000,
      };

      console.log("Scan config:", config);

      const maxToFetch = config.fullScan ? 10000 : config.maxMarkets;
      const allMarkets = await fetchAllMarkets(maxToFetch);
      console.log(`Fetched ${allMarkets.length} total markets`);

      const tradeableMarkets = allMarkets.filter(m => isTradeable(m) && hasObjectiveResolution(m));
      console.log(`${tradeableMarkets.length} tradeable markets with objective resolution`);

      const exhaustiveSetOpps = findExhaustiveSetArbitrage(tradeableMarkets, config);
      console.log(`Found ${exhaustiveSetOpps.length} exhaustive set opportunities`);
      
      const multiMarketOpps = findMultiMarketArbitrage(tradeableMarkets, config);
      console.log(`Found ${multiMarketOpps.length} multi-market opportunities`);
      
      let semanticPairOpps: ArbitrageOpportunity[] = [];
      if (config.semanticMatchingEnabled) {
        semanticPairOpps = findSemanticPairArbitrage(tradeableMarkets, config);
        console.log(`Found ${semanticPairOpps.length} semantic pair opportunities`);
      }

      const allOpportunities = [...exhaustiveSetOpps, ...multiMarketOpps, ...semanticPairOpps];
      
      // Score and sort opportunities
      const scoredOpportunities = allOpportunities.map(opp => ({
        ...opp,
        score: (opp.expectedProfit - opp.maxLoss) / (opp.expectedVariance + 1) * opp.liquidityScore / 100
      }));
      
      const opportunities = scoredOpportunities
        .sort((a, b) => b.score - a.score)
        .slice(0, 100)
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

      // Execute trades for each market
      const results = [];
      for (const market of markets) {
        // Fetch current market state
        const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${market.id}`);
        if (!marketResponse.ok) {
          results.push({ market: market.id, success: false, error: 'Failed to fetch market' });
          continue;
        }
        
        const currentMarket = await marketResponse.json();
        const currentProb = currentMarket.probability;
        
        // Check slippage
        const slippage = Math.abs(currentProb - market.probability);
        if (slippage > 0.05) {
          results.push({ market: market.id, success: false, error: `Slippage too high: ${(slippage * 100).toFixed(1)}%` });
          continue;
        }
        
        // Place bet
        const outcome = market.action === 'BUY_YES' ? 'YES' : 'NO';
        const betAmount = market.optimalBet || 50;
        const limitProb = market.action === 'BUY_YES' 
          ? Math.min(0.99, currentProb + 0.05)
          : Math.max(0.01, currentProb - 0.05);
        
        const betResponse = await fetch('https://api.manifold.markets/v0/bet', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contractId: market.id,
            amount: betAmount,
            outcome,
            limitProb,
          }),
        });
        
        if (!betResponse.ok) {
          const errorText = await betResponse.text();
          results.push({ market: market.id, success: false, error: errorText });
        } else {
          const betData = await betResponse.json();
          results.push({ market: market.id, success: true, bet: betData });
        }
        
        // Rate limiting between bets
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const successCount = results.filter(r => r.success).length;
      
      return new Response(
        JSON.stringify({
          success: successCount > 0,
          message: `Executed ${successCount}/${markets.length} trades`,
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
