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

// ============= IMPROVED TEXT PROCESSING =============

const stopWords = new Set([
  'the', 'will', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
  'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'were',
  'they', 'their', 'what', 'when', 'where', 'which', 'who', 'how', 'than',
  'that', 'this', 'these', 'those', 'then', 'some', 'such', 'into', 'other',
  'before', 'after', 'during', 'between', 'under', 'over', 'through', 'about',
  'does', 'did', 'doing', 'would', 'could', 'should', 'might', 'must',
  'being', 'there', 'here', 'from', 'with', 'also', 'just', 'only', 'very',
  'most', 'more', 'less', 'much', 'many', 'any', 'each', 'every', 'both'
]);

// Verb synonym groups - verbs in same group mean equivalent outcomes
const verbSynonymGroups: Record<string, string[]> = {
  'win': ['win', 'wins', 'winning', 'won', 'clinch', 'clinches', 'take', 'takes', 'capture', 'captures', 'secure', 'secures', 'claim', 'claims'],
  'lose': ['lose', 'loses', 'losing', 'lost', 'fall', 'falls', 'drop', 'drops'],
  'nominate': ['nominate', 'nominated', 'nomination', 'select', 'selected', 'selection', 'choose', 'chosen', 'pick', 'picked'],
  'elect': ['elect', 'elected', 'election', 'vote', 'voted'],
  'confirm': ['confirm', 'confirmed', 'approve', 'approved', 'confirmation', 'approval'],
  'pass': ['pass', 'passed', 'passing', 'enact', 'enacted', 'ratify', 'ratified'],
  'fail': ['fail', 'failed', 'failing', 'reject', 'rejected', 'veto', 'vetoed'],
  'announce': ['announce', 'announced', 'reveal', 'revealed', 'disclose', 'disclosed'],
  'resign': ['resign', 'resigned', 'quit', 'quits', 'step down', 'leave', 'leaves'],
  'die': ['die', 'dies', 'died', 'death', 'pass away', 'deceased'],
  'convict': ['convict', 'convicted', 'conviction', 'guilty', 'found guilty'],
  'acquit': ['acquit', 'acquitted', 'acquittal', 'not guilty', 'innocent'],
  'impeach': ['impeach', 'impeached', 'impeachment'],
  'reach': ['reach', 'reaches', 'reached', 'hit', 'hits', 'surpass', 'surpasses', 'exceed', 'exceeds'],
  'beat': ['beat', 'beats', 'beaten', 'defeat', 'defeats', 'defeated', 'overcome', 'overcomes'],
};

// Get canonical verb form
function getCanonicalVerb(word: string): string | null {
  const lowerWord = word.toLowerCase();
  for (const [canonical, synonyms] of Object.entries(verbSynonymGroups)) {
    if (synonyms.includes(lowerWord)) {
      return canonical;
    }
  }
  return null;
}

// Extract year from text
function extractYears(text: string): number[] {
  const yearPattern = /\b(20\d{2})\b/g;
  const matches = text.match(yearPattern);
  return matches ? matches.map(y => parseInt(y)) : [];
}

// Extract entities (proper nouns, names) - simplified NER
function extractEntities(text: string): string[] {
  const entities: string[] = [];
  
  // Common political/public figures patterns
  const namePatterns = [
    /(?:president|senator|governor|secretary|ceo|cto|founder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z]\.?\s+)?[A-Z][a-z]+)/g, // Full names
    /\b(Trump|Biden|Harris|Vance|DeSantis|Haley|Pence|Obama|Clinton|Sanders|Warren|Musk|Bezos|Zuckerberg)\b/gi,
  ];
  
  for (const pattern of namePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      entities.push(match[1]?.toLowerCase() || match[0].toLowerCase());
    }
  }
  
  return [...new Set(entities)];
}

// Extract core action verbs from question
function extractCoreVerbs(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const verbs: string[] = [];
  
  for (const word of words) {
    const canonical = getCanonicalVerb(word);
    if (canonical) {
      verbs.push(canonical);
    }
  }
  
  return [...new Set(verbs)];
}

// Tokenize and normalize text
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Extract qualifiers that change meaning
function extractQualifiers(text: string): Record<string, string> {
  const lowerText = text.toLowerCase();
  const qualifiers: Record<string, string> = {};
  
  // Time qualifiers
  if (lowerText.includes('by ')) {
    const byMatch = lowerText.match(/by\s+(\w+\s+\d{4}|\d{4}|end of \d{4})/);
    if (byMatch) qualifiers.deadline = byMatch[1];
  }
  if (lowerText.includes('before ')) {
    const beforeMatch = lowerText.match(/before\s+(\w+\s+\d{4}|\d{4})/);
    if (beforeMatch) qualifiers.before = beforeMatch[1];
  }
  if (lowerText.includes('after ')) {
    const afterMatch = lowerText.match(/after\s+(\w+\s+\d{4}|\d{4})/);
    if (afterMatch) qualifiers.after = afterMatch[1];
  }
  
  // Round/stage qualifiers
  if (lowerText.includes('first round')) qualifiers.round = 'first';
  if (lowerText.includes('second round')) qualifiers.round = 'second';
  if (lowerText.includes('final round') || lowerText.includes('finals')) qualifiers.round = 'final';
  if (lowerText.includes('general election')) qualifiers.stage = 'general';
  if (lowerText.includes('primary')) qualifiers.stage = 'primary';
  if (lowerText.includes('runoff')) qualifiers.stage = 'runoff';
  
  return qualifiers;
}

// ============= IMPROVED SIMILARITY DETECTION =============

interface QuestionAnalysis {
  tokens: Set<string>;
  entities: string[];
  verbs: string[];
  years: number[];
  qualifiers: Record<string, string>;
  originalText: string;
}

function analyzeQuestion(text: string): QuestionAnalysis {
  return {
    tokens: new Set(tokenize(text)),
    entities: extractEntities(text),
    verbs: extractCoreVerbs(text),
    years: extractYears(text),
    qualifiers: extractQualifiers(text),
    originalText: text,
  };
}

// Calculate n-gram overlap
function calculateNgramSimilarity(text1: string, text2: string, n: number = 3): number {
  const getNgrams = (text: string): Set<string> => {
    const ngrams = new Set<string>();
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, '');
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.add(cleaned.substring(i, i + n));
    }
    return ngrams;
  };
  
  const ngrams1 = getNgrams(text1);
  const ngrams2 = getNgrams(text2);
  
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
  const union = new Set([...ngrams1, ...ngrams2]);
  
  return intersection.size / union.size;
}

// Deep semantic comparison
function areQuestionsEquivalent(q1: QuestionAnalysis, q2: QuestionAnalysis): { 
  isEquivalent: boolean; 
  confidence: number;
  reason: string;
} {
  // Must have overlapping entities
  const sharedEntities = q1.entities.filter(e => q2.entities.some(e2 => e2.includes(e) || e.includes(e2)));
  if (sharedEntities.length === 0 && q1.entities.length > 0 && q2.entities.length > 0) {
    return { isEquivalent: false, confidence: 0, reason: 'No shared entities' };
  }
  
  // Must have same years (or no years in either)
  const years1 = new Set(q1.years);
  const years2 = new Set(q2.years);
  if (years1.size > 0 && years2.size > 0) {
    const sharedYears = [...years1].filter(y => years2.has(y));
    if (sharedYears.length === 0) {
      return { isEquivalent: false, confidence: 0, reason: 'Different years' };
    }
  }
  
  // Check verb compatibility - CRITICAL: different verbs = different questions
  const verbs1 = new Set(q1.verbs);
  const verbs2 = new Set(q2.verbs);
  
  if (verbs1.size > 0 && verbs2.size > 0) {
    const sharedVerbs = [...verbs1].filter(v => verbs2.has(v));
    
    // If different core verbs, NOT equivalent (e.g., "nominate" vs "win")
    if (sharedVerbs.length === 0) {
      // Check if they're opposite verbs
      const oppositePairs = [['win', 'lose'], ['pass', 'fail'], ['convict', 'acquit']];
      for (const [v1, v2] of oppositePairs) {
        if ((verbs1.has(v1) && verbs2.has(v2)) || (verbs1.has(v2) && verbs2.has(v1))) {
          return { isEquivalent: false, confidence: 0, reason: `Opposite verbs: ${v1}/${v2}` };
        }
      }
      return { isEquivalent: false, confidence: 0, reason: `Different core verbs: [${[...verbs1].join(',')}] vs [${[...verbs2].join(',')}]` };
    }
  }
  
  // Check qualifiers - must match or both be absent
  const quals1 = q1.qualifiers;
  const quals2 = q2.qualifiers;
  
  for (const key of Object.keys(quals1)) {
    if (quals2[key] && quals1[key] !== quals2[key]) {
      return { isEquivalent: false, confidence: 0, reason: `Different ${key}: ${quals1[key]} vs ${quals2[key]}` };
    }
  }
  
  // Calculate token overlap
  const intersection = new Set([...q1.tokens].filter(x => q2.tokens.has(x)));
  const union = new Set([...q1.tokens, ...q2.tokens]);
  const jaccardSimilarity = intersection.size / union.size;
  
  // Also check n-gram similarity for ordering
  const ngramSimilarity = calculateNgramSimilarity(q1.originalText, q2.originalText);
  
  // Combined score
  const combinedScore = (jaccardSimilarity * 0.6 + ngramSimilarity * 0.4);
  const entityBonus = sharedEntities.length > 0 ? 0.1 : 0;
  const verbBonus = q1.verbs.some(v => q2.verbs.includes(v)) ? 0.1 : 0;
  
  const finalScore = Math.min(1, combinedScore + entityBonus + verbBonus);
  
  if (finalScore > 0.65) {
    return { 
      isEquivalent: true, 
      confidence: finalScore, 
      reason: `High similarity (${(finalScore * 100).toFixed(0)}%) with shared entities: ${sharedEntities.join(', ')}` 
    };
  }
  
  return { isEquivalent: false, confidence: finalScore, reason: `Low similarity: ${(finalScore * 100).toFixed(0)}%` };
}

// Check if two questions are asking opposite things
function areOppositeQuestions(q1: QuestionAnalysis, q2: QuestionAnalysis): { isOpposite: boolean; confidence: number; reason: string } {
  // Must have same entities and years
  const sharedEntities = q1.entities.filter(e => q2.entities.some(e2 => e2.includes(e) || e.includes(e2)));
  if (sharedEntities.length === 0 && q1.entities.length > 0 && q2.entities.length > 0) {
    return { isOpposite: false, confidence: 0, reason: 'No shared entities' };
  }
  
  const years1 = new Set(q1.years);
  const years2 = new Set(q2.years);
  if (years1.size > 0 && years2.size > 0) {
    const sharedYears = [...years1].filter(y => years2.has(y));
    if (sharedYears.length === 0) {
      return { isOpposite: false, confidence: 0, reason: 'Different years' };
    }
  }
  
  // Check for opposite verbs
  const oppositePairs: [string, string][] = [
    ['win', 'lose'], 
    ['pass', 'fail'], 
    ['convict', 'acquit'],
    ['confirm', 'reject'],
  ];
  
  for (const [v1, v2] of oppositePairs) {
    if ((q1.verbs.includes(v1) && q2.verbs.includes(v2)) || 
        (q1.verbs.includes(v2) && q2.verbs.includes(v1))) {
      const tokenSimilarity = calculateNgramSimilarity(q1.originalText, q2.originalText);
      if (tokenSimilarity > 0.4) {
        return { 
          isOpposite: true, 
          confidence: tokenSimilarity + 0.2, 
          reason: `Opposite verbs (${v1}/${v2}) with similar context` 
        };
      }
    }
  }
  
  // Check for negation patterns
  const hasNegation1 = /\bnot\b|\bwon't\b|\bwill not\b|\bn't\b/i.test(q1.originalText);
  const hasNegation2 = /\bnot\b|\bwon't\b|\bwill not\b|\bn't\b/i.test(q2.originalText);
  
  if (hasNegation1 !== hasNegation2) {
    const baseSimilarity = calculateNgramSimilarity(
      q1.originalText.replace(/\bnot\b|\bwon't\b|\bwill not\b/gi, ''),
      q2.originalText.replace(/\bnot\b|\bwon't\b|\bwill not\b/gi, '')
    );
    if (baseSimilarity > 0.5) {
      return { 
        isOpposite: true, 
        confidence: baseSimilarity, 
        reason: 'Same question with negation difference' 
      };
    }
  }
  
  return { isOpposite: false, confidence: 0, reason: 'Not opposite questions' };
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
  
  // Liquidity factor: low liquidity = need higher threshold
  const liquidityFactor = Math.max(0.5, Math.min(2.5, 500 / (minLiquidity + 100)));
  
  // Volume factor: high recent volume = can accept lower threshold
  const vol1 = market1.volume24Hours || 0;
  const vol2 = market2?.volume24Hours || vol1;
  const avgVolume = (vol1 + vol2) / 2;
  const volumeFactor = avgVolume > 200 ? 0.7 : avgVolume > 100 ? 0.8 : avgVolume > 50 ? 0.9 : 1.0;
  
  // Bettor factor: more bettors = more efficient pricing = need higher threshold
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
  
  // Pre-analyze all questions
  const analyzedMarkets = eligibleMarkets.map(m => ({
    market: m,
    analysis: analyzeQuestion(m.question)
  }));
  
  // Group by shared entities for faster comparison
  const entityGroups: Record<string, typeof analyzedMarkets> = {};
  for (const am of analyzedMarkets) {
    for (const entity of am.analysis.entities) {
      const key = entity.toLowerCase();
      if (!entityGroups[key]) entityGroups[key] = [];
      entityGroups[key].push(am);
    }
  }
  
  // Also group by tags
  const tagGroups: Record<string, typeof analyzedMarkets> = {};
  for (const am of analyzedMarkets) {
    const groups = am.market.groupSlugs || [];
    for (const group of groups) {
      if (!tagGroups[group]) tagGroups[group] = [];
      tagGroups[group].push(am);
    }
  }
  
  // Combine groups for comparison
  const allGroups = { ...entityGroups, ...tagGroups };
  
  for (const [groupKey, groupMarkets] of Object.entries(allGroups)) {
    if (groupMarkets.length < 2 || groupMarkets.length > 100) continue;
    
    for (let i = 0; i < groupMarkets.length; i++) {
      for (let j = i + 1; j < groupMarkets.length; j++) {
        const am1 = groupMarkets[i];
        const am2 = groupMarkets[j];
        
        const pairKey = [am1.market.id, am2.market.id].sort().join(':');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        const p1 = am1.market.probability || 0.5;
        const p2 = am2.market.probability || 0.5;
        
        // Check if equivalent questions
        const equivalence = areQuestionsEquivalent(am1.analysis, am2.analysis);
        
        if (equivalence.isEquivalent && equivalence.confidence > 0.65) {
          const threshold = calculateDynamicThreshold(am1.market, am2.market, config);
          
          // For equivalent questions: arbitrage if buying YES in one + NO in other < 1
          const yesNo = p1 + (1 - p2);
          const noYes = (1 - p1) + p2;
          const minCost = Math.min(yesNo, noYes);
          
          if (minCost < 1 - threshold) {
            const profitMargin = (1 - minCost) * 100;
            const priceImpact = estimatePriceImpact(am1.market, 50) + estimatePriceImpact(am2.market, 50);
            
            opportunities.push({
              id: `sp_${am1.market.id}_${am2.market.id}`,
              type: 'semantic_pair',
              markets: [
                { 
                  id: am1.market.id, 
                  question: am1.market.question, 
                  probability: p1, 
                  url: am1.market.url, 
                  liquidity: am1.market.totalLiquidity, 
                  volume: am1.market.volume, 
                  action: yesNo < noYes ? 'BUY_YES' : 'BUY_NO' 
                },
                { 
                  id: am2.market.id, 
                  question: am2.market.question, 
                  probability: p2, 
                  url: am2.market.url, 
                  liquidity: am2.market.totalLiquidity, 
                  volume: am2.market.volume, 
                  action: yesNo < noYes ? 'BUY_NO' : 'BUY_YES' 
                },
              ],
              expectedProfit: profitMargin * (1 - priceImpact),
              maxLoss: 0,
              expectedVariance: profitMargin * priceImpact,
              requiredCapital: 100,
              riskLevel: profitMargin > 10 ? 'low' : profitMargin > 5 ? 'medium' : 'high',
              description: `Equivalent questions (${(equivalence.confidence * 100).toFixed(0)}% match) with ${(profitMargin).toFixed(1)}% spread`,
              status: 'pending',
              dynamicThreshold: threshold,
              liquidityScore: calculateLiquidityScore(am1.market),
              similarityScore: equivalence.confidence,
              priceImpactEstimate: priceImpact,
              matchReason: equivalence.reason,
            });
          }
        }
        
        // Check for opposite questions
        const opposition = areOppositeQuestions(am1.analysis, am2.analysis);
        
        if (opposition.isOpposite && opposition.confidence > 0.5) {
          const threshold = calculateDynamicThreshold(am1.market, am2.market, config);
          const totalProb = p1 + p2;
          
          if (Math.abs(totalProb - 1) > threshold) {
            const profitMargin = Math.abs(totalProb - 1) * 100;
            const priceImpact = estimatePriceImpact(am1.market, 50) + estimatePriceImpact(am2.market, 50);
            
            opportunities.push({
              id: `op_${am1.market.id}_${am2.market.id}`,
              type: 'mutually_exclusive',
              markets: [
                { 
                  id: am1.market.id, 
                  question: am1.market.question, 
                  probability: p1, 
                  url: am1.market.url, 
                  liquidity: am1.market.totalLiquidity, 
                  volume: am1.market.volume, 
                  action: totalProb > 1 ? 'BUY_NO' : 'BUY_YES' 
                },
                { 
                  id: am2.market.id, 
                  question: am2.market.question, 
                  probability: p2, 
                  url: am2.market.url, 
                  liquidity: am2.market.totalLiquidity, 
                  volume: am2.market.volume, 
                  action: totalProb > 1 ? 'BUY_NO' : 'BUY_YES' 
                },
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
              liquidityScore: calculateLiquidityScore(am1.market),
              similarityScore: opposition.confidence,
              priceImpactEstimate: priceImpact,
              matchReason: opposition.reason,
            });
          }
        }
      }
    }
  }
  
  return opportunities;
}

function findExhaustiveSetArbitrage(markets: ManifoldMarket[], config: ScanConfig): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (const market of markets) {
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
  
  // Group markets by common themes/events using improved analysis
  const eventGroups: Record<string, { market: ManifoldMarket; analysis: QuestionAnalysis }[]> = {};
  
  const eventPatterns = [
    /(\d{4})\s+(us\s+)?presidential\s+election/i,
    /president\s+(in|of|for)\s+(\d{4})/i,
    /(super bowl|world cup|olympics|championship)\s+(\d{4})?/i,
    /(academy awards?|oscars?)\s+(\d{4})?/i,
  ];
  
  for (const market of markets) {
    if (!isTradeable(market) || !hasObjectiveResolution(market)) continue;
    if (market.outcomeType !== 'BINARY') continue;
    if ((market.totalLiquidity || 0) < config.minLiquidity * 0.5) continue;
    
    const analysis = analyzeQuestion(market.question);
    
    for (const pattern of eventPatterns) {
      const match = market.question.match(pattern);
      if (match) {
        const eventKey = match[0].toLowerCase().replace(/\s+/g, '_');
        if (!eventGroups[eventKey]) eventGroups[eventKey] = [];
        eventGroups[eventKey].push({ market, analysis });
        break;
      }
    }
  }
  
  for (const [event, eventMarkets] of Object.entries(eventGroups)) {
    if (eventMarkets.length < 2 || eventMarkets.length > 15) continue;
    
    // Filter to only mutually exclusive outcomes (same verb category)
    const verbGroups: Record<string, typeof eventMarkets> = {};
    for (const em of eventMarkets) {
      const mainVerb = em.analysis.verbs[0] || 'other';
      if (!verbGroups[mainVerb]) verbGroups[mainVerb] = [];
      verbGroups[mainVerb].push(em);
    }
    
    for (const [verb, verbMarkets] of Object.entries(verbGroups)) {
      if (verbMarkets.length < 2) continue;
      
      const totalProb = verbMarkets.reduce((sum, em) => sum + (em.market.probability || 0.5), 0);
      const threshold = 0.03 * verbMarkets.length;
      
      if (Math.abs(totalProb - 1) > threshold && verbMarkets.length <= 10) {
        const deviation = Math.abs(totalProb - 1);
        const profitMargin = deviation * 100;
        const avgLiquidity = verbMarkets.reduce((sum, em) => sum + (em.market.totalLiquidity || 0), 0) / verbMarkets.length;
        const priceImpact = verbMarkets.reduce((sum, em) => sum + estimatePriceImpact(em.market, 50 / verbMarkets.length), 0);
        
        opportunities.push({
          id: `mm_${event}_${verb}_${verbMarkets[0].market.id}`,
          type: 'multi_market',
          markets: verbMarkets.map(em => ({
            id: em.market.id,
            question: em.market.question,
            probability: em.market.probability || 0.5,
            url: em.market.url,
            liquidity: em.market.totalLiquidity,
            volume: em.market.volume,
            action: (totalProb > 1 ? 'BUY_NO' : 'BUY_YES') as 'BUY_YES' | 'BUY_NO',
          })),
          expectedProfit: profitMargin * (1 - priceImpact),
          maxLoss: profitMargin * 0.1,
          expectedVariance: profitMargin * priceImpact * 1.5,
          requiredCapital: 100 * verbMarkets.length,
          riskLevel: deviation > 0.15 ? 'low' : deviation > 0.08 ? 'medium' : 'high',
          description: `Multi-market "${event}" ${verb} (${verbMarkets.length} markets) sums to ${(totalProb * 100).toFixed(1)}%`,
          status: 'pending',
          dynamicThreshold: threshold,
          liquidityScore: avgLiquidity > 500 ? 80 : avgLiquidity > 100 ? 50 : 20,
          priceImpactEstimate: priceImpact,
        });
      }
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
  
  console.log(`Starting to fetch up to ${maxMarkets} markets...`);
  
  while (allMarkets.length < maxMarkets && consecutiveEmpty < 3) {
    const url = `https://api.manifold.markets/v0/search-markets?limit=${batchSize}&offset=${offset}&filter=open&sort=liquidity`;
    
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
  
  console.log(`Finished fetching ${allMarkets.length} total markets`);
  return allMarkets;
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

      const results = [];
      for (const market of markets) {
        console.log(`Placing ${market.action} bet on market ${market.id}`);
        
        const betAmount = market.optimalBet || 10;
        const outcome = market.action === 'BUY_YES' ? 'YES' : 'NO';
        
        const marketDataRes = await fetch(`https://api.manifold.markets/v0/market/${market.id}`);
        if (!marketDataRes.ok) {
          results.push({ marketId: market.id, success: false, error: 'Failed to fetch market data' });
          continue;
        }
        
        const marketData = await marketDataRes.json();
        const currentProb = marketData.probability || 0.5;
        const expectedProb = market.probability;
        
        const slippage = Math.abs(currentProb - expectedProb);
        if (slippage > 0.05) {
          results.push({ 
            marketId: market.id, 
            success: false, 
            error: `Slippage too high: ${(slippage * 100).toFixed(1)}%` 
          });
          continue;
        }
        
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
            limitProb: outcome === 'YES' ? currentProb + 0.02 : currentProb - 0.02,
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
