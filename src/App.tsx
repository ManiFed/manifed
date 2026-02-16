import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ManaRainReward } from "@/components/ManaRainReward";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Hub from "./pages/Hub";
import CreditSearch from "./pages/CreditSearch";
import CreateLoan from "./pages/CreateLoan";
import LoanDetail from "./pages/LoanDetail";
import LoanNegotiations from "./pages/LoanNegotiations";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Loans from "./pages/Loans";
import BondMarket from "./pages/BondMarket";
import TreasuryAdmin from "./pages/TreasuryAdmin";
import Memecoins from "./pages/Memecoins";
import Market from "./pages/Market";
import MarketAgent from "./pages/MarketAgent";
import CommentMaker from "./pages/CommentMaker";
import MispricedScanner from "./pages/MispricedScanner";
import PublicArbitrage from "./pages/PublicArbitrage";
import FintechMenu from "./pages/FintechMenu";
import FintechIndexFunds from "./pages/FintechIndexFunds";
import FintechAdvancedOrders from "./pages/FintechAdvancedOrders";
import FintechCalibration from "./pages/FintechCalibration";
import FintechBotBuilder from "./pages/FintechBotBuilder";
import TradingTerminal from "./pages/TradingTerminal";
import NAVLOC from "./pages/NAVLOC";
import MarketCreatorPro from "./pages/MarketCreatorPro";
import SmartMoneyTracker from "./pages/SmartMoneyTracker";
import PortfolioHedger from "./pages/PortfolioHedger";
import ConditionalTradeBuilder from "./pages/ConditionalTradeBuilder";
import MarketCorrelationScanner from "./pages/MarketCorrelationScanner";
import NotFound from "./pages/NotFound";
import DocsLayout from "./pages/docs/DocsLayout";
import Welcome from "./pages/docs/articles/Welcome";
import TradingTerminalDocs from "./pages/docs/articles/TradingTerminalDocs";
import FintechOverview from "./pages/docs/articles/FintechOverview";
import {
  QuickstartDoc, CoreConceptsDoc, CreateAccountDoc, ManifoldIntegrationDoc,
  DepositsWithdrawalsDoc, IndexFundsDoc, AdvancedOrdersDoc, CalibrationDoc,
  BotBuilderDoc, ArbitrageDoc, TreasuryOverviewDoc, BondsDoc, BondMarketDoc,
  MemecoinsDoc, CommentMakerDoc, FirstTradeDoc, LimitOrdersDoc, HotkeysDoc,
  ArbitrageGuideDoc, CalibrationGuideDoc, ApiOverviewDoc, ApiAuthDoc,
  TermsOfServiceDoc, AboutDoc
} from "./pages/docs/articles/PlaceholderDoc";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ManaRainReward />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/loan/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
          <Route path="/loans/negotiations" element={<ProtectedRoute><LoanNegotiations /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
          <Route path="/credit-search" element={<CreditSearch />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/loans" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
          <Route path="/bonds" element={<Navigate to="/loans" replace />} />
          <Route path="/bond-market" element={<ProtectedRoute><BondMarket /></ProtectedRoute>} />
          <Route path="/navloc" element={<ProtectedRoute><NAVLOC /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><TreasuryAdmin /></ProtectedRoute>} />
          <Route path="/treasury-admin" element={<Navigate to="/admin" replace />} />
          <Route path="/memecoins" element={<Memecoins />} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
          <Route path="/arbitrage" element={<Navigate to="/public-arbitrage" replace />} />
          <Route path="/public-arbitrage" element={<PublicArbitrage />} />
          <Route path="/market-agent" element={<ProtectedRoute><MarketAgent /></ProtectedRoute>} />
          <Route path="/comment-maker" element={<ProtectedRoute><CommentMaker /></ProtectedRoute>} />
          <Route path="/mispriced" element={<ProtectedRoute><MispricedScanner /></ProtectedRoute>} />
          {/* Private Client routes - redirect old fintech paths */}
          <Route path="/fintech" element={<Navigate to="/client" replace />} />
          <Route path="/fintech/menu" element={<Navigate to="/client" replace />} />
          <Route path="/fintech/arbitrage" element={<Navigate to="/public-arbitrage" replace />} />
          <Route path="/fintech/index-funds" element={<Navigate to="/client/index-funds" replace />} />
          <Route path="/fintech/advanced-orders" element={<Navigate to="/client/advanced-orders" replace />} />
          <Route path="/fintech/calibration" element={<Navigate to="/client/calibration" replace />} />
          <Route path="/fintech/bot-builder" element={<Navigate to="/client/bot-builder" replace />} />
          {/* Redirect old private-client paths to new client paths */}
          <Route path="/private-client" element={<Navigate to="/client" replace />} />
          <Route path="/private-client/index-funds" element={<Navigate to="/client/index-funds" replace />} />
          <Route path="/private-client/advanced-orders" element={<Navigate to="/client/advanced-orders" replace />} />
          <Route path="/private-client/calibration" element={<Navigate to="/client/calibration" replace />} />
          <Route path="/private-client/bot-builder" element={<Navigate to="/client/bot-builder" replace />} />
          {/* New Client routes */}
          <Route path="/client" element={<ProtectedRoute><FintechMenu /></ProtectedRoute>} />
          <Route path="/client/index-funds" element={<ProtectedRoute><FintechIndexFunds /></ProtectedRoute>} />
          <Route path="/client/advanced-orders" element={<ProtectedRoute><FintechAdvancedOrders /></ProtectedRoute>} />
          <Route path="/client/calibration" element={<ProtectedRoute><FintechCalibration /></ProtectedRoute>} />
          <Route path="/client/bot-builder" element={<ProtectedRoute><FintechBotBuilder /></ProtectedRoute>} />
          <Route path="/client/smart-money" element={<ProtectedRoute><SmartMoneyTracker /></ProtectedRoute>} />
          <Route path="/client/hedger" element={<ProtectedRoute><PortfolioHedger /></ProtectedRoute>} />
          <Route path="/client/trade-builder" element={<ProtectedRoute><ConditionalTradeBuilder /></ProtectedRoute>} />
          <Route path="/client/correlations" element={<ProtectedRoute><MarketCorrelationScanner /></ProtectedRoute>} />
          {/* Market slug routing for terminal */}
          <Route path="/:creatorUsername/:marketSlug" element={<ProtectedRoute><TradingTerminal /></ProtectedRoute>} />
          {/* Redirect old pages to docs */}
          <Route path="/terms" element={<Navigate to="/docs/terms" replace />} />
          <Route path="/privacy" element={<Navigate to="/docs/privacy" replace />} />
          <Route path="/about" element={<Navigate to="/docs/about" replace />} />
          <Route path="/terminal" element={<ProtectedRoute><TradingTerminal /></ProtectedRoute>} />
          <Route path="/creator" element={<Navigate to="/client/creator" replace />} />
          <Route path="/client/creator" element={<ProtectedRoute><MarketCreatorPro /></ProtectedRoute>} />
          <Route path="/terminal/:marketId" element={<ProtectedRoute><TradingTerminal /></ProtectedRoute>} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<Welcome />} />
            <Route path="quickstart" element={<QuickstartDoc />} />
            <Route path="core-concepts" element={<CoreConceptsDoc />} />
            <Route path="create-account" element={<CreateAccountDoc />} />
            <Route path="manifold-integration" element={<ManifoldIntegrationDoc />} />
            <Route path="deposits-withdrawals" element={<DepositsWithdrawalsDoc />} />
            <Route path="private-client" element={<FintechOverview />} />
            <Route path="fintech" element={<Navigate to="/docs/private-client" replace />} />
            <Route path="trading-terminal" element={<TradingTerminalDocs />} />
            <Route path="index-funds" element={<IndexFundsDoc />} />
            <Route path="advanced-orders" element={<AdvancedOrdersDoc />} />
            <Route path="calibration" element={<CalibrationDoc />} />
            <Route path="bot-builder" element={<BotBuilderDoc />} />
            <Route path="arbitrage" element={<ArbitrageDoc />} />
            <Route path="treasury" element={<TreasuryOverviewDoc />} />
            <Route path="bonds" element={<BondsDoc />} />
            <Route path="bond-market" element={<BondMarketDoc />} />
            <Route path="memecoins" element={<MemecoinsDoc />} />
            <Route path="comment-maker" element={<CommentMakerDoc />} />
            <Route path="first-trade" element={<FirstTradeDoc />} />
            <Route path="limit-orders" element={<LimitOrdersDoc />} />
            <Route path="hotkeys" element={<HotkeysDoc />} />
            <Route path="arbitrage-guide" element={<ArbitrageGuideDoc />} />
            <Route path="calibration-guide" element={<CalibrationGuideDoc />} />
            <Route path="api" element={<ApiOverviewDoc />} />
            <Route path="api-auth" element={<ApiAuthDoc />} />
            <Route path="terms" element={<TermsOfServiceDoc />} />
            <Route path="about" element={<AboutDoc />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
