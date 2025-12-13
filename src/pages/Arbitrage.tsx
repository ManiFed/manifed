import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useAIArbitrage } from '@/hooks/useAIArbitrage';
import { WalletPopover } from '@/components/WalletPopover';
import { AIAnalysisCard } from '@/components/arbitrage/AIAnalysisCard';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Settings, 
  LogOut, 
  Loader2, 
  Play, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
  ExternalLink,
  Shield,
  Clock,
  Eye,
  Sliders,
  AlertCircle,
  Activity,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Sparkles
} from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  type: 'mutually_exclusive' | 'exhaustive_incomplete' | 'semantic_pair' | 'multi_market';
  markets: {
    id: string;
    question: string;
    probability: number;
    url: string;
    liquidity?: number;
    volume?: number;
    action: 'BUY_YES' | 'BUY_NO';
    optimalBet?: number;
  }[];
  expectedProfit: number;
  maxLoss: number;
  expectedVariance: number;
  requiredCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  reason?: string;
  dynamicThreshold: number;
  liquidityScore: number;
  similarityScore?: number;
  priceImpactEstimate: number;
  matchReason?: string;
}

interface ScanStats {
  marketsScanned: number;
  tradeableMarkets: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalProfit: number;
  lastScanTime: string | null;
}

interface ScanConfig {
  minLiquidity: number;
  minVolume: number;
  baseThreshold: number;
  dynamicThresholdEnabled: boolean;
  semanticMatchingEnabled: boolean;
  dryRun: boolean;
  fullScan: boolean;
  maxMarkets: number;
  aiAnalysisEnabled: boolean;
}

export default function Arbitrage() {
  const { balance, fetchBalance } = useUserBalance();
  const { 
    isAnalyzing, 
    analyzePairs, 
    explainOpportunity, 
    submitFeedback, 
    getAnalysis, 
    explanations,
    clearAnalysis 
  } = useAIArbitrage();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [stats, setStats] = useState<ScanStats>({
    marketsScanned: 0,
    tradeableMarkets: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: 0,
    lastScanTime: null,
  });
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [confirmingTrade, setConfirmingTrade] = useState<string | null>(null);
  const [config, setConfig] = useState<ScanConfig>({
    minLiquidity: 50,
    minVolume: 10,
    baseThreshold: 2,
    dynamicThresholdEnabled: true,
    semanticMatchingEnabled: true,
    dryRun: true,
    fullScan: false,
    maxMarkets: 2000,
    aiAnalysisEnabled: true,
  });

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_manifold_settings')
      .select('manifold_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    setHasApiKey(!!data?.manifold_api_key);
  };

  const handleScan = async () => {
    if (!hasApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first.',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    setOpportunities([]);
    clearAnalysis();

    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: { 
          action: 'scan',
          config: {
            minLiquidity: config.minLiquidity,
            minVolume: config.minVolume,
            baseThreshold: config.baseThreshold / 100,
            dynamicThresholdEnabled: config.dynamicThresholdEnabled,
            semanticMatchingEnabled: config.semanticMatchingEnabled,
            dryRun: config.dryRun,
            fullScan: config.fullScan,
            maxMarkets: config.maxMarkets,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const opportunities = data.opportunities || [];
      setOpportunities(opportunities);
      setStats({
        marketsScanned: data.marketsScanned || 0,
        tradeableMarkets: data.tradeableMarkets || 0,
        opportunitiesFound: opportunities.length,
        tradesExecuted: stats.tradesExecuted,
        totalProfit: stats.totalProfit,
        lastScanTime: new Date().toISOString(),
      });

      // Run AI analysis on found opportunities if enabled
      if (config.aiAnalysisEnabled && opportunities.length > 0) {
        toast({
          title: 'Scan Complete',
          description: `Found ${opportunities.length} opportunities. Running AI analysis...`,
        });

        const pairs = opportunities
          .filter((opp: ArbitrageOpportunity) => opp.markets.length >= 2)
          .map((opp: ArbitrageOpportunity) => ({
            market1: {
              id: opp.markets[0].id,
              question: opp.markets[0].question,
              probability: opp.markets[0].probability,
              liquidity: opp.markets[0].liquidity,
            },
            market2: {
              id: opp.markets[1].id,
              question: opp.markets[1].question,
              probability: opp.markets[1].probability,
              liquidity: opp.markets[1].liquidity,
            },
            expectedProfit: opp.expectedProfit,
            matchReason: opp.matchReason,
          }));

        await analyzePairs(pairs);

        toast({
          title: 'AI Analysis Complete',
          description: `Analyzed ${pairs.length} opportunities with AI semantic matching.`,
        });
      } else {
        toast({
          title: 'Scan Complete',
          description: `Found ${opportunities.length} opportunities across ${data.marketsScanned || 0} markets.`,
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan markets',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const executeOpportunity = async (opportunity: ArbitrageOpportunity) => {
    // Always require confirmation first
    if (confirmingTrade !== opportunity.id) {
      setConfirmingTrade(opportunity.id);
      return;
    }
    
    setConfirmingTrade(null);
    
    if (config.dryRun) {
      toast({
        title: 'Dry Run Mode',
        description: 'Disable dry run mode in settings to execute real trades.',
      });
      return;
    }

    if (opportunity.requiredCapital > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need M$${opportunity.requiredCapital.toLocaleString()} but only have M$${balance.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }

    setIsExecuting(opportunity.id);

    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: { 
          action: 'execute',
          opportunityId: opportunity.id,
          markets: opportunity.markets,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setOpportunities(prev => prev.map(opp => 
        opp.id === opportunity.id 
          ? { ...opp, status: 'completed' as const }
          : opp
      ));

      setStats(prev => ({
        ...prev,
        tradesExecuted: prev.tradesExecuted + 1,
        totalProfit: prev.totalProfit + opportunity.expectedProfit,
      }));

      await fetchBalance();

      toast({
        title: 'Trade Executed',
        description: data.message,
      });
    } catch (error) {
      console.error('Execution error:', error);
      setOpportunities(prev => prev.map(opp => 
        opp.id === opportunity.id 
          ? { ...opp, status: 'failed' as const, reason: error instanceof Error ? error.message : 'Unknown error' }
          : opp
      ));
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute trade',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(null);
    }
  };

  const skipOpportunity = (opportunityId: string, reason: string) => {
    setOpportunities(prev => prev.map(opp => 
      opp.id === opportunityId 
        ? { ...opp, status: 'skipped' as const, reason }
        : opp
    ));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getTypeLabel = (type: ArbitrageOpportunity['type']) => {
    switch (type) {
      case 'mutually_exclusive': return 'Opposite Pair';
      case 'exhaustive_incomplete': return 'Multi-Choice';
      case 'semantic_pair': return 'Semantic Match';
      case 'multi_market': return 'Multi-Market';
    }
  };

  const getTypeIcon = (type: ArbitrageOpportunity['type']) => {
    switch (type) {
      case 'mutually_exclusive': return <ArrowUpRight className="w-3 h-3" />;
      case 'exhaustive_incomplete': return <Activity className="w-3 h-3" />;
      case 'semantic_pair': return <Target className="w-3 h-3" />;
      case 'multi_market': return <BarChart3 className="w-3 h-3" />;
    }
  };

  const getRiskBadge = (risk: ArbitrageOpportunity['riskLevel']) => {
    switch (risk) {
      case 'low': return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" />Low Risk</Badge>;
      case 'medium': return <Badge variant="pending" className="gap-1"><AlertCircle className="w-3 h-3" />Medium</Badge>;
      case 'high': return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />High Risk</Badge>;
    }
  };

  const [showInvalid, setShowInvalid] = useState(false);
  
  // Separate valid vs invalid based on AI analysis
  const pendingOpportunities = opportunities.filter(o => {
    if (o.status !== 'pending') return false;
    if (!config.aiAnalysisEnabled) return true;
    const analysis = getAnalysis(o.markets[0]?.id, o.markets[1]?.id);
    return !analysis || analysis.isValidArbitrage;
  });
  
  const invalidOpportunities = opportunities.filter(o => {
    if (o.status !== 'pending') return false;
    if (!config.aiAnalysisEnabled) return false;
    const analysis = getAnalysis(o.markets[0]?.id, o.markets[1]?.id);
    return analysis && !analysis.isValidArbitrage;
  });
  
  const completedOpportunities = opportunities.filter(o => o.status === 'completed' || o.status === 'failed' || o.status === 'skipped');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img 
                alt="ManiFed" 
                className="w-10 h-10 rounded-xl object-cover border-2 border-primary/50"
                src="/lovable-uploads/aba42d1d-db26-419d-8f65-dc8e5c6d2339.png"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Arbitrage Agent</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <WalletPopover balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Link to="/hub" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Hub
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            Arbitrage Execution Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            Scans 1000+ Manifold Markets for risk-adjusted arbitrage using semantic matching and dynamic thresholds
          </p>
        </div>

        {/* Stats Overview */}
        <section className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Markets Scanned</p>
                    <p className="text-xl font-bold text-foreground">{stats.marketsScanned.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <Droplets className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tradeable</p>
                    <p className="text-xl font-bold text-foreground">{stats.tradeableMarkets.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Target className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Opportunities</p>
                    <p className="text-xl font-bold text-foreground">{stats.opportunitiesFound}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Trades Executed</p>
                    <p className="text-xl font-bold text-foreground">{stats.tradesExecuted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Profit</p>
                    <p className="text-xl font-bold text-success">M${stats.totalProfit.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Scanner Controls */}
        <Card className="glass mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Scanner Controls
                </CardTitle>
                <CardDescription>
                  Configure and run the arbitrage scanner
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowConfig(!showConfig)}
                className="gap-2"
              >
                <Sliders className="w-4 h-4" />
                {showConfig ? 'Hide' : 'Show'} Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasApiKey && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  API Key Required
                </div>
                <p className="text-sm mt-1">
                  Please <Link to="/settings" className="underline">connect your Manifold account</Link> to use the arbitrage scanner.
                </p>
              </div>
            )}

            {/* Configuration Panel */}
            {showConfig && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Scanner Configuration
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minLiquidity">Min Liquidity (M$)</Label>
                    <Input
                      id="minLiquidity"
                      type="number"
                      value={config.minLiquidity}
                      onChange={(e) => setConfig(c => ({ ...c, minLiquidity: parseInt(e.target.value) || 0 }))}
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minVolume">Min Volume (M$)</Label>
                    <Input
                      id="minVolume"
                      type="number"
                      value={config.minVolume}
                      onChange={(e) => setConfig(c => ({ ...c, minVolume: parseInt(e.target.value) || 0 }))}
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="baseThreshold">Base Threshold (%)</Label>
                    <Input
                      id="baseThreshold"
                      type="number"
                      step="0.5"
                      value={config.baseThreshold}
                      onChange={(e) => setConfig(c => ({ ...c, baseThreshold: parseFloat(e.target.value) || 2 }))}
                      className="bg-background"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="dynamicThreshold"
                      checked={config.dynamicThresholdEnabled}
                      onCheckedChange={(checked) => setConfig(c => ({ ...c, dynamicThresholdEnabled: checked }))}
                    />
                    <Label htmlFor="dynamicThreshold" className="text-sm">Dynamic Thresholds</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="semanticMatching"
                      checked={config.semanticMatchingEnabled}
                      onCheckedChange={(checked) => setConfig(c => ({ ...c, semanticMatchingEnabled: checked }))}
                    />
                    <Label htmlFor="semanticMatching" className="text-sm">Semantic Matching</Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="fullScan"
                      checked={config.fullScan}
                      onCheckedChange={(checked) => setConfig(c => ({ ...c, fullScan: checked }))}
                    />
                    <Label htmlFor="fullScan" className="text-sm flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Full Scan (All Markets)
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="dryRun"
                      checked={config.dryRun}
                      onCheckedChange={(checked) => setConfig(c => ({ ...c, dryRun: checked }))}
                    />
                    <Label htmlFor="dryRun" className="text-sm flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      Dry Run Mode
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="aiAnalysis"
                      checked={config.aiAnalysisEnabled}
                      onCheckedChange={(checked) => setConfig(c => ({ ...c, aiAnalysisEnabled: checked }))}
                    />
                    <Label htmlFor="aiAnalysis" className="text-sm flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI Analysis
                    </Label>
                  </div>
                </div>
                
                {!config.fullScan && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="maxMarkets">Max Markets to Scan</Label>
                    <Input
                      id="maxMarkets"
                      type="number"
                      value={config.maxMarkets}
                      onChange={(e) => setConfig(c => ({ ...c, maxMarkets: parseInt(e.target.value) || 2000 }))}
                      className="bg-background w-32"
                      min={100}
                      max={10000}
                      step={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher = more opportunities found, but slower scan
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Button 
                onClick={handleScan}
                disabled={isScanning || !hasApiKey}
                className="gap-2"
                size="lg"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning 1000+ Markets...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Scan
                  </>
                )}
              </Button>

              {config.dryRun && (
                <Badge variant="outline" className="gap-1">
                  <Eye className="w-3 h-3" />
                  Dry Run Mode - No Real Trades
                </Badge>
              )}

              {stats.lastScanTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Last scan: {new Date(stats.lastScanTime).toLocaleTimeString()}
                </div>
              )}
            </div>

            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching and analyzing markets with semantic matching...
                </div>
                <Progress value={undefined} className="h-2" />
              </div>
            )}

            {/* Strategy Rules */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Active Strategy Rules
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 grid md:grid-cols-2 gap-x-4">
                <li>• Scan 1000+ markets using pagination</li>
                <li>• Semantic similarity detection for market pairs</li>
                <li>• Detect opposite questions (win/lose, yes/no)</li>
                <li>• Multi-choice markets with inconsistent probabilities</li>
                <li>• Multi-market event arbitrage (elections, sports)</li>
                <li>• Dynamic thresholds based on liquidity</li>
                <li>• Price impact estimation before execution</li>
                <li>• 5% slippage bounds with limit orders</li>
                <li>• Skip subjective resolution criteria</li>
                <li>• Risk-adjusted opportunity scoring</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Pending Opportunities */}
        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Pending Opportunities
              </span>
              {pendingOpportunities.length > 0 && (
                <Badge variant="outline">{pendingOpportunities.length} actionable</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOpportunities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending opportunities.</p>
                <p className="text-sm mt-1">Run a scan to discover arbitrage opportunities.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOpportunities.map((opp) => (
                  <Card key={opp.id} className="bg-secondary/20 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className="gap-1">
                              {getTypeIcon(opp.type)}
                              {getTypeLabel(opp.type)}
                            </Badge>
                            {getRiskBadge(opp.riskLevel)}
                            <Badge variant="secondary" className="gap-1">
                              <Droplets className="w-3 h-3" />
                              Liq: {opp.liquidityScore.toFixed(0)}
                            </Badge>
                            {opp.similarityScore && (
                              <Badge variant="secondary" className="gap-1">
                                <Target className="w-3 h-3" />
                                {(opp.similarityScore * 100).toFixed(0)}% match
                              </Badge>
                            )}
                          </div>
                          <p className="text-foreground font-medium">{opp.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Threshold: {(opp.dynamicThreshold * 100).toFixed(2)}% | 
                            Impact: ~{(opp.priceImpactEstimate * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-muted-foreground">Expected Profit</p>
                          <p className="text-xl font-bold text-success">+M${opp.expectedProfit.toFixed(2)}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="text-destructive">Max Loss: M${opp.maxLoss.toFixed(2)}</span>
                            <span className="mx-1">•</span>
                            <span>Capital: M${opp.requiredCapital}</span>
                          </div>
                        </div>
                      </div>

                      {/* Markets involved */}
                      <div className="space-y-2 mb-4">
                        {opp.markets.slice(0, 4).map((market, idx) => (
                          <div key={market.id} className="flex items-start gap-2 p-2 rounded bg-background/50 text-sm">
                            <Badge 
                              variant={market.action === 'BUY_YES' ? 'success' : 'destructive'} 
                              className="shrink-0 text-xs"
                            >
                              {market.action === 'BUY_YES' ? (
                                <><ArrowUpRight className="w-3 h-3 mr-1" />YES</>
                              ) : (
                                <><ArrowDownRight className="w-3 h-3 mr-1" />NO</>
                              )}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground truncate">{market.question}</p>
                              <p className="text-xs text-muted-foreground">
                                P: {(market.probability * 100).toFixed(1)}%
                                {market.liquidity && ` • Liq: M$${market.liquidity.toFixed(0)}`}
                              </p>
                            </div>
                            <a 
                              href={market.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline shrink-0"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                        {opp.markets.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{opp.markets.length - 4} more markets
                          </p>
                        )}
                      </div>

                      {/* AI Analysis Card */}
                      {config.aiAnalysisEnabled && opp.markets.length >= 2 && (
                        <div className="mb-4">
                          <AIAnalysisCard
                            opportunityId={opp.id}
                            market1={{ id: opp.markets[0].id, question: opp.markets[0].question }}
                            market2={{ id: opp.markets[1].id, question: opp.markets[1].question }}
                            opportunityType={opp.type}
                            expectedProfit={opp.expectedProfit}
                            analysis={getAnalysis(opp.markets[0].id, opp.markets[1].id)}
                            explanation={explanations[`${opp.markets[0].id}_${opp.markets[1].id}`]}
                            isLoadingExplanation={loadingExplanation === opp.id}
                            onRequestExplanation={async () => {
                              setLoadingExplanation(opp.id);
                              await explainOpportunity({
                                market1: {
                                  id: opp.markets[0].id,
                                  question: opp.markets[0].question,
                                  probability: opp.markets[0].probability,
                                  liquidity: opp.markets[0].liquidity,
                                },
                                market2: {
                                  id: opp.markets[1].id,
                                  question: opp.markets[1].question,
                                  probability: opp.markets[1].probability,
                                  liquidity: opp.markets[1].liquidity,
                                },
                                expectedProfit: opp.expectedProfit,
                                matchReason: opp.matchReason,
                              });
                              setLoadingExplanation(null);
                            }}
                            onSubmitFeedback={async (isValid, reason) => {
                              const analysis = getAnalysis(opp.markets[0].id, opp.markets[1].id);
                              return await submitFeedback(
                                opp.id,
                                { id: opp.markets[0].id, question: opp.markets[0].question },
                                { id: opp.markets[1].id, question: opp.markets[1].question },
                                opp.type,
                                opp.expectedProfit,
                                isValid,
                                reason,
                                analysis?.confidence,
                                analysis?.reason
                              );
                            }}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => skipOpportunity(opp.id, 'Manually skipped')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Skip
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => executeOpportunity(opp)}
                          disabled={isExecuting === opp.id}
                          className="gap-1"
                        >
                          {isExecuting === opp.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : config.dryRun ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          {config.dryRun ? 'Preview' : 'Execute'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invalid Opportunities (Collapsed by default) */}
        {invalidOpportunities.length > 0 && (
          <Card className="glass mb-8 border-destructive/20">
            <CardHeader 
              className="cursor-pointer" 
              onClick={() => setShowInvalid(!showInvalid)}
            >
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="w-5 h-5" />
                  Invalid Opportunities (AI Filtered)
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-destructive">
                    {invalidOpportunities.length} filtered out
                  </Badge>
                  <Button variant="ghost" size="sm">
                    {showInvalid ? 'Hide' : 'Show'}
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                These opportunities were flagged as invalid by AI analysis (different events, timeframes, or semantics)
              </CardDescription>
            </CardHeader>
            {showInvalid && (
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invalidOpportunities.map((opp) => {
                    const analysis = getAnalysis(opp.markets[0]?.id, opp.markets[1]?.id);
                    return (
                      <div key={opp.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground line-through">{opp.description}</p>
                            {analysis && (
                              <p className="text-xs text-destructive mt-1">
                                AI: {analysis.reason} ({(analysis.confidence * 100).toFixed(0)}% confidence)
                              </p>
                            )}
                          </div>
                          <Badge variant="destructive" className="shrink-0">Invalid</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Completed/History */}
        {completedOpportunities.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Trade History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedOpportunities.map((opp) => (
                  <div 
                    key={opp.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      opp.status === 'completed' ? 'bg-success/10' :
                      opp.status === 'failed' ? 'bg-destructive/10' :
                      'bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {opp.status === 'completed' && <CheckCircle className="w-5 h-5 text-success" />}
                      {opp.status === 'failed' && <XCircle className="w-5 h-5 text-destructive" />}
                      {opp.status === 'skipped' && <AlertCircle className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <p className="text-sm text-foreground">{opp.description}</p>
                        {opp.reason && (
                          <p className="text-xs text-muted-foreground">{opp.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {opp.status === 'completed' && (
                        <span className="text-success font-medium">+M${opp.expectedProfit.toFixed(2)}</span>
                      )}
                      {opp.status === 'failed' && (
                        <span className="text-destructive text-sm">Failed</span>
                      )}
                      {opp.status === 'skipped' && (
                        <span className="text-muted-foreground text-sm">Skipped</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
