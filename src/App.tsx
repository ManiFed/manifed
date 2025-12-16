import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Hub from "./pages/Hub";
import CreditSearch from "./pages/CreditSearch";
import CreateLoan from "./pages/CreateLoan";
import LoanDetail from "./pages/LoanDetail";
import Portfolio from "./pages/Portfolio";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Bonds from "./pages/Bonds";
import BondMarket from "./pages/BondMarket";
import TreasuryNews from "./pages/TreasuryNews";
import TreasuryAdmin from "./pages/TreasuryAdmin";
import Memecoins from "./pages/Memecoins";
import Market from "./pages/Market";
import Arbitrage from "./pages/Arbitrage";
import MarketAgent from "./pages/MarketAgent";
import NotFound from "./pages/NotFound";

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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/hub" element={<ProtectedRoute><Hub /></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/loan/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/credit-search" element={<CreditSearch />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/bonds" element={<Bonds />} />
          <Route path="/bond-market" element={<ProtectedRoute><BondMarket /></ProtectedRoute>} />
          <Route path="/treasury" element={<ProtectedRoute><TreasuryNews /></ProtectedRoute>} />
          <Route path="/treasury-admin" element={<ProtectedRoute><TreasuryAdmin /></ProtectedRoute>} />
          <Route path="/memecoins" element={<Memecoins />} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><Market /></ProtectedRoute>} />
          <Route path="/arbitrage" element={<ProtectedRoute><Arbitrage /></ProtectedRoute>} />
          <Route path="/market-agent" element={<ProtectedRoute><MarketAgent /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
