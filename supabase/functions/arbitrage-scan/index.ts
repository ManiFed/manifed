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

interface MarketMetadata {
  subject: string | null;
  predicate: string | null;
  year: string | null;
  timeWindow: { start?: number; end?: number } | null;
  category: string;
  categoryTags: string[];
  closeDate: number | null;
  closeDateScore: number; // 0-100, higher = closing sooner
  liquidityScore: number;
  activityScore: number;
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
    closeTime?: number;
    category?: string;
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
  confidence: 'high' | 'medium' | 'low';
  closeDateScore?: number;
  categoryMatch?: boolean;
  canonicalEvent?: string;
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
  includeAllMarketTypes: boolean;
  focusThemes: string[];
  focusCategories: string[];
  prioritizeNearClosing: boolean;
  lastScanCursor?: string;
}

// ============= STRUCTURED METADATA EXTRACTION =============

function extractMarketMetadata(market: ManifoldMarket): MarketMetadata {
  const lowerQ = market.question.toLowerCase();
  const slugs = market.groupSlugs || [];
  
  // Extract subject (names, entities)
  const subjectPatterns = [
    /\b(trump|biden|harris|vance|desantis|haley|pence|obama|newsom|sanders|musk|bezos|zuckerberg|altman|pichai|nadella|putin|zelensky|xi|modi|macron|scholz|starmer|sunak)\b/i,
    /\b(openai|google|microsoft|meta|apple|amazon|tesla|nvidia|spacex|anthropic)\b/i,
    /\b(bitcoin|btc|ethereum|eth|solana|dogecoin)\b/i,
    /\b(republicans?|democrats?|gop|dnc)\b/i,
  ];
  
  let subject: string | null = null;
  for (const pattern of subjectPatterns) {
    const match = lowerQ.match(pattern);
    if (match) {
      subject = match[1].toLowerCase();
      break;
    }
  }
  
  // Extract predicate (what will happen)
  const predicateCategories: Record<string, RegExp> = {
    'win_election': /\b(win|wins|winning|won|victory|elected|become president|next president)\b.*\b(election|president|presidency|governor|senate|congress|primary|nomination)\b/i,
    'nomination': /\b(nominate|nominated|nomination|nominee|select|selected|endorse|endorsed)\b/i,
    'win_competition': /\b(win|wins|winning|won|champion|victory|defeat)\b.*\b(super bowl|world cup|championship|olympics|finals|series|game|match)\b/i,
    'price_reach': /\b(reach|reaches|reached|hit|hits|surpass|exceed|above|below)\b.*\b(\$|usd|price|value|market cap)\b/i,
    'pass_legislation': /\b(pass|passed|passing|enact|enacted|approve|approved|sign|signed)\b.*\b(bill|law|legislation|act)\b/i,
    'fail_reject': /\b(fail|failed|failing|reject|rejected|veto|vetoed|impeach|removed)\b/i,
    'happen_occur': /\b(happen|occur|will there be|will .* be)\b/i,
    'release_launch': /\b(release|released|launch|launched|announce|announced|ship|shipped)\b/i,
  };
  
  let predicate: string | null = null;
  for (const [category, pattern] of Object.entries(predicateCategories)) {
    if (pattern.test(lowerQ)) {
      predicate = category;
      break;
    }
  }
  
  // Extract year
  const yearMatch = lowerQ.match(/\b(202\d)\b/);
  const year = yearMatch ? yearMatch[1] : null;
  
  // Extract time window
  let timeWindow: { start?: number; end?: number } | null = null;
  const byEndMatch = lowerQ.match(/by\s+(end\s+of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})?/i);
  const beforeMatch = lowerQ.match(/before\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d+)?/i);
  
  if (byEndMatch || beforeMatch) {
    // Has time constraint
    timeWindow = { end: market.closeTime };
  }
  
  // Determine category from slugs and keywords
  const categoryMap: Record<string, { keywords: RegExp; slugPatterns: RegExp }> = {
    'politics_us': { 
      keywords: /president|congress|senate|governor|election|democrat|republican|primary|ballot|vote|impeach/i,
      slugPatterns: /us-politics|elections|congress|senate|presidential/i
    },
    'politics_intl': {
      keywords: /parliament|prime minister|eu\b|brexit|nato|un\b|summit|diplomacy/i,
      slugPatterns: /world-politics|international|europe|asia/i
    },
    'sports': {
      keywords: /super bowl|world cup|olympics|nfl|nba|mlb|nhl|fifa|championship|playoff|win.*game|beat/i,
      slugPatterns: /sports|nfl|nba|soccer|baseball|football|basketball/i
    },
    'crypto': {
      keywords: /bitcoin|btc|ethereum|eth|crypto|token|blockchain|defi|nft/i,
      slugPatterns: /crypto|bitcoin|ethereum|defi|web3/i
    },
    'tech': {
      keywords: /openai|gpt|claude|llm|ai model|artificial intelligence|agi|launch|release|product/i,
      slugPatterns: /tech|ai|startups|companies/i
    },
    'entertainment': {
      keywords: /oscar|grammy|emmy|golden globe|award|box office|movie|film|album|song/i,
      slugPatterns: /entertainment|movies|music|awards/i
    },
    'geopolitics': {
      keywords: /war|invasion|attack|military|nato|ukraine|russia|china|taiwan|iran|israel|conflict/i,
      slugPatterns: /geopolitics|war|military|international/i
    },
    'science': {
      keywords: /nasa|spacex|launch|orbit|mars|moon|vaccine|fda|drug|trial|study/i,
      slugPatterns: /science|space|medicine|research/i
    },
    'economics': {
      keywords: /gdp|inflation|recession|fed|interest rate|unemployment|stock|market|s&p|dow|nasdaq/i,
      slugPatterns: /economics|finance|markets|stocks/i
    },
  };
  
  let category = 'general';
  const categoryTags: string[] = [];
  
  for (const [cat, { keywords, slugPatterns }] of Object.entries(categoryMap)) {
    if (keywords.test(lowerQ) || slugs.some(s => slugPatterns.test(s))) {
      if (category === 'general') category = cat;
      categoryTags.push(cat);
    }
  }
  
  // Add slug-based tags
  for (const slug of slugs) {
    if (slug && !categoryTags.includes(slug)) {
      categoryTags.push(slug);
    }
  }
  
  // Calculate close date score (0-100, higher = closing sooner)
  let closeDateScore = 0;
  const closeDate = market.closeTime || null;
  if (closeDate) {
    const now = Date.now();
    const daysUntilClose = (closeDate - now) / (1000 * 60 * 60 * 24);
    if (daysUntilClose <= 0) {
      closeDateScore = 0; // Already closed
    } else if (daysUntilClose <= 7) {
      closeDateScore = 100; // Very near
    } else if (daysUntilClose <= 30) {
      closeDateScore = 80;
    } else if (daysUntilClose <= 90) {
      closeDateScore = 60;
    } else if (daysUntilClose <= 180) {
      closeDateScore = 40;
    } else if (daysUntilClose <= 365) {
      closeDateScore = 20;
    } else {
      closeDateScore = 10;
    }
  }
  
  // Calculate liquidity score
  const liquidity = market.totalLiquidity || 0;
  const volume = market.volume || 0;
  const bettors = market.uniqueBettorCount || 0;
  const liquidityScore = Math.min(100, (
    Math.log10(liquidity + 1) * 30 +
    Math.log10(volume + 1) * 40 +
    Math.min(bettors, 100) * 0.3
  ));
  
  // Calculate activity score (recent activity)
  const volume24h = market.volume24Hours || 0;
  const activityScore = Math.min(100, Math.log10(volume24h + 1) * 40);
  
  return {
    subject,
    predicate,
    year,
    timeWindow,
    category,
    categoryTags,
    closeDate,
    closeDateScore,
    liquidityScore,
    activityScore,
  };
}

// ============= TOPIC BUCKETING WITH STRUCTURED METADATA =============

function getStructuredBuckets(market: ManifoldMarket, metadata: MarketMetadata): string[] {
  const buckets: string[] = [];
  
  // Primary bucket: category
  buckets.push(`cat_${metadata.category}`);
  
  // Subject bucket if available
  if (metadata.subject) {
    buckets.push(`subj_${metadata.subject}`);
  }
  
  // Predicate bucket if available
  if (metadata.predicate) {
    buckets.push(`pred_${metadata.predicate}`);
  }
  
  // Year bucket
  if (metadata.year) {
    buckets.push(`year_${metadata.year}`);
  }
  
  // Composite bucket: subject + predicate + year (most specific)
  if (metadata.subject && metadata.predicate) {
    const composite = `${metadata.subject}_${metadata.predicate}${metadata.year ? '_' + metadata.year : ''}`;
    buckets.push(`event_${composite}`);
  }
  
  // Add category tags as buckets
  for (const tag of metadata.categoryTags.slice(0, 3)) {
    buckets.push(`tag_${tag}`);
  }
  
  // Close time bucket (for finding related markets closing together)
  if (metadata.closeDate) {
    const closeMonth = new Date(metadata.closeDate);
    const monthKey = `${closeMonth.getFullYear()}_${String(closeMonth.getMonth() + 1).padStart(2, '0')}`;
    buckets.push(`close_${monthKey}`);
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

function matchesFocusFilters(market: ManifoldMarket, metadata: MarketMetadata, config: ScanConfig): boolean {
  // If no focus filters, include all
  if (config.focusThemes.length === 0 && config.focusCategories.length === 0) {
    return true;
  }
  
  const lowerQ = market.question.toLowerCase();
  const desc = (market.textDescription || '').toLowerCase();
  
  // Check theme matches
  for (const theme of config.focusThemes) {
    const themeLower = theme.toLowerCase();
    if (lowerQ.includes(themeLower) || desc.includes(themeLower)) {
      return true;
    }
    if (metadata.subject && metadata.subject.includes(themeLower)) {
      return true;
    }
  }
  
  // Check category matches
  for (const cat of config.focusCategories) {
    if (metadata.category === cat || metadata.categoryTags.includes(cat)) {
      return true;
    }
  }
  
  return false;
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

// ============= CANONICAL EVENT KEY =============

function getCanonicalEventKey(metadata: MarketMetadata): string | null {
  if (!metadata.subject || !metadata.predicate) return null;
  
  const parts = [metadata.subject, metadata.predicate];
  if (metadata.year) parts.push(metadata.year);
  
  return parts.join('_');
}

// ============= CONFIDENCE CALCULATION =============

function calculateMatchConfidence(
  m1: ManifoldMarket, 
  m2: ManifoldMarket,
  meta1: MarketMetadata,
  meta2: MarketMetadata
): { confidence: 'high' | 'medium' | 'low'; score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  
  // Same subject = +30
  if (meta1.subject && meta1.subject === meta2.subject) {
    score += 30;
    reasons.push(`same subject: ${meta1.subject}`);
  }
  
  // Same predicate = +30
  if (meta1.predicate && meta1.predicate === meta2.predicate) {
    score += 30;
    reasons.push(`same action: ${meta1.predicate}`);
  } else if (meta1.predicate && meta2.predicate) {
    // Different predicates = significant penalty
    score -= 20;
    reasons.push(`different actions: ${meta1.predicate} vs ${meta2.predicate}`);
  }
  
  // Same year = +15
  if (meta1.year && meta1.year === meta2.year) {
    score += 15;
    reasons.push(`same year: ${meta1.year}`);
  } else if (meta1.year && meta2.year && meta1.year !== meta2.year) {
    // Different years = major penalty
    score -= 30;
    reasons.push(`different years: ${meta1.year} vs ${meta2.year}`);
  }
  
  // Same category = +10
  if (meta1.category === meta2.category && meta1.category !== 'general') {
    score += 10;
    reasons.push(`same category: ${meta1.category}`);
  }
  
  // Overlapping category tags = +5 per overlap
  const tagOverlap = meta1.categoryTags.filter(t => meta2.categoryTags.includes(t)).length;
  if (tagOverlap > 0) {
    score += Math.min(15, tagOverlap * 5);
    reasons.push(`${tagOverlap} shared tags`);
  }
  
  // Token overlap check
  const tokens1 = new Set(m1.question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const tokens2 = new Set(m2.question.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = new Set([...tokens1, ...tokens2]).size;
  const tokenOverlap = intersection / union;
  
  if (tokenOverlap > 0.5) {
    score += 15;
    reasons.push(`high word overlap: ${(tokenOverlap * 100).toFixed(0)}%`);
  } else if (tokenOverlap > 0.3) {
    score += 5;
    reasons.push(`moderate word overlap: ${(tokenOverlap * 100).toFixed(0)}%`);
  }
  
  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));
  
  const confidence: 'high' | 'medium' | 'low' = 
    score >= 70 ? 'high' : 
    score >= 40 ? 'medium' : 
    'low';
  
  return {
    confidence,
    score,
    reason: reasons.join(', '),
  };
}

// ============= ARBITRAGE DETECTION =============

function findSemanticPairArbitrage(
  markets: ManifoldMarket[], 
  metadataMap: Map<string, MarketMetadata>,
  config: ScanConfig
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const processedPairs = new Set<string>();
  
  console.log(`Analyzing ${markets.length} eligible markets for semantic pairs`);
  
  // Step 1: Bucket markets using structured metadata
  const bucketedMarkets: Record<string, ManifoldMarket[]> = {};
  
  for (const market of markets) {
    const metadata = metadataMap.get(market.id);
    if (!metadata) continue;
    
    const buckets = getStructuredBuckets(market, metadata);
    for (const bucket of buckets) {
      if (!bucketedMarkets[bucket]) bucketedMarkets[bucket] = [];
      bucketedMarkets[bucket].push(market);
    }
  }
  
  console.log(`Created ${Object.keys(bucketedMarkets).length} structured buckets`);
  
  // Sort buckets by priority (event_ buckets first, then subject_, etc.)
  const sortedBuckets = Object.entries(bucketedMarkets)
    .sort((a, b) => {
      // Prioritize composite event buckets
      if (a[0].startsWith('event_') && !b[0].startsWith('event_')) return -1;
      if (!a[0].startsWith('event_') && b[0].startsWith('event_')) return 1;
      // Then subject buckets
      if (a[0].startsWith('subj_') && !b[0].startsWith('subj_')) return -1;
      if (!a[0].startsWith('subj_') && b[0].startsWith('subj_')) return 1;
      // Then by size (smaller = more focused)
      return a[1].length - b[1].length;
    });
  
  // Step 2: Compare within buckets
  for (const [bucket, bucketMarkets] of sortedBuckets) {
    if (bucketMarkets.length < 2 || bucketMarkets.length > 150) continue;
    
    // Sort by liquidity within bucket
    const sorted = [...bucketMarkets].sort((a, b) => 
      (b.totalLiquidity || 0) - (a.totalLiquidity || 0)
    );
    
    // Shuffle top portion for variety
    const topN = Math.min(50, sorted.length);
    const top = shuffleArray(sorted.slice(0, topN));
    const rest = sorted.slice(topN);
    const shuffled = [...top, ...rest];
    
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < Math.min(shuffled.length, i + 40); j++) {
        const m1 = shuffled[i];
        const m2 = shuffled[j];
        
        const pairKey = [m1.id, m2.id].sort().join(':');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        const meta1 = metadataMap.get(m1.id);
        const meta2 = metadataMap.get(m2.id);
        if (!meta1 || !meta2) continue;
        
        // Calculate structured match confidence
        const matchResult = calculateMatchConfidence(m1, m2, meta1, meta2);
        
        // Skip low confidence matches unless they have very different probabilities
        if (matchResult.confidence === 'low') continue;
        
        const p1 = m1.probability || 0.5;
        const p2 = m2.probability || 0.5;
        
        const threshold = calculateDynamicThreshold(m1, m2, config);
        
        // For equivalent questions: arbitrage if buying YES in one + NO in other < 1
        const yesNo = p1 + (1 - p2);
        const noYes = (1 - p1) + p2;
        const minCost = Math.min(yesNo, noYes);
        
        // Adjust threshold based on confidence
        const confidenceMultiplier = 
          matchResult.confidence === 'high' ? 1.0 :
          matchResult.confidence === 'medium' ? 1.5 :
          2.0;
        
        const adjustedThreshold = threshold * confidenceMultiplier;
        
        if (minCost < 1 - adjustedThreshold) {
          const profitMargin = (1 - minCost) * 100;
          const priceImpact = estimatePriceImpact(m1, 50) + estimatePriceImpact(m2, 50);
          
          const canonicalEvent = getCanonicalEventKey(meta1) || getCanonicalEventKey(meta2);
          const categoryMatch = meta1.category === meta2.category && meta1.category !== 'general';
          const avgCloseScore = (meta1.closeDateScore + meta2.closeDateScore) / 2;
          
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
                action: yesNo < noYes ? 'BUY_YES' : 'BUY_NO',
                closeTime: m1.closeTime,
                category: meta1.category,
              },
              { 
                id: m2.id, 
                question: m2.question, 
                probability: p2, 
                url: m2.url, 
                liquidity: m2.totalLiquidity, 
                volume: m2.volume, 
                action: yesNo < noYes ? 'BUY_NO' : 'BUY_YES',
                closeTime: m2.closeTime,
                category: meta2.category,
              },
            ],
            expectedProfit: profitMargin * (1 - priceImpact),
            maxLoss: 0,
            expectedVariance: profitMargin * priceImpact,
            requiredCapital: 100,
            riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
            description: `${matchResult.confidence.toUpperCase()} match: ${matchResult.reason} | ${(profitMargin).toFixed(1)}% spread`,
            status: 'pending',
            dynamicThreshold: threshold,
            liquidityScore: (meta1.liquidityScore + meta2.liquidityScore) / 2,
            similarityScore: matchResult.score / 100,
            priceImpactEstimate: priceImpact,
            matchReason: matchResult.reason,
            confidence: matchResult.confidence,
            closeDateScore: avgCloseScore,
            categoryMatch,
            canonicalEvent: canonicalEvent || undefined,
          });
        }
      }
    }
  }
  
  return opportunities;
}

function findExhaustiveSetArbitrage(
  markets: ManifoldMarket[], 
  metadataMap: Map<string, MarketMetadata>,
  config: ScanConfig
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  // Include MULTIPLE_CHOICE markets
  const multiChoiceMarkets = markets.filter(m => 
    m.outcomeType === 'MULTIPLE_CHOICE' && m.answers && m.answers.length >= 2
  );

  console.log(`Found ${multiChoiceMarkets.length} multiple choice markets`);

  // Sort by liquidity and activity
  const sorted = multiChoiceMarkets.sort((a, b) => {
    const scoreA = (a.totalLiquidity || 0) + (a.volume24Hours || 0) * 2;
    const scoreB = (b.totalLiquidity || 0) + (b.volume24Hours || 0) * 2;
    return scoreB - scoreA;
  });

  for (const market of sorted) {
    if ((market.totalLiquidity || 0) < config.minLiquidity) continue;
    
    const metadata = metadataMap.get(market.id);
    if (!metadata) continue;

    const totalProb = market.answers!.reduce((sum, a) => sum + a.probability, 0);
    const threshold = calculateDynamicThreshold(market, undefined, config);
    
    if (Math.abs(totalProb - 1) > threshold) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      const priceImpact = estimatePriceImpact(market, 50);
      
      const marketDetails = market.answers!.map(a => ({
        id: `${market.id}_${a.id}`,
        question: `${market.question} → ${a.text}`,
        probability: a.probability,
        url: market.url,
        liquidity: market.totalLiquidity,
        volume: market.volume,
        action: (totalProb > 1 ? 'BUY_NO' : 'BUY_YES') as 'BUY_YES' | 'BUY_NO',
        closeTime: market.closeTime,
        category: metadata.category,
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
        liquidityScore: metadata.liquidityScore,
        priceImpactEstimate: priceImpact,
        confidence: deviation > 0.1 ? 'high' : deviation > 0.05 ? 'medium' : 'low',
        closeDateScore: metadata.closeDateScore,
        categoryMatch: true,
      });
    }
  }

  return opportunities;
}

function findMultiMarketArbitrage(
  markets: ManifoldMarket[], 
  metadataMap: Map<string, MarketMetadata>,
  config: ScanConfig
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Group markets by canonical event key
  const groupedMarkets: Record<string, ManifoldMarket[]> = {};
  
  for (const market of markets) {
    if (market.outcomeType !== 'BINARY') continue;
    
    const metadata = metadataMap.get(market.id);
    if (!metadata) continue;
    
    const eventKey = getCanonicalEventKey(metadata);
    if (!eventKey) continue;
    
    if (!groupedMarkets[eventKey]) groupedMarkets[eventKey] = [];
    groupedMarkets[eventKey].push(market);
  }
  
  for (const [groupKey, groupMarkets] of Object.entries(groupedMarkets)) {
    if (groupMarkets.length < 2 || groupMarkets.length > 20) continue;
    
    // Calculate total probability
    const totalProb = groupMarkets.reduce((sum, m) => sum + (m.probability || 0.5), 0);
    const threshold = 0.03 * Math.sqrt(groupMarkets.length); // Scale sublinearly
    
    // Check if probabilities are inconsistent
    if (Math.abs(totalProb - 1) > threshold) {
      const deviation = Math.abs(totalProb - 1);
      const profitMargin = deviation * 100;
      const avgLiquidity = groupMarkets.reduce((sum, m) => sum + (m.totalLiquidity || 0), 0) / groupMarkets.length;
      const priceImpact = groupMarkets.reduce((sum, m) => sum + estimatePriceImpact(m, 50 / groupMarkets.length), 0);
      
      const firstMeta = metadataMap.get(groupMarkets[0].id);
      
      opportunities.push({
        id: `mm_${groupKey}_${groupMarkets[0].id}`,
        type: 'multi_market',
        markets: groupMarkets.map(m => {
          const meta = metadataMap.get(m.id);
          return {
            id: m.id,
            question: m.question,
            probability: m.probability || 0.5,
            url: m.url,
            liquidity: m.totalLiquidity,
            volume: m.volume,
            action: (totalProb > 1 ? 'BUY_NO' : 'BUY_YES') as 'BUY_YES' | 'BUY_NO',
            closeTime: m.closeTime,
            category: meta?.category,
          };
        }),
        expectedProfit: profitMargin * (1 - priceImpact),
        maxLoss: profitMargin * 0.1,
        expectedVariance: profitMargin * priceImpact * 1.5,
        requiredCapital: 100 * groupMarkets.length,
        riskLevel: deviation > 0.15 ? 'low' : deviation > 0.08 ? 'medium' : 'high',
        description: `Multi-market "${groupKey}" (${groupMarkets.length} markets) sums to ${(totalProb * 100).toFixed(1)}%`,
        status: 'pending',
        dynamicThreshold: threshold,
        liquidityScore: avgLiquidity > 500 ? 80 : avgLiquidity > 100 ? 50 : 20,
        priceImpactEstimate: priceImpact,
        confidence: deviation > 0.15 ? 'high' : deviation > 0.08 ? 'medium' : 'low',
        closeDateScore: firstMeta?.closeDateScore,
        canonicalEvent: groupKey,
      });
    }
  }
  
  return opportunities;
}

// ============= MARKET FETCHING (FULL PAGINATION) =============

async function fetchAllMarkets(config: ScanConfig): Promise<ManifoldMarket[]> {
  const allMarkets: ManifoldMarket[] = [];
  const batchSize = 1000;
  let offset = 0;
  let consecutiveEmpty = 0;
  const maxEmpty = 5;
  const seenIds = new Set<string>();
  
  // Use cursor-based pagination with various sort orders
  const sortOptions = ['liquidity', 'newest', 'score', '24-hour-vol'];
  
  console.log(`Starting FULL market fetch (no caps, all market types)...`);
  
  // Fetch from multiple sort orders to get broader coverage
  for (const sortOrder of sortOptions) {
    offset = 0;
    consecutiveEmpty = 0;
    let sortFetched = 0;
    
    console.log(`Fetching with sort: ${sortOrder}...`);
    
    while (consecutiveEmpty < maxEmpty) {
      // Include all market types: binary, multiple choice, numeric, etc.
      const url = `https://api.manifold.markets/v0/search-markets?limit=${batchSize}&offset=${offset}&filter=open&sort=${sortOrder}`;
      
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
        
        // Deduplicate
        let newCount = 0;
        for (const market of markets) {
          if (!seenIds.has(market.id)) {
            seenIds.add(market.id);
            allMarkets.push(market);
            newCount++;
          }
        }
        
        sortFetched += newCount;
        offset += batchSize;
        
        console.log(`[${sortOrder}] Fetched ${allMarkets.length} unique markets (${newCount} new this batch)`);
        
        // If getting mostly duplicates, move to next sort order
        if (newCount < batchSize * 0.1 && offset > batchSize * 3) {
          console.log(`[${sortOrder}] Diminishing returns, moving to next sort order`);
          break;
        }
        
        // Stop if we hit the API limit or have enough
        if (markets.length < batchSize * 0.3) {
          console.log(`[${sortOrder}] Partial batch received, likely near end`);
          break;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('Fetch error:', error);
        break;
      }
    }
    
    console.log(`[${sortOrder}] Total from this sort: ${sortFetched}`);
    
    // Small delay between sort orders
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`Finished fetching ${allMarkets.length} total unique markets`);
  return allMarkets;
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
      console.log("Starting comprehensive arbitrage scan for user:", user.id);

      const config: ScanConfig = {
        minLiquidity: userConfig?.minLiquidity ?? 50,
        minVolume: userConfig?.minVolume ?? 10,
        baseThreshold: userConfig?.baseThreshold ?? 0.02,
        dynamicThresholdEnabled: userConfig?.dynamicThresholdEnabled ?? true,
        semanticMatchingEnabled: userConfig?.semanticMatchingEnabled ?? true,
        dryRun: userConfig?.dryRun ?? true,
        fullScan: userConfig?.fullScan ?? true, // Default to full scan now
        maxMarkets: userConfig?.maxMarkets ?? 50000, // Effectively unlimited
        includeAllMarketTypes: userConfig?.includeAllMarketTypes ?? true,
        focusThemes: userConfig?.focusThemes ?? [],
        focusCategories: userConfig?.focusCategories ?? [],
        prioritizeNearClosing: userConfig?.prioritizeNearClosing ?? false,
      };

      console.log("Scan config:", config);

      // Fetch ALL markets (no artificial cap)
      const allMarkets = await fetchAllMarkets(config);
      console.log(`Fetched ${allMarkets.length} total markets`);

      // Extract metadata for all markets
      const metadataMap = new Map<string, MarketMetadata>();
      for (const market of allMarkets) {
        metadataMap.set(market.id, extractMarketMetadata(market));
      }
      
      // Filter tradeable markets
      let tradeableMarkets = allMarkets.filter(m => isTradeable(m) && hasObjectiveResolution(m));
      console.log(`${tradeableMarkets.length} tradeable markets with objective resolution`);
      
      // Apply focus filters if specified
      if (config.focusThemes.length > 0 || config.focusCategories.length > 0) {
        tradeableMarkets = tradeableMarkets.filter(m => {
          const metadata = metadataMap.get(m.id);
          return metadata && matchesFocusFilters(m, metadata, config);
        });
        console.log(`${tradeableMarkets.length} markets after focus filter`);
      }
      
      // Apply minimum filters
      const filteredMarkets = tradeableMarkets.filter(m => 
        (m.totalLiquidity || 0) >= config.minLiquidity &&
        (m.volume || 0) >= config.minVolume
      );
      console.log(`${filteredMarkets.length} markets meeting liquidity/volume requirements`);

      // Find opportunities
      const exhaustiveSetOpps = findExhaustiveSetArbitrage(filteredMarkets, metadataMap, config);
      console.log(`Found ${exhaustiveSetOpps.length} exhaustive set opportunities`);
      
      const multiMarketOpps = findMultiMarketArbitrage(filteredMarkets, metadataMap, config);
      console.log(`Found ${multiMarketOpps.length} multi-market opportunities`);
      
      let semanticPairOpps: ArbitrageOpportunity[] = [];
      if (config.semanticMatchingEnabled) {
        semanticPairOpps = findSemanticPairArbitrage(filteredMarkets, metadataMap, config);
        console.log(`Found ${semanticPairOpps.length} semantic pair opportunities`);
      }

      const allOpportunities = [...exhaustiveSetOpps, ...multiMarketOpps, ...semanticPairOpps];
      
      // Score and sort opportunities
      const scoredOpportunities = allOpportunities.map(opp => {
        let score = (opp.expectedProfit - opp.maxLoss) / (opp.expectedVariance + 1) * opp.liquidityScore / 100;
        
        // Boost high confidence matches
        if (opp.confidence === 'high') score *= 1.5;
        else if (opp.confidence === 'medium') score *= 1.0;
        else score *= 0.5;
        
        // Boost if prioritizing near-closing
        if (config.prioritizeNearClosing && opp.closeDateScore) {
          score *= 1 + (opp.closeDateScore / 200);
        }
        
        // Boost category matches
        if (opp.categoryMatch) score *= 1.1;
        
        return { ...opp, score };
      });
      
      // Sort by score and limit output
      const opportunities = scoredOpportunities
        .sort((a, b) => b.score - a.score)
        .slice(0, 150)
        .map(({ score, ...opp }) => opp);

      // Separate by confidence for frontend
      const highConfidence = opportunities.filter(o => o.confidence === 'high');
      const mediumConfidence = opportunities.filter(o => o.confidence === 'medium');
      const lowConfidence = opportunities.filter(o => o.confidence === 'low');

      console.log(`Returning ${opportunities.length} opportunities (${highConfidence.length} high, ${mediumConfidence.length} medium, ${lowConfidence.length} low confidence)`);

      return new Response(
        JSON.stringify({
          success: true,
          marketsScanned: allMarkets.length,
          tradeableMarkets: tradeableMarkets.length,
          filteredMarkets: filteredMarkets.length,
          opportunities,
          opportunitiesByConfidence: {
            high: highConfidence.length,
            medium: mediumConfidence.length,
            low: lowConfidence.length,
          },
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

      let apiKey: string;
      
      // Check if API key is encrypted (contains ':' separator) or legacy plaintext
      if (settings.manifold_api_key.includes(':')) {
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

        apiKey = new TextDecoder().decode(decrypted);
      } else {
        // Legacy plaintext API key
        console.log("Using legacy plaintext API key");
        apiKey = settings.manifold_api_key;
      }

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
