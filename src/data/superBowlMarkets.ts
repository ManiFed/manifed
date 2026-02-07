/**
 * Super Bowl LIX - Custom curated markets list.
 * Edit this file to update the markets shown in Super Bowl mode.
 * 
 * Each market needs:
 * - id: The Manifold market ID (from the URL or API)
 * - question: Display name for the market
 * - url: Full Manifold URL
 * 
 * The probability will be fetched live from the Manifold API.
 */
export interface SuperBowlMarket {
  id: string;
  question: string;
  url: string;
  category?: 'game' | 'props' | 'halftime' | 'culture';
}

export const SUPER_BOWL_MARKETS: SuperBowlMarket[] = [
  // ====== GAME OUTCOME ======
  {
    id: "will-the-chiefs-win-super-bowl-lix",
    question: "Will the Chiefs win Super Bowl LIX?",
    url: "https://manifold.markets/super-bowl-chiefs",
    category: "game",
  },
  {
    id: "will-the-eagles-win-super-bowl-lix",
    question: "Will the Eagles win Super Bowl LIX?",
    url: "https://manifold.markets/super-bowl-eagles",
    category: "game",
  },
  {
    id: "super-bowl-lix-over-495",
    question: "Will Super Bowl LIX go over 49.5 points?",
    url: "https://manifold.markets/super-bowl-over-under",
    category: "game",
  },
  // ====== PROPS ======
  {
    id: "super-bowl-mvp-quarterback",
    question: "Will a QB win Super Bowl MVP?",
    url: "https://manifold.markets/super-bowl-mvp-qb",
    category: "props",
  },
  {
    id: "first-score-touchdown",
    question: "Will the first score be a touchdown?",
    url: "https://manifold.markets/super-bowl-first-score",
    category: "props",
  },
  {
    id: "super-bowl-overtime",
    question: "Will Super Bowl LIX go to overtime?",
    url: "https://manifold.markets/super-bowl-overtime",
    category: "props",
  },
  // ====== HALFTIME ======
  {
    id: "halftime-show-guest-appearance",
    question: "Will there be a surprise guest at halftime?",
    url: "https://manifold.markets/super-bowl-halftime-guest",
    category: "halftime",
  },
  // ====== CULTURE ======
  {
    id: "super-bowl-national-anthem-over-2min",
    question: "Will the National Anthem be over 2 minutes?",
    url: "https://manifold.markets/super-bowl-anthem",
    category: "culture",
  },
  {
    id: "super-bowl-coin-toss-heads",
    question: "Will the coin toss be heads?",
    url: "https://manifold.markets/super-bowl-coin-toss",
    category: "culture",
  },
  {
    id: "super-bowl-viewership-record",
    question: "Will Super Bowl LIX break the viewership record?",
    url: "https://manifold.markets/super-bowl-viewership",
    category: "culture",
  },
];

export const SUPER_BOWL_THEME = {
  name: "Super Bowl LIX",
  subtitle: "Championship Sunday",
  emoji: "🏈",
  colors: {
    primary: "#16a34a",    // Football field green
    secondary: "#854d0e",  // Football brown/leather
    accent: "#eab308",     // Gold/yellow for championship
    bg: "#0a1a0a",         // Dark green-tinted background
    headerBg: "#14532d",   // Deep green header
    cardBg: "#0f1f0f",     // Dark green card bg
    border: "#166534",     // Green border
    text: "#d9f99d",       // Light lime text
  },
};
