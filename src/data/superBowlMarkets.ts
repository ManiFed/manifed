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
    id: "will-afc-team-beat-the-nfc-team-sup",
    question: "Patriots vs. Seahawks",
    url: " https://manifold.markets/10thOfficial/will-afc-team-beat-the-nfc-team-sup",
    category: "game",
  },
  {
    id: "who-will-win-the-2026-nfl-super-bow",
    question: "Who will win the 2026 NFL Super Bowl?",
    url: "https://manifold.markets/KevinBurke/who-will-win-the-2026-nfl-super-bow",
    category: "game",
  },
  {
    id: "which-nfl-team-will-win-super-bowl-b2f88d236e80",
    question: "Which NFL team will win Super Bowl LX",
    url: "https://manifold.markets/strutheo/which-nfl-team-will-win-super-bowl-b2f88d236e80",
    category: "game",
  },
  // ====== PROPS ======
  {
    id: "who-will-win-super-bowl-lx-mvp",
    question: "Who will win Super Bowl LX MVP?",
    url: "https://manifold.markets/HundiGauksson/who-will-win-super-bowl-lx-mvp",
    category: "props",
  },
  {
    id: "super-bowl-lx-prop-bets-live",
    question: "Super Bowl LX Props",
    url: "https://manifold.markets/10thOfficial/super-bowl-lx-prop-bets-live",
    category: "props",
  },
  {
    id: "will-there-be-a-punt-returned-for-a",
    question: "Will a punt be returned for a touchdown in SBLX?",
    url: "https://manifold.markets/herzog/will-there-be-a-punt-returned-for-a",
    category: "props",
  },
  // ====== HALFTIME ======
  {
    id: "who-will-make-an-appearance-at-the",
    question: "Who will appear in the Halftime Show?",
    url: "https://manifold.markets/10thOfficial/who-will-make-an-appearance-at-the",
    category: "halftime",
  },
  // ====== CULTURE ======
  {
    id: "which-companies-will-run-ads-during",
    question: "Which companies will run adds during Super Bowl LX?",
    url: "https://manifold.markets/Bayesian/which-companies-will-run-ads-during",
    category: "culture",
  },
  {
    id: "what-color-will-the-gatorade-shower-scnquhQ5CZ",
    question: "What color will the Gatorade Shower be??",
    url: "https://manifold.markets/10thOfficial/what-color-will-the-gatorade-shower-scnquhQ5CZ",
    category: "culture",
  },
];

export const SUPER_BOWL_THEME = {
  name: "Super Bowl LIX",
  subtitle: "Championship Sunday",
  emoji: "🏈",
  colors: {
    primary:   "#1f7a3a", // Rich natural turf green
    secondary: "#8b4a2b", // Realistic football leather brown
    accent:    "#f5c542", // Clean championship gold
    bg:        "#0b1f14", // Very dark green background with depth
    headerBg:  "#143d26", // Deep stadium green
    cardBg:    "#102a1d", // Dark card surface with separation
    border:    "#2e6b45", // Muted green border that does not glow
    text:      "#e6f4ea", // Soft off white for readability
  },
};
