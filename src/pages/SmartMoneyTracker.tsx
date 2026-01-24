import { useState, useEffect } from "react";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
  Eye,
  Star,
  Target,
  Activity,
  Zap,
  ExternalLink,
  Bell,
  BellOff,
} from "lucide-react";

interface SmartTrader {
  id: string;
  username: string;
  avatarUrl?: string;
  accuracy: number;
  totalBets: number;
  profitLoss: number;
  recentActivity: string;
  isWatched: boolean;
  topMarkets: string[];
}

interface SmartMoneyMove {
  id: string;
  trader: SmartTrader;
  market: {
    id: string;
    question: string;
    probability: number;
    url: string;
  };
  action: "BUY_YES" | "BUY_NO" | "SELL";
  amount: number;
  timestamp: string;
  impact: number;
  aiAnalysis?: string;
}

interface TraderAlert {
  id: string;
  traderId: string;
  traderName: string;
  type: "position" | "large_move" | "trend_change";
  message: string;
  timestamp: string;
  read: boolean;
}

export default function SmartMoneyTracker() {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [traders, setTraders] = useState<SmartTrader[]>([]);
  const [moves, setMoves] = useState<SmartMoneyMove[]>([]);
  const [alerts, setAlerts] = useState<TraderAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [minAccuracy, setMinAccuracy] = useState(60);
  const [watchedTraders, setWatchedTraders] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("traders");

  useEffect(() => {
    loadWatchedTraders();
  }, []);

  const loadWatchedTraders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("smart_money_watchlist")
        .select("trader_id")
        .eq("user_id", user.id);

      if (data) {
        setWatchedTraders(new Set(data.map((d) => d.trader_id)));
      }
    } catch (error) {
      console.error("Error loading watched traders:", error);
    }
  };

  const scanForSmartMoney = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-money-scan", {
        body: { minAccuracy, searchQuery },
      });

      if (error) throw error;

      setTraders(data.traders || []);
      setMoves(data.recentMoves || []);
      setAlerts(data.alerts || []);

      toast({
        title: "Scan Complete",
        description: `Found ${data.traders?.length || 0} high-accuracy traders`,
      });
    } catch (error) {
      console.error("Smart money scan error:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleWatchTrader = async (traderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isWatched = watchedTraders.has(traderId);

      if (isWatched) {
        await supabase
          .from("smart_money_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("trader_id", traderId);
        watchedTraders.delete(traderId);
      } else {
        await supabase.from("smart_money_watchlist").insert({
          user_id: user.id,
          trader_id: traderId,
        });
        watchedTraders.add(traderId);
      }

      setWatchedTraders(new Set(watchedTraders));
      toast({
        title: isWatched ? "Removed from Watchlist" : "Added to Watchlist",
        description: isWatched
          ? "You won't receive alerts for this trader"
          : "You'll be notified when this trader makes moves",
      });
    } catch (error) {
      console.error("Toggle watch error:", error);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) return `M$${(amount / 1000).toFixed(1)}k`;
    return `M$${amount.toFixed(0)}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Smart Money Tracker</h1>
              <p className="text-muted-foreground">
                Track high-accuracy traders and follow their moves
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search traders by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Min Accuracy:</span>
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={minAccuracy}
                    onChange={(e) => setMinAccuracy(parseInt(e.target.value) || 60)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <Button onClick={scanForSmartMoney} disabled={isScanning} className="gap-2">
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Scan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="traders" className="gap-2">
              <Users className="w-4 h-4" />
              Top Traders
              {traders.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {traders.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="moves" className="gap-2">
              <Activity className="w-4 h-4" />
              Recent Moves
              {moves.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {moves.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {alerts.filter((a) => !a.read).length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {alerts.filter((a) => !a.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Traders Tab */}
          <TabsContent value="traders">
            {traders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Traders Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Scan" to find high-accuracy traders on Manifold
                  </p>
                  <Button onClick={scanForSmartMoney} disabled={isScanning}>
                    {isScanning ? "Scanning..." : "Start Scan"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {traders.map((trader) => (
                  <Card key={trader.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {trader.avatarUrl ? (
                              <img
                                src={trader.avatarUrl}
                                alt={trader.username}
                                className="w-full h-full rounded-full"
                              />
                            ) : (
                              <Users className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{trader.username}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {trader.totalBets} total bets
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleWatchTrader(trader.id)}
                          className={watchedTraders.has(trader.id) ? "text-amber-400" : ""}
                        >
                          {watchedTraders.has(trader.id) ? (
                            <Star className="w-4 h-4 fill-current" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Accuracy</span>
                          <Badge
                            variant={trader.accuracy >= 70 ? "default" : "secondary"}
                            className={
                              trader.accuracy >= 70
                                ? "bg-emerald-500/20 text-emerald-400"
                                : ""
                            }
                          >
                            <Target className="w-3 h-3 mr-1" />
                            {trader.accuracy.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">P&L</span>
                          <span
                            className={`font-medium ${
                              trader.profitLoss >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {trader.profitLoss >= 0 ? "+" : ""}
                            {formatAmount(trader.profitLoss)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Last Active</span>
                          <span className="text-sm">{trader.recentActivity}</span>
                        </div>
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Top Markets:</p>
                          <div className="flex flex-wrap gap-1">
                            {trader.topMarkets.slice(0, 3).map((market, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {market.length > 20 ? market.slice(0, 20) + "..." : market}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recent Moves Tab */}
          <TabsContent value="moves">
            {moves.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Moves</h3>
                  <p className="text-muted-foreground">
                    Smart money moves will appear here after scanning
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {moves.map((move) => (
                    <Card key={move.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{move.trader.username}</span>
                              <Badge
                                variant={
                                  move.action === "BUY_YES"
                                    ? "default"
                                    : move.action === "BUY_NO"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={
                                  move.action === "BUY_YES"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : ""
                                }
                              >
                                {move.action === "BUY_YES" && (
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                )}
                                {move.action === "BUY_NO" && (
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                )}
                                {move.action.replace("_", " ")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatAmount(move.amount)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mb-2">
                              {move.market.question}
                            </p>
                            {move.aiAnalysis && (
                              <div className="bg-muted/50 rounded-lg p-3 mt-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <Zap className="w-3 h-3 text-amber-400" />
                                  <span className="text-xs font-medium text-amber-400">
                                    AI Analysis
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {move.aiAnalysis}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(move.timestamp)}
                            </span>
                            <a
                              href={move.market.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            {alerts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
                  <p className="text-muted-foreground">
                    Watch traders to receive alerts when they make moves
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card
                    key={alert.id}
                    className={!alert.read ? "border-primary/50 bg-primary/5" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              alert.type === "large_move"
                                ? "bg-amber-500/20"
                                : alert.type === "position"
                                ? "bg-emerald-500/20"
                                : "bg-blue-500/20"
                            }`}
                          >
                            <AlertCircle
                              className={`w-4 h-4 ${
                                alert.type === "large_move"
                                  ? "text-amber-400"
                                  : alert.type === "position"
                                  ? "text-emerald-400"
                                  : "text-blue-400"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{alert.traderName}</p>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
