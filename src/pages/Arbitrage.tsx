import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Settings, 
  LogOut, 
  Loader2, 
  Play, 
  Pause, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  BarChart3,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  type: 'mutually_exclusive' | 'exhaustive_incomplete' | 'parent_child';
  markets: {
    id: string;
    question: string;
    probability: number;
    url: string;
  }[];
  expectedProfit: number;
  requiredCapital: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  reason?: string;
}

interface ScanStats {
  marketsScanned: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalProfit: number;
  lastScanTime: string | null;
}

export default function Arbitrage() {
  const { balance, fetchBalance } = useUserBalance();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [stats, setStats] = useState<ScanStats>({
    marketsScanned: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: 0,
    lastScanTime: null,
  });
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

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
    setScanProgress(0);
    setScanStatus('Initializing scanner...');
    setOpportunities([]);

    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: { action: 'scan' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setOpportunities(data.opportunities || []);
      setStats({
        marketsScanned: data.marketsScanned || 0,
        opportunitiesFound: data.opportunities?.length || 0,
        tradesExecuted: stats.tradesExecuted,
        totalProfit: stats.totalProfit,
        lastScanTime: new Date().toISOString(),
      });

      toast({
        title: 'Scan Complete',
        description: `Found ${data.opportunities?.length || 0} arbitrage opportunities across ${data.marketsScanned || 0} markets.`,
      });
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan markets',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
      setScanProgress(100);
      setScanStatus('idle');
    }
  };

  const executeOpportunity = async (opportunity: ArbitrageOpportunity) => {
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

      // Update opportunity status
      setOpportunities(prev => prev.map(opp => 
        opp.id === opportunity.id 
          ? { ...opp, status: 'completed' as const }
          : opp
      ));

      // Update stats
      setStats(prev => ({
        ...prev,
        tradesExecuted: prev.tradesExecuted + 1,
        totalProfit: prev.totalProfit + opportunity.expectedProfit,
      }));

      await fetchBalance();

      toast({
        title: 'Trade Executed',
        description: `Successfully executed arbitrage for expected profit of M$${opportunity.expectedProfit.toFixed(2)}`,
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
      case 'mutually_exclusive': return 'Mutually Exclusive';
      case 'exhaustive_incomplete': return 'Exhaustive Set';
      case 'parent_child': return 'Parent-Child';
    }
  };

  const getRiskBadge = (risk: ArbitrageOpportunity['riskLevel']) => {
    switch (risk) {
      case 'low': return <Badge variant="success">Low Risk</Badge>;
      case 'medium': return <Badge variant="pending">Medium Risk</Badge>;
      case 'high': return <Badge variant="destructive">High Risk</Badge>;
    }
  };

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
            Automatically scan Manifold Markets for risk-adjusted arbitrage opportunities
          </p>
        </div>

        {/* Stats Overview */}
        <section className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Scanner Controls
            </CardTitle>
            <CardDescription>
              Scan markets for probability violations and arbitrage opportunities
            </CardDescription>
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

            <div className="flex flex-wrap items-center gap-4">
              <Button 
                onClick={handleScan}
                disabled={isScanning || !hasApiKey}
                className="gap-2"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Scan
                  </>
                )}
              </Button>

              {stats.lastScanTime && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Last scan: {new Date(stats.lastScanTime).toLocaleTimeString()}
                </div>
              )}
            </div>

            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{scanStatus}</span>
                  <span className="font-medium text-primary">{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} className="h-2" />
              </div>
            )}

            {/* Strategy Rules */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Active Strategy Rules
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Scan for mutually exclusive outcomes with probabilities summing &gt; 100%</li>
                <li>• Identify exhaustive outcome sets with probabilities summing &lt; 100%</li>
                <li>• Detect parent-child market inconsistencies</li>
                <li>• Skip markets with ambiguous or subjective resolution criteria</li>
                <li>• Abort trades exceeding 2% slippage bounds</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Arbitrage Opportunities
              </span>
              {opportunities.length > 0 && (
                <Badge variant="outline">{opportunities.length} found</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No arbitrage opportunities found yet.</p>
                <p className="text-sm mt-1">Run a scan to discover opportunities.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map((opp) => (
                  <Card key={opp.id} className="bg-secondary/20 border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getTypeLabel(opp.type)}</Badge>
                            {getRiskBadge(opp.riskLevel)}
                            {opp.status === 'completed' && (
                              <Badge variant="success">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Executed
                              </Badge>
                            )}
                            {opp.status === 'failed' && (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                            {opp.status === 'skipped' && (
                              <Badge variant="secondary">Skipped</Badge>
                            )}
                          </div>
                          <p className="text-foreground">{opp.description}</p>
                          {opp.reason && (
                            <p className="text-sm text-muted-foreground mt-1">Reason: {opp.reason}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Expected Profit</p>
                          <p className="text-xl font-bold text-success">+M${opp.expectedProfit.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            Capital: M${opp.requiredCapital.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Market Details */}
                      <div className="space-y-2 mb-4">
                        {opp.markets.map((market, idx) => (
                          <div key={market.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground truncate">{market.question}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-primary">
                                {(market.probability * 100).toFixed(1)}%
                              </span>
                              <a 
                                href={market.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      {opp.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => executeOpportunity(opp)}
                            disabled={isExecuting === opp.id || opp.requiredCapital > balance}
                            className="gap-2"
                          >
                            {isExecuting === opp.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            Execute Trade
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => skipOpportunity(opp.id, 'Manually skipped')}
                          >
                            Skip
                          </Button>
                          {opp.requiredCapital > balance && (
                            <span className="text-sm text-destructive">
                              Insufficient balance
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
