
# Implementation Plan

## Overview
This plan covers moving Creator Pro into the Client suite and adding several new features focused on trading enhancements, analytics, automation, and dashboard customization.

---

## Part 1: Move Creator Pro to Client Suite

**Current State**: Creator Pro exists at `/creator` and appears as a standalone product in the Hub.

**Changes Required**:

1. **Update Hub.tsx**: Remove Creator Pro card from the main products grid

2. **Update FintechMenu.tsx**: Add Creator Pro as a new product at the bottom of the `fintechProducts` array with appropriate styling

3. **Update App.tsx routing**: Change `/creator` route to `/client/creator` for consistency with the Client suite URL structure

4. **Update UniversalHeader**: No changes needed (Client nav item already exists)

---

## Part 2: Trading & Terminal Enhancements

### 2A: Position P&L Tracker Widget
- Add a new collapsible panel in the Terminal sidebar showing live position profit/loss
- Fetches user positions from Manifold API
- Calculates unrealized P&L based on current market prices vs entry price
- Color-coded gains/losses with sparkline mini-charts

### 2B: Trade History Export
- Add an "Export" button to the Terminal that downloads trade history as CSV
- Includes date, market, position, amount, and outcome

---

## Part 3: Client Analytics Suite Additions

### 3A: Market Sentiment Scanner
- New page at `/client/sentiment`
- Aggregates recent trading activity across markets
- Uses Gemini AI to classify markets as "bullish divergence," "bearish divergence," or "neutral"
- Highlights markets where smart money is moving contrary to probability

### 3B: Performance Leaderboard (Personal)
- New widget showing user's ranking by accuracy, profit, and volume
- Compares against historical self-performance
- Monthly/weekly/all-time toggle

---

## Part 4: Scheduled Tasks (Automation)

### 4A: Escrow Expiration Cron Job
- **Critical**: Automatically releases expired negotiation escrows
- Creates edge function `process-expired-escrows` that:
  - Finds negotiations with `expires_at < now()` and `status = 'pending'`
  - Updates status to `'expired'`
  - Calls `release_escrow()` RPC to return funds
- Sets up pg_cron schedule to run every hour

### 4B: Daily Portfolio Snapshot
- Creates edge function `daily-portfolio-snapshot`
- Fetches user positions from Manifold API
- Records total value to `net_worth_history` table
- Enables portfolio value charting over time
- Runs daily at 6 AM UTC

---

## Part 5: External Data Sources & Manifold API

### 5A: News Feed Integration
- Enhance Terminal RSS panel with multiple configurable feeds
- Add ability to search news by market topic
- Store feed preferences in localStorage

### 5B: Manifold Groups Integration
- Fetch user's Manifold groups
- Allow filtering markets by group membership
- Display group activity in Terminal trending panel

### 5C: Market Comments Panel
- Add a "Comments" tab to Terminal
- Fetches recent comments on the current market via Manifold API
- Displays commenter, text, and timestamp

---

## Part 6: Dashboard Customization

### 6A: Draggable Hub Widgets
- Convert Hub portfolio cards to draggable/resizable widgets using @dnd-kit
- Persist layout to localStorage
- Add "Reset Layout" button

### 6B: Terminal Layout Presets
- Add preset buttons (e.g., "Minimal," "Full," "Analytics")
- Each preset configures which panels are visible and their positions
- Save custom presets to localStorage

### 6C: Client Tool Favorites
- Allow starring/pinning favorite Client tools
- Starred tools appear at the top of the grid
- Persist to localStorage

---

## Technical Details

### New Database Tables/Columns
None required for this phase - all persistence uses localStorage or existing tables (`net_worth_history`).

### New Edge Functions
1. `process-expired-escrows` - Cron job for escrow cleanup
2. `daily-portfolio-snapshot` - Records daily portfolio values
3. `market-sentiment-scan` - AI-powered sentiment analysis

### Files to Create
- `src/pages/MarketSentiment.tsx`
- `supabase/functions/process-expired-escrows/index.ts`
- `supabase/functions/daily-portfolio-snapshot/index.ts`
- `supabase/functions/market-sentiment-scan/index.ts`

### Files to Modify
- `src/pages/Hub.tsx` - Remove Creator Pro card, add draggable widgets
- `src/pages/FintechMenu.tsx` - Add Creator Pro entry at bottom
- `src/App.tsx` - Update Creator Pro route to `/client/creator`
- `src/pages/TradingTerminal.tsx` - Add P&L tracker, comments panel, export button
- `src/components/terminal/DraggableSidebar.tsx` - Add layout presets
- `supabase/config.toml` - Register new edge functions

---

## Implementation Order

1. ✅ **Phase 1**: Move Creator Pro to Client (DONE - route changed to /client/creator, removed from Hub grid)
2. ✅ **Phase 2**: Escrow expiration cron job (DONE - edge function + hourly cron schedule created)
3. ✅ **Phase 3**: Dashboard customization - Terminal presets (DONE - LayoutPresets component with Minimal/Full/Analytics/Trading)
4. ✅ **Phase 4**: Terminal enhancements (DONE - P&L tracker already existed, added Comments panel + Trade Export button)
5. **Phase 5**: Analytics additions (Sentiment Scanner)
6. **Phase 6**: External data (News feeds, Groups, Portfolio snapshot)
