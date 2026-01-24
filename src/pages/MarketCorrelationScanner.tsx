import { useState, useEffect } from "react";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Link2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Zap,
  Target,
  Activity,
  ExternalLink,
  Bell,
  BellOff,
  ArrowRight,
  BarChart3,
  GitCompare,
  Search,
} from "lucide-react";

interface Market {
  id: string;
  question: string;
  probability: number;
  url: string;
  volume24h: number;
  liquidity: number;
}

interface CorrelationPair {
  id: string;
  market1: Market;
  market2: Market;
  correlationType: "positive" | "negative" | "inverse";
  correlationStrength: number; // 0-1
  probabilityDivergence: number; // % difference
  aiAnalysis: string;
  arbitrageOpportunity: boolean;
  suggestedAction?: {
    market1: "BUY_YES" | "BUY_NO" | null;
    market2: "BUY_YES" | "BUY_NO" | null;
    expectedProfit: number;
  };
  lastUpdated: string;
  isWatched: boolean;
}

interface DivergenceAlert {
  id: string;
  pairId: string;
  message: string;
  divergence: number;
  timestamp: string;
  read: boolean;
}

export default function MarketCorrelationScanner() {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [correlationPairs, setCorrelationPairs] = useState<CorrelationPair[]>([]);
  const [alerts, setAlerts] = useState<DivergenceAlert[]>([]);
  const [watchedPairs, setWatchedPairs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("correlations");
  const [searchQuery, setSearchQuery] = useState("");
  const [minCorrelation, setMinCorrelation] = useState(70);
  const [showArbitrageOnly, setShowArbitrageOnly] = useState(false);

  const [scanStats, setScanStats] = useState({
    marketsScanned: 0,
    pairsFound: 0,
    arbitrageOpportunities: 0,
    avgDivergence: 0,
  });

  useEffect(() => {
    loadWatchedPairs();
    loadAlerts();
  }, []);

  const loadWatchedPairs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("correlation_watchlist")
        .select("pair_id")
        .eq("user_id", user.id);

      if (data) {
        setWatchedPairs(new Set(data.map((d) => d.pair_id)));
      }
    } catch (error) {
      console.error("Error loading watched pairs:", error);
    }
  };

  const loadAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("correlation_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(20);

      if (data) {
        setAlerts(
          data.map((a: any) => ({
            id: a.id,
            pairId: a.pair_id,
            message: a.message,
            divergence: a.divergence,
            timestamp: a.timestamp,
            read: a.read,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  };

  const scanForCorrelations = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-correlation-scan", {
        body: { minCorrelation, searchQuery },
      });

      if (error) throw error;

      setCorrelationPairs(data.pairs || []);
      setScanStats({
        marketsScanned: data.marketsScanned || 0,
        pairsFound: data.pairs?.length || 0,
        arbitrageOpportunities: data.pairs?.filter((p: CorrelationPair) => p.arbitrageOpportunity).length || 0,
        avgDivergence: data.avgDivergence || 0,
      });

      toast({
        title: "Scan Complete",
        description: `Found ${data.pairs?.length || 0} correlated market pairs`,
      });
    } catch (error) {
      console.error("Correlation scan error:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleWatchPair = async (pairId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isWatched = watchedPairs.has(pairId);

      if (isWatched) {
        await supabase
          .from("correlation_watchlist")
          .delete()
          .eq("user_id", user.id)
          .eq("pair_id", pairId);
        watchedPairs.delete(pairId);
      } else {
        await supabase.from("correlation_watchlist").insert({
          user_id: user.id,
          pair_id: pairId,
        });
        watchedPairs.add(pairId);
      }

      setWatchedPairs(new Set(watchedPairs));
      toast({
        title: isWatched ? "Removed from Watchlist" : "Added to Watchlist",
        description: isWatched
          ? "You won't receive alerts for this pair"
          : "You'll be notified when divergence changes",
      });
    } catch (error) {
      console.error("Toggle watch error:", error);
    }
  };

  const filteredPairs = correlationPairs.filter((pair) => {
    if (showArbitrageOnly && !pair.arbitrageOpportunity) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        pair.market1.question.toLowerCase().includes(query) ||
        pair.market2.question.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getCorrelationColor = (strength: number) => {
    if (strength >= 0.8) return "text-emerald-400";
    if (strength >= 0.6) return "text-amber-400";
    return "text-muted-foreground";
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Market Correlation Scanner</h1>
              <p className="text-muted-foreground">
                Find markets that resolve together and spot divergence opportunities
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Markets Scanned</span>
              </div>
              <p className="text-2xl font-bold">{scanStats.marketsScanned}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <GitCompare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pairs Found</span>
              </div>
              <p className="text-2xl font-bold">{scanStats.pairsFound}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Arbitrage</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">
                {scanStats.arbitrageOpportunities}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Avg Divergence</span>
              </div>
              <p className="text-2xl font-bold">{scanStats.avgDivergence.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">
                    Min Correlation:
                  </Label>
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={minCorrelation}
                    onChange={(e) => setMinCorrelation(parseInt(e.target.value) || 70)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <Button
                  variant={showArbitrageOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArbitrageOnly(!showArbitrageOnly)}
                >
                  <Target className="w-4 h-4 mr-1" />
                  Arbitrage Only
                </Button>
                <Button onClick={scanForCorrelations} disabled={isScanning} className="gap-2">
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
            <TabsTrigger value="correlations" className="gap-2">
              <Link2 className="w-4 h-4" />
              Correlations
              {filteredPairs.length > 0 && (
                <Badge variant="secondary">{filteredPairs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {alerts.filter((a) => !a.read).length > 0 && (
                <Badge variant="destructive">{alerts.filter((a) => !a.read).length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Correlations Tab */}
          <TabsContent value="correlations">
            {filteredPairs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Link2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Correlations Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Scan" to find correlated market pairs
                  </p>
                  <Button onClick={scanForCorrelations} disabled={isScanning}>
                    {isScanning ? "Scanning..." : "Start Scan"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredPairs.map((pair) => (
                    <Card
                      key={pair.id}
                      className={pair.arbitrageOpportunity ? "border-emerald-500/50" : ""}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                pair.correlationType === "positive"
                                  ? "default"
                                  : pair.correlationType === "negative"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={
                                pair.correlationType === "positive"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : ""
                              }
                            >
                              {pair.correlationType === "positive" && (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              )}
                              {pair.correlationType === "negative" && (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {pair.correlationType}
                            </Badge>
                            <span
                              className={`font-medium ${getCorrelationColor(
                                pair.correlationStrength
                              )}`}
                            >
                              {(pair.correlationStrength * 100).toFixed(0)}% correlation
                            </span>
                            {pair.arbitrageOpportunity && (
                              <Badge className="bg-amber-500/20 text-amber-400">
                                <Zap className="w-3 h-3 mr-1" />
                                Arbitrage
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleWatchPair(pair.id)}
                          >
                            {watchedPairs.has(pair.id) ? (
                              <Bell className="w-4 h-4 text-amber-400" />
                            ) : (
                              <BellOff className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {/* Market Pair */}
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-2 line-clamp-2">
                              {pair.market1.question}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Prob: {(pair.market1.probability * 100).toFixed(0)}%
                              </span>
                              <a
                                href={pair.market1.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            {pair.suggestedAction?.market1 && (
                              <Badge variant="outline" className="mt-2">
                                {pair.suggestedAction.market1.replace("_", " ")}
                              </Badge>
                            )}
                          </div>

                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-2 line-clamp-2">
                              {pair.market2.question}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Prob: {(pair.market2.probability * 100).toFixed(0)}%
                              </span>
                              <a
                                href={pair.market2.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            {pair.suggestedAction?.market2 && (
                              <Badge variant="outline" className="mt-2">
                                {pair.suggestedAction.market2.replace("_", " ")}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Divergence Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Probability Divergence</span>
                            <span
                              className={
                                pair.probabilityDivergence > 15
                                  ? "text-amber-400"
                                  : "text-muted-foreground"
                              }
                            >
                              {pair.probabilityDivergence.toFixed(1)}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(pair.probabilityDivergence * 2, 100)}
                            className="h-2"
                          />
                        </div>

                        {/* AI Analysis */}
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-medium text-amber-400">AI Analysis</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{pair.aiAnalysis}</p>
                        </div>

                        {pair.suggestedAction?.expectedProfit && pair.suggestedAction.expectedProfit > 0 && (
                          <div className="mt-3 p-3 bg-emerald-500/10 rounded-lg">
                            <p className="text-sm font-medium text-emerald-400">
                              Expected Profit: M${pair.suggestedAction.expectedProfit.toFixed(0)}
                            </p>
                          </div>
                        )}
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
                    Watch correlation pairs to receive divergence alerts
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
                              alert.divergence > 20
                                ? "bg-red-500/20"
                                : alert.divergence > 10
                                ? "bg-amber-500/20"
                                : "bg-emerald-500/20"
                            }`}
                          >
                            <AlertTriangle
                              className={`w-4 h-4 ${
                                alert.divergence > 20
                                  ? "text-red-400"
                                  : alert.divergence > 10
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm text-muted-foreground">
                              Divergence: {alert.divergence.toFixed(1)}%
                            </p>
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
