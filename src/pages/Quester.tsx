import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import trumpPortrait from "@/assets/trump-portrait.png";
import {
  ArrowLeft,
  LogOut,
  Loader2,
  Play,
  Pause,
  ExternalLink,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";

export default function Quester() {
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [lastTradeAt, setLastTradeAt] = useState<string | null>(null);
  const [nextTradeAt, setNextTradeAt] = useState<string | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("quester", {
        body: { action: "status" },
      });

      if (error) throw error;

      setIsActive(data.isActive || false);
      setLastTradeAt(data.lastTradeAt);
      setNextTradeAt(data.nextTradeAt);
      setIsFree(data.isFree || false);
    } catch (error) {
      console.error("Error fetching status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("quester", {
        body: { action: "subscribe" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Quester Activated!",
        description: data.message,
      });

      await fetchStatus();
    } catch (error) {
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : "Failed to activate Quester",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("quester", {
        body: { action: "unsubscribe" },
      });

      if (error) throw error;

      toast({
        title: "Quester Deactivated",
        description: "You will no longer participate in daily trades.",
      });

      await fetchStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate Quester",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleManualTrade = async () => {
    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quester", {
        body: { action: "execute_trade" },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Trade Executed!",
        description: data.message,
      });

      await fetchStatus();
    } catch (error) {
      toast({
        title: "Trade Failed",
        description: error instanceof Error ? error.message : "Failed to execute trade",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Trump Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src={trumpPortrait}
          alt=""
          className="absolute -right-16 top-40 w-[500px] h-auto opacity-[0.05] rotate-6"
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">Quester</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Daily Market Participation</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/hub">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Hub</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            <span className="text-gradient">Quester</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Automatically buy and sell 1 share on the Quester market every day. Perfect for staying active on Manifold!
          </p>
          <p className="text-xs text-primary/70 mt-2 italic">
            "Daily trading, tremendous activity. The markets love us!" — DJT
          </p>
        </div>

        {/* Status Card */}
        <Card className="glass mb-6 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isActive ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                Status
              </CardTitle>
              <Badge variant={isActive ? "success" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Last Trade</span>
                </div>
                <p className="font-medium text-foreground">
                  {lastTradeAt ? new Date(lastTradeAt).toLocaleString() : "Never"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Next Trade</span>
                </div>
                <p className="font-medium text-foreground">
                  {isActive && nextTradeAt ? new Date(nextTradeAt).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {isActive ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleUnsubscribe}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                    Deactivate
                  </Button>
                  <Button variant="glow" className="flex-1 gap-2" onClick={handleManualTrade} disabled={isExecuting}>
                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Trade Now
                  </Button>
                </>
              ) : (
                <Button variant="glow" className="w-full gap-2" onClick={handleSubscribe} disabled={isSubscribing}>
                  {isSubscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {isFree ? "Activate (Free with Subscription)" : "Activate (M$10/month)"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="glass animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p>Every day, Quester automatically buys 1 share of YES on the Quester market.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p>Immediately after, it sells that share back to the market.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p>This keeps your Manifold streak with no effort!</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-medium">Pricing</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {isFree ? "Free with ManiFed subscription" : "M$10/month"}
                </span>
              </div>
            </div>

            <a
              href="https://manifold.markets/ManiFed/quester"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-primary hover:underline text-sm"
            >
              View Quester Market
              <ExternalLink className="w-3 h-3" />
            </a>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
