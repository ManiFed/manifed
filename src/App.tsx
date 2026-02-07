import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { ManaRainReward } from "@/components/ManaRainReward";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import TradingTerminal from "./pages/TradingTerminal";
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
      <ManaRainReward />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/terminal" element={<ProtectedRoute><TradingTerminal /></ProtectedRoute>} />
          <Route path="/terminal/:marketId" element={<ProtectedRoute><TradingTerminal /></ProtectedRoute>} />
          <Route path="/:creatorUsername/:marketSlug" element={<ProtectedRoute><TradingTerminal /></ProtectedRoute>} />
          {/* Redirect all old routes to home */}
          <Route path="/hub" element={<Navigate to="/" replace />} />
          <Route path="/loans" element={<Navigate to="/" replace />} />
          <Route path="/navloc" element={<Navigate to="/" replace />} />
          <Route path="/client" element={<Navigate to="/" replace />} />
          <Route path="/docs" element={<Navigate to="/" replace />} />
          <Route path="/docs/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
