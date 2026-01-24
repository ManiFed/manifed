import { useState, useEffect } from "react";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Zap,
  Target,
  Scale,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Settings2,
  Play,
  Pause,
} from "lucide-react";

interface Position {
  marketId: string;
  marketQuestion: string;
  outcome: "YES" | "NO";
  shares: number;
  currentValue: number;
  probability: number;
  url: string;
}

interface HedgeOpportunity {
  id: string;
  sourcePosition: Position;
  hedgeMarket: {
    id: string;
    question: string;
    probability: number;
    url: string;
  };
  correlation: number;
  correlationType: "positive" | "negative" | "inverse";
  suggestedAction: "BUY_YES" | "BUY_NO";
  suggestedAmount: number;
  riskReduction: number;
  aiReasoning: string;
  confidence: "high" | "medium" | "low";
}

interface RebalanceRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: {
    type: "exposure" | "correlation" | "time";
    threshold: number;
  };
  action: {
    type: "hedge" | "reduce" | "alert";
    targetExposure: number;
  };
}

export default function PortfolioHedger() {
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [hedgeOpportunities, setHedgeOpportunities] = useState<HedgeOpportunity[]>([]);
  const [rebalanceRules, setRebalanceRules] = useState<RebalanceRule[]>([
    {
      id: "1",
      name: "Max Single Exposure",
      description: "Alert when any single market exceeds 25% of portfolio",
      isActive: true,
      trigger: { type: "exposure", threshold: 25 },
      action: { type: "alert", targetExposure: 15 },
    },
    {
      id: "2",
      name: "Correlation Alert",
      description: "Warn when correlated positions exceed 40% combined",
      isActive: true,
      trigger: { type: "correlation", threshold: 40 },
      action: { type: "hedge", targetExposure: 20 },
    },
    {
      id: "3",
      name: "Daily Rebalance",
      description: "Auto-suggest hedges daily",
      isActive: false,
      trigger: { type: "time", threshold: 24 },
      action: { type: "reduce", targetExposure: 10 },
    },
  ]);
  const [activeTab, setActiveTab] = useState("positions");
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    riskScore: 0,
    correlatedExposure: 0,
    diversificationScore: 0,
  });
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_manifold_settings")
        .select("manifold_api_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.manifold_api_key) {
        setApiKey("••••••••");
      }
    } catch (error) {
      console.error("Error loading API key:", error);
    }
  };

  const scanPortfolio = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("portfolio-hedger-scan", {
        body: {},
      });

      if (error) throw error;

      setPositions(data.positions || []);
      setHedgeOpportunities(data.hedgeOpportunities || []);
      setPortfolioStats(data.stats || portfolioStats);

      toast({
        title: "Portfolio Analyzed",
        description: `Found ${data.hedgeOpportunities?.length || 0} hedge opportunities`,
      });
    } catch (error) {
      console.error("Portfolio scan error:", error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const executeHedge = async (opportunity: HedgeOpportunity) => {
    try {
      const { data, error } = await supabase.functions.invoke("portfolio-hedger-scan", {
        body: {
          action: "execute_hedge",
          hedgeId: opportunity.id,
          marketId: opportunity.hedgeMarket.id,
          outcome: opportunity.suggestedAction === "BUY_YES" ? "YES" : "NO",
          amount: opportunity.suggestedAmount,
        },
      });

      if (error) throw error;

      toast({
        title: "Hedge Executed",
        description: `Bought ${opportunity.suggestedAction === "BUY_YES" ? "YES" : "NO"} on hedge market`,
      });

      // Refresh positions
      scanPortfolio();
    } catch (error) {
      toast({
        title: "Hedge Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const toggleRule = (ruleId: string) => {
    setRebalanceRules(
      rebalanceRules.map((rule) =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) return `M$${(amount / 1000).toFixed(1)}k`;
    return `M$${amount.toFixed(0)}`;
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-emerald-400";
    if (score < 60) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Portfolio Hedger</h1>
              <p className="text-muted-foreground">
                Find natural hedges and reduce portfolio risk
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Portfolio Value</span>
              </div>
              <p className="text-2xl font-bold">{formatAmount(portfolioStats.totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Risk Score</span>
              </div>
              <p className={`text-2xl font-bold ${getRiskColor(portfolioStats.riskScore)}`}>
                {portfolioStats.riskScore}/100
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Correlated Exposure</span>
              </div>
              <p className="text-2xl font-bold">{portfolioStats.correlatedExposure}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Diversification</span>
              </div>
              <Progress value={portfolioStats.diversificationScore} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Scan Button */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Analyze Portfolio</h3>
                <p className="text-sm text-muted-foreground">
                  Scan your positions for correlations and hedge opportunities
                </p>
              </div>
              <Button onClick={scanPortfolio} disabled={isScanning} className="gap-2">
                {isScanning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isScanning ? "Scanning..." : "Scan Portfolio"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="positions" className="gap-2">
              <Scale className="w-4 h-4" />
              Positions
              {positions.length > 0 && (
                <Badge variant="secondary">{positions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="hedges" className="gap-2">
              <Shield className="w-4 h-4" />
              Hedge Opportunities
              {hedgeOpportunities.length > 0 && (
                <Badge variant="secondary">{hedgeOpportunities.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Rebalance Rules
            </TabsTrigger>
          </TabsList>

          {/* Positions Tab */}
          <TabsContent value="positions">
            {positions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Positions Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Scan your portfolio to see your current positions
                  </p>
                  <Button onClick={scanPortfolio} disabled={isScanning}>
                    {isScanning ? "Scanning..." : "Scan Portfolio"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {positions.map((position) => (
                  <Card key={position.marketId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={position.outcome === "YES" ? "default" : "destructive"}
                              className={
                                position.outcome === "YES"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : ""
                              }
                            >
                              {position.outcome === "YES" ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {position.outcome}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {position.shares.toFixed(0)} shares
                            </span>
                          </div>
                          <p className="text-sm font-medium">{position.marketQuestion}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Value: {formatAmount(position.currentValue)}</span>
                            <span>Prob: {(position.probability * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <a
                          href={position.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          View →
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Hedge Opportunities Tab */}
          <TabsContent value="hedges">
            {hedgeOpportunities.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Hedge Opportunities</h3>
                  <p className="text-muted-foreground">
                    Scan your portfolio to find potential hedges
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {hedgeOpportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">Hedge for: {opportunity.sourcePosition.marketQuestion.slice(0, 50)}...</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                opportunity.confidence === "high"
                                  ? "default"
                                  : opportunity.confidence === "medium"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                opportunity.confidence === "high"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : ""
                              }
                            >
                              {opportunity.confidence} confidence
                            </Badge>
                            <span className="text-xs">
                              {(opportunity.correlation * 100).toFixed(0)}% correlation
                            </span>
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-emerald-400">
                          -{opportunity.riskReduction}% risk
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium">Suggested Hedge</span>
                        </div>
                        <p className="text-sm mb-3">{opportunity.hedgeMarket.question}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            Action:{" "}
                            <Badge variant={opportunity.suggestedAction === "BUY_YES" ? "default" : "destructive"}>
                              {opportunity.suggestedAction.replace("_", " ")}
                            </Badge>
                          </span>
                          <span>Amount: {formatAmount(opportunity.suggestedAmount)}</span>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3 mb-4">
                        <p className="text-xs text-muted-foreground">
                          <strong>AI Analysis:</strong> {opportunity.aiReasoning}
                        </p>
                      </div>
                      <Button
                        onClick={() => executeHedge(opportunity)}
                        className="w-full gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Execute Hedge
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rebalance Rules Tab */}
          <TabsContent value="rules">
            <div className="space-y-4">
              {rebalanceRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            rule.isActive ? "bg-emerald-500/20" : "bg-muted"
                          }`}
                        >
                          {rule.isActive ? (
                            <Play className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Pause className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{rule.name}</h3>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Settings2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Custom rules coming soon. Use built-in rules above.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
