import { MarketTemplate } from '@/types/market-creator';

export const marketTemplates: MarketTemplate[] = [
  // ============================================
  // POLITICS & GOVERNMENT
  // ============================================
  {
    id: 'politics-election',
    name: 'Election Outcome',
    category: 'Politics',
    tags: ['elections', 'politics', 'government'],
    title: 'Will [Candidate] win the [Year] [Office] election?',
    description: 'This market resolves based on the official certified results of the election.',
    resolutionCriteria: 'Resolves YES if [Candidate] is officially declared the winner by the relevant electoral authority. Resolves NO otherwise. If the election is cancelled or postponed beyond [Date], resolves N/A.',
    marketType: 'binary',
  },
  {
    id: 'politics-legislation',
    name: 'Legislation Passage',
    category: 'Politics',
    tags: ['legislation', 'policy', 'government'],
    title: 'Will [Bill Name] be signed into law by [Date]?',
    description: 'This market tracks whether specific legislation will become law.',
    resolutionCriteria: 'Resolves YES if the bill is signed by the relevant executive authority by the close date. Resolves NO if the bill fails to pass or is vetoed without override.',
    marketType: 'binary',
  },
  {
    id: 'politics-approval-rating',
    name: 'Approval Rating',
    category: 'Politics',
    tags: ['polls', 'approval', 'politics'],
    title: 'Will [Politician]\'s approval rating exceed [X]% by [Date]?',
    description: 'Tracks approval rating movements based on a specified polling source.',
    resolutionCriteria: 'Resolves YES if the [Polling Source] average shows approval at or above [X]% on the close date. Uses the most recent poll published before market close.',
    marketType: 'binary',
  },

  // ============================================
  // TECHNOLOGY & AI
  // ============================================
  {
    id: 'tech-product-launch',
    name: 'Product Launch',
    category: 'Technology',
    tags: ['tech', 'product', 'release'],
    title: 'Will [Company] launch [Product] by [Quarter Year]?',
    description: 'This market predicts whether a company will release a specific product.',
    resolutionCriteria: 'Resolves YES if the product is officially announced and available for purchase/download by the close date. Beta releases count only if publicly accessible.',
    marketType: 'binary',
  },
  {
    id: 'tech-ai-benchmark',
    name: 'AI Benchmark',
    category: 'Technology',
    tags: ['AI', 'benchmark', 'ML'],
    title: 'Will an AI system score above [X]% on [Benchmark] by [Date]?',
    description: 'Tracks AI capabilities on standardized benchmarks.',
    resolutionCriteria: 'Resolves YES if a peer-reviewed paper or official benchmark leaderboard shows a score above [X]% by the close date. Must be reproducible with public weights or API access.',
    marketType: 'binary',
  },
  {
    id: 'tech-agi-timeline',
    name: 'AGI Timeline',
    category: 'Technology',
    tags: ['AI', 'AGI', 'future'],
    title: 'Will credible AGI claims be made by [Lab] before [Year]?',
    description: 'Tracks claims of artificial general intelligence development.',
    resolutionCriteria: 'Resolves YES if [Lab] makes an official public statement claiming to have developed AGI, AND at least 3 independent AI researchers with relevant credentials publicly agree the claim is credible. Resolves NO otherwise.',
    marketType: 'binary',
  },
  {
    id: 'tech-company-metric',
    name: 'Company Metric',
    category: 'Technology',
    tags: ['tech', 'metrics', 'quarterly'],
    title: 'Will [Company] report [Metric] above [Threshold] in Q[X] [Year]?',
    description: 'This market tracks a specific company performance metric.',
    resolutionCriteria: 'Resolves based on the official quarterly earnings report. Uses the reported figure without adjustments unless otherwise specified.',
    marketType: 'binary',
  },
  {
    id: 'tech-crypto-price',
    name: 'Crypto Price Target',
    category: 'Technology',
    tags: ['crypto', 'bitcoin', 'price'],
    title: 'Will [Cryptocurrency] reach $[Price] by [Date]?',
    description: 'Price prediction for cryptocurrencies.',
    resolutionCriteria: 'Resolves YES if the asset trades at or above $[Price] on [Exchange] at any point before market close. Uses the official ticker price, not futures or derivatives.',
    marketType: 'binary',
  },

  // ============================================
  // FINANCE & ECONOMICS
  // ============================================
  {
    id: 'finance-price',
    name: 'Stock Price Target',
    category: 'Finance',
    tags: ['stocks', 'price', 'trading'],
    title: 'Will [Stock] reach $[Price] by [Date]?',
    description: 'This market predicts stock price movements.',
    resolutionCriteria: 'Resolves YES if the stock trades at or above $[Price] at any point before the close date on [Exchange]. Uses the official closing price if checking on the close date.',
    marketType: 'binary',
  },
  {
    id: 'finance-earnings',
    name: 'Earnings Beat',
    category: 'Finance',
    tags: ['earnings', 'quarterly', 'stocks'],
    title: 'Will [Company] beat Q[X] [Year] earnings expectations?',
    description: 'This market predicts whether a company will exceed analyst expectations.',
    resolutionCriteria: 'Resolves YES if reported EPS exceeds the consensus analyst estimate as recorded by [Source] immediately before the earnings release. Resolves NO otherwise.',
    marketType: 'binary',
  },
  {
    id: 'finance-fed-rates',
    name: 'Fed Rate Decision',
    category: 'Finance',
    tags: ['fed', 'interest-rates', 'economics'],
    title: 'Will the Federal Reserve [raise/cut/hold] rates at the [Month Year] FOMC meeting?',
    description: 'Predicts Federal Reserve monetary policy decisions.',
    resolutionCriteria: 'Resolves based on the official FOMC statement following the meeting. "Raise" means any increase, "cut" means any decrease, "hold" means no change.',
    marketType: 'binary',
  },
  {
    id: 'finance-recession',
    name: 'Recession Prediction',
    category: 'Finance',
    tags: ['recession', 'economics', 'macro'],
    title: 'Will the US enter a recession by [Date]?',
    description: 'Tracks official recession declarations.',
    resolutionCriteria: 'Resolves YES if the NBER Business Cycle Dating Committee officially declares a recession started before [Date]. The declaration itself can come after [Date] as long as the recession start date is before.',
    marketType: 'binary',
  },

  // ============================================
  // SPORTS
  // ============================================
  {
    id: 'sports-championship',
    name: 'Championship Winner',
    category: 'Sports',
    tags: ['sports', 'championship', 'winner'],
    title: 'Will [Team] win the [Year] [Championship]?',
    description: 'This market predicts the outcome of a sports competition.',
    resolutionCriteria: 'Resolves YES if the team wins the championship. If the event is cancelled, resolves N/A. Postponements do not affect resolution unless cancelled entirely.',
    marketType: 'binary',
  },
  {
    id: 'sports-player-stat',
    name: 'Player Statistics',
    category: 'Sports',
    tags: ['sports', 'stats', 'player'],
    title: 'Will [Player] score/achieve [X] [Stat] in the [Year] season?',
    description: 'Tracks individual player performance.',
    resolutionCriteria: 'Resolves YES if the player officially records [X] or more [Stat] by the end of the regular season. Playoff stats do not count unless specified.',
    marketType: 'binary',
  },
  {
    id: 'sports-transfer',
    name: 'Player Transfer',
    category: 'Sports',
    tags: ['sports', 'transfer', 'trade'],
    title: 'Will [Player] transfer to [Team] before [Date]?',
    description: 'Predicts player movement between teams.',
    resolutionCriteria: 'Resolves YES if the transfer is officially announced by both clubs before the close date. Loan deals count as transfers.',
    marketType: 'binary',
  },

  // ============================================
  // SCIENCE & RESEARCH
  // ============================================
  {
    id: 'science-discovery',
    name: 'Scientific Milestone',
    category: 'Science',
    tags: ['science', 'research', 'discovery'],
    title: 'Will [Discovery/Milestone] be announced by [Date]?',
    description: 'This market tracks scientific progress and discoveries.',
    resolutionCriteria: 'Resolves YES if the milestone is announced in a peer-reviewed publication or by the relevant authority. Press releases alone do not count unless from an official institutional source.',
    marketType: 'binary',
  },
  {
    id: 'science-drug-approval',
    name: 'Drug Approval',
    category: 'Science',
    tags: ['pharma', 'FDA', 'drug'],
    title: 'Will the FDA approve [Drug] for [Indication] by [Date]?',
    description: 'Tracks pharmaceutical regulatory decisions.',
    resolutionCriteria: 'Resolves YES if the FDA grants full approval (not Emergency Use Authorization) for the specified indication by the close date. Advisory committee recommendations do not count.',
    marketType: 'binary',
  },
  {
    id: 'science-space',
    name: 'Space Mission',
    category: 'Science',
    tags: ['space', 'NASA', 'SpaceX'],
    title: 'Will [Mission] successfully [Objective] by [Date]?',
    description: 'Tracks space exploration milestones.',
    resolutionCriteria: 'Resolves YES if the mission achieves the specified objective and is declared successful by the operating agency. Partial success resolves NO unless criteria specify otherwise.',
    marketType: 'binary',
  },

  // ============================================
  // ENTERTAINMENT & MEDIA
  // ============================================
  {
    id: 'entertainment-release',
    name: 'Entertainment Release',
    category: 'Entertainment',
    tags: ['movies', 'games', 'media'],
    title: 'Will [Title] be released by [Date]?',
    description: 'This market predicts media release timelines.',
    resolutionCriteria: 'Resolves YES if the content is publicly available for purchase, streaming, or download in at least one major market by the close date. Early access or limited releases count.',
    marketType: 'binary',
  },
  {
    id: 'entertainment-box-office',
    name: 'Box Office Performance',
    category: 'Entertainment',
    tags: ['movies', 'box-office', 'revenue'],
    title: 'Will [Movie] gross $[X]M [domestic/worldwide] by [Date]?',
    description: 'Predicts film revenue milestones.',
    resolutionCriteria: 'Resolves YES if [Source] reports the specified gross at or above $[X]M by the close date. Uses cumulative gross, not opening weekend.',
    marketType: 'binary',
  },
  {
    id: 'entertainment-award',
    name: 'Award Winner',
    category: 'Entertainment',
    tags: ['awards', 'Oscar', 'Grammy'],
    title: 'Will [Nominee] win [Award] at the [Year] ceremony?',
    description: 'Predicts award show outcomes.',
    resolutionCriteria: 'Resolves YES if the nominee wins the specified award. If the ceremony is cancelled or the category eliminated, resolves N/A.',
    marketType: 'binary',
  },

  // ============================================
  // META & SELF-REFERENTIAL (Creative)
  // ============================================
  {
    id: 'meta-ai-resolution',
    name: 'AI Resolution',
    category: 'Meta',
    tags: ['meta', 'AI', 'self-referential', 'fun'],
    title: 'Will Claude/GPT resolve this market YES?',
    description: 'A meta-market where an AI model decides the resolution. Popular for exploring AI decision-making and alignment.',
    resolutionCriteria: 'At market close, I will prompt [AI Model] with this market\'s description, trades, and comments. The AI\'s response (YES or NO) will determine resolution. If the AI refuses to answer or gives an invalid response, I will re-prompt until a valid answer is given.',
    marketType: 'binary',
  },
  {
    id: 'meta-this-market',
    name: 'Self-Referential Probability',
    category: 'Meta',
    tags: ['meta', 'self-referential', 'fun'],
    title: 'Will this market resolve above [X]%?',
    description: 'A self-referential market about its own probability.',
    resolutionCriteria: 'Resolves YES if the market probability is at or above [X]% at market close (11:59 PM ET). Uses the Manifold displayed probability, not the API probability.',
    marketType: 'binary',
  },
  {
    id: 'meta-comment-count',
    name: 'Comment Prediction',
    category: 'Meta',
    tags: ['meta', 'engagement', 'manifold'],
    title: 'Will this market get more than [X] comments?',
    description: 'Predicts engagement on this very market.',
    resolutionCriteria: 'Resolves YES if the comment count (excluding creator comments) exceeds [X] at market close. Comments posted after close but before resolution don\'t count.',
    marketType: 'binary',
  },
  {
    id: 'meta-trader-count',
    name: 'Trader Count Bet',
    category: 'Meta',
    tags: ['meta', 'manifold', 'trading'],
    title: 'Will this market attract more than [X] unique traders?',
    description: 'Bets on market popularity.',
    resolutionCriteria: 'Resolves YES if the unique trader count displayed on Manifold exceeds [X] at market close. The creator counts as a trader only if they place bets.',
    marketType: 'binary',
  },

  // ============================================
  // FUN & CREATIVE
  // ============================================
  {
    id: 'fun-meme-stock',
    name: 'Meme Stock Market',
    category: 'Fun',
    tags: ['meme', 'stocks', 'fun', 'creative'],
    title: '[Celebrity/Character] Stock - Will their cultural relevance increase?',
    description: 'A permanent market tracking cultural relevance of a person or character. Buy if you think they\'ll become more popular!',
    resolutionCriteria: 'This is a permanent market that never resolves. Trade based on perceived cultural relevance. Higher probability = more relevant/popular.',
    marketType: 'binary',
  },
  {
    id: 'fun-prediction-bingo',
    name: 'Prediction Bingo',
    category: 'Fun',
    tags: ['bingo', 'fun', 'multiple-choice'],
    title: '[Event] Bingo - Which will happen first?',
    description: 'A bingo-style market with multiple outcomes. Which prediction will come true first?',
    resolutionCriteria: 'Resolves to whichever outcome happens first. If multiple happen simultaneously, all applicable answers share resolution. If none happen by close, resolves N/A.',
    marketType: 'multiple_choice',
  },
  {
    id: 'fun-would-you-rather',
    name: 'Would You Rather Poll',
    category: 'Fun',
    tags: ['poll', 'fun', 'community'],
    title: 'Would you rather [Option A] or [Option B]?',
    description: 'A community poll exploring preferences. No stakes, just fun!',
    resolutionCriteria: 'This is a poll market. Resolves to the option with the highest probability at close. This is a poll, not a prediction.',
    marketType: 'poll',
  },
  {
    id: 'fun-first-to-happen',
    name: 'Race Market',
    category: 'Fun',
    tags: ['race', 'competition', 'multiple-choice'],
    title: 'Which will happen first: [A], [B], or [C]?',
    description: 'A race between different events. Which outcome will cross the finish line first?',
    resolutionCriteria: 'Resolves to whichever event occurs first with credible public evidence. If none occur by close date, resolves to "None of the above" if that option exists, otherwise N/A.',
    marketType: 'multiple_choice',
  },
  {
    id: 'fun-over-under',
    name: 'Over/Under',
    category: 'Fun',
    tags: ['over-under', 'numeric', 'prediction'],
    title: 'Over/Under [X.5] - [Metric] for [Subject]',
    description: 'Classic over/under betting format adapted for prediction markets.',
    resolutionCriteria: 'Resolves YES (Over) if the final [Metric] is greater than [X.5]. Resolves NO (Under) if less. The .5 ensures no ties.',
    marketType: 'binary',
  },

  // ============================================
  // MANIFOLD-SPECIFIC
  // ============================================
  {
    id: 'manifold-feature',
    name: 'Manifold Feature',
    category: 'Manifold',
    tags: ['manifold', 'feature', 'meta'],
    title: 'Will Manifold ship [Feature] by [Date]?',
    description: 'Predicts Manifold Markets platform development.',
    resolutionCriteria: 'Resolves YES if the feature is deployed to production and accessible to users by the close date. Beta/staging doesn\'t count unless publicly announced as shipped.',
    marketType: 'binary',
  },
  {
    id: 'manifold-user-milestone',
    name: 'User Milestone',
    category: 'Manifold',
    tags: ['manifold', 'users', 'growth'],
    title: 'Will Manifold reach [X] monthly active users by [Date]?',
    description: 'Tracks Manifold platform growth.',
    resolutionCriteria: 'Resolves based on official Manifold announcements or statistics. If no official number is available, resolves based on creator\'s best faith estimate from public data.',
    marketType: 'binary',
  },
  {
    id: 'manifold-creator-profit',
    name: 'Creator Profit',
    category: 'Manifold',
    tags: ['manifold', 'profit', 'trading'],
    title: 'Will [Creator] be net positive on their markets by [Date]?',
    description: 'Tracks a creator\'s trading performance.',
    resolutionCriteria: 'Resolves YES if the creator\'s total Manifold profit (from trading, not loans) is positive on the close date. Uses the profit number shown on their public profile.',
    marketType: 'binary',
  },

  // ============================================
  // PERSONAL & ACCOUNTABILITY
  // ============================================
  {
    id: 'personal-goal',
    name: 'Personal Goal',
    category: 'Personal',
    tags: ['personal', 'goals', 'accountability'],
    title: 'Will I [achieve goal] by [Date]?',
    description: 'Use prediction markets for personal accountability!',
    resolutionCriteria: 'Resolves YES if I publicly post evidence of achieving [goal] by the close date. Evidence must be verifiable (photo, screenshot, witness). I will not bet on this market.',
    marketType: 'binary',
  },
  {
    id: 'personal-habit',
    name: 'Habit Streak',
    category: 'Personal',
    tags: ['personal', 'habits', 'streak'],
    title: 'Will I maintain [habit] for [X] consecutive days?',
    description: 'Accountability market for building habits.',
    resolutionCriteria: 'Resolves YES if I complete [habit] for [X] consecutive days starting from market creation. I will post daily updates. Missing one day = NO.',
    marketType: 'binary',
  },

  // ============================================
  // BOUNTY & CREATIVE CHALLENGES
  // ============================================
  {
    id: 'bounty-creative',
    name: 'Creative Bounty',
    category: 'Bounty',
    tags: ['bounty', 'creative', 'challenge'],
    title: 'Bounty: [Task Description]',
    description: 'A bounty market rewarding creative contributions.',
    resolutionCriteria: 'I will award the bounty to submissions meeting the criteria. Quality judged by [criteria]. Multiple winners possible. Deadline: [Date].',
    marketType: 'binary',
  },
  {
    id: 'bounty-research',
    name: 'Research Bounty',
    category: 'Bounty',
    tags: ['bounty', 'research', 'investigation'],
    title: 'Bounty: Find evidence that [Claim]',
    description: 'A bounty for research and investigation.',
    resolutionCriteria: 'Bounty awarded for credible evidence supporting or refuting [Claim]. Evidence must be from primary sources. Partial bounties for partial evidence.',
    marketType: 'binary',
  },

  // ============================================
  // CONTRARIAN & EDGE CASES
  // ============================================
  {
    id: 'contrarian-consensus',
    name: 'Consensus Breaker',
    category: 'Contrarian',
    tags: ['contrarian', 'consensus', 'surprise'],
    title: 'Will [Unlikely Outcome] happen despite [X]% consensus against?',
    description: 'For outcomes that seem unlikely but might surprise us.',
    resolutionCriteria: 'Resolves YES if [Unlikely Outcome] occurs despite current consensus. This market is intentionally contrarian. Trade accordingly.',
    marketType: 'binary',
  },
  {
    id: 'contrarian-black-swan',
    name: 'Black Swan Watch',
    category: 'Contrarian',
    tags: ['black-swan', 'rare', 'tail-risk'],
    title: 'Will a [Category] black swan event occur by [Date]?',
    description: 'Tracking low-probability, high-impact events.',
    resolutionCriteria: 'Resolves YES if an event occurs that: (1) was widely considered unlikely beforehand, (2) has major [Category] impact, (3) is covered by at least 3 major news outlets as "surprising" or "unexpected".',
    marketType: 'binary',
  },

  // ============================================
  // CONDITIONAL & COMPLEX
  // ============================================
  {
    id: 'conditional-if-then',
    name: 'Conditional Market',
    category: 'Complex',
    tags: ['conditional', 'if-then', 'complex'],
    title: 'IF [Condition], will [Outcome] happen?',
    description: 'A conditional market that only resolves if the condition is met.',
    resolutionCriteria: 'If [Condition] occurs, resolves YES/NO based on [Outcome]. If [Condition] does not occur by close, resolves N/A. The condition must be clearly met before evaluating the outcome.',
    marketType: 'binary',
  },
  {
    id: 'complex-range',
    name: 'Numeric Range',
    category: 'Complex',
    tags: ['numeric', 'range', 'estimate'],
    title: 'What will [Metric] be on [Date]?',
    description: 'A numeric market for precise predictions.',
    resolutionCriteria: 'Resolves to the official [Metric] value from [Source] on [Date]. If the source is unavailable, uses [Backup Source]. Values are rounded to [precision].',
    marketType: 'numeric',
  },
];
