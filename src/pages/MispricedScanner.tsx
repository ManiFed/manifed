import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { toast } from '@/hooks/use-toast';
import trumpPortrait from '@/assets/trump-portrait.png';
import {
  ArrowLeft, Settings, LogOut, Loader2, Play, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle, ExternalLink, Brain, Sparkles, Sliders,
  ChevronDown, ChevronRight, Info, DollarSign
} from 'lucide-react';

interface MispricedMarket {
  id: string;
  question: string;
  probability: number;
  url: string;
  liquidity: number;
  volume: number;
  direction: 'underpriced' | 'overpriced';
  expectedProbability: number;
  profitPotential: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  category?: string;
}

export default function MispricedScanner() {
  const { balance } = useUserBalance();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [markets, setMarkets] = useState<MispricedMarket[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    minLiquidity: 100,
    minVolume: 50,
    includeUnderpriced: true,
    includeOverpriced: true,
    maxMarkets: 500,
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

    // Check MFAI credits (5 credits for mispriced scanner)
    try {
      const { data: usageData, error: usageError } = await supabase.functions.invoke('increment-usage', {
        body: { type: 'mfai_credits', amount: 5 }
      });

      if (usageError || !usageData?.success) {
        toast({
          title: 'Insufficient Credits',
          description: usageData?.message || 'You need 5 MFAI credits for this scan. Upgrade your plan for more!',
          variant: 'destructive',
        });
        return;
      }
    } catch (e) {
      console.error('Credit check failed:', e);
    }

    setIsScanning(true);
    setScanProgress(0);
    setMarkets([]);

    try {
      const { data, error } = await supabase.functions.invoke('mispriced-scanner', {
        body: { config }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScanProgress(100);
      setMarkets(data.markets || []);

      toast({
        title: 'Scan Complete',
        description: `Found ${data.markets?.length || 0} potentially mispriced markets.`,
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
      setScanProgress(0);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const underpricedMarkets = markets.filter(m => m.direction === 'underpriced');
  const overpricedMarkets = markets.filter(m => m.direction === 'overpriced');

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Trump Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-16 top-40 w-[500px] h-auto opacity-[0.05] rotate-6" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/mfai" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">Mispriced Scanner</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Find market inefficiencies</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="w-3 h-3" />
                M${balance.toLocaleString()}
              </Badge>
              <Link to="/mfai">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to MFAI</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Intro */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Mispriced Market <span className="text-gradient">Scanner</span>
          </h1>
          <p className="text-muted-foreground">
            AI-powered analysis to find markets where the current probability differs significantly 
            from the "true" probability. The fake news media gets it wrong all the time!
          </p>
          <p className="text-xs text-primary/70 mt-2 italic">
            "When they go low, we find their bad prices. Very unfair to them!" — DJT
          </p>
        </div>

        {/* Scan Controls */}
        <Card className="glass mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Start Scan</h3>
                <p className="text-sm text-muted-foreground">
                  Uses AI to identify potentially mispriced markets
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfig(!showConfig)}
                  className="gap-2"
                >
                  <Sliders className="w-4 h-4" />
                  Configure
                </Button>
                <Button
                  variant="glow"
                  onClick={handleScan}
                  disabled={isScanning}
                  className="gap-2"
                >
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isScanning ? 'Scanning...' : 'Scan Markets (5 credits)'}
                </Button>
              </div>
            </div>

            {isScanning && (
              <div className="space-y-2">
                <Progress value={scanProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Analyzing markets with AI...
                </p>
              </div>
            )}

            {showConfig && (
              <div className="mt-4 pt-4 border-t border-border/50 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Min Liquidity (M$)</Label>
                  <Input
                    type="number"
                    value={config.minLiquidity}
                    onChange={(e) => setConfig({ ...config, minLiquidity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Min Volume (M$)</Label>
                  <Input
                    type="number"
                    value={config.minVolume}
                    onChange={(e) => setConfig({ ...config, minVolume: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.includeUnderpriced}
                    onCheckedChange={(v) => setConfig({ ...config, includeUnderpriced: v })}
                  />
                  <Label>Include Underpriced</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.includeOverpriced}
                    onCheckedChange={(v) => setConfig({ ...config, includeOverpriced: v })}
                  />
                  <Label>Include Overpriced</Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {markets.length > 0 && (
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            {/* Underpriced */}
            {underpricedMarkets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Underpriced Markets ({underpricedMarkets.length})
                </h2>
                <div className="space-y-3">
                  {underpricedMarkets.map((market) => (
                    <Card key={market.id} className="bg-secondary/20 border-success/20">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="success" className="gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Underpriced
                              </Badge>
                              <Badge variant={market.confidence === 'high' ? 'default' : 'secondary'}>
                                {market.confidence} confidence
                              </Badge>
                            </div>
                            <a
                              href={market.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground font-medium hover:text-primary flex items-center gap-1"
                            >
                              {market.question}
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <p className="text-sm text-muted-foreground mt-2">{market.reasoning}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm text-muted-foreground">Current → Expected</p>
                            <p className="text-lg font-bold">
                              {(market.probability * 100).toFixed(0)}% → {(market.expectedProbability * 100).toFixed(0)}%
                            </p>
                            <p className="text-sm text-success">
                              +{(market.profitPotential * 100).toFixed(1)}% potential
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Overpriced */}
            {overpricedMarkets.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                  Overpriced Markets ({overpricedMarkets.length})
                </h2>
                <div className="space-y-3">
                  {overpricedMarkets.map((market) => (
                    <Card key={market.id} className="bg-secondary/20 border-destructive/20">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="destructive" className="gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Overpriced
                              </Badge>
                              <Badge variant={market.confidence === 'high' ? 'default' : 'secondary'}>
                                {market.confidence} confidence
                              </Badge>
                            </div>
                            <a
                              href={market.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-foreground font-medium hover:text-primary flex items-center gap-1"
                            >
                              {market.question}
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            <p className="text-sm text-muted-foreground mt-2">{market.reasoning}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm text-muted-foreground">Current → Expected</p>
                            <p className="text-lg font-bold">
                              {(market.probability * 100).toFixed(0)}% → {(market.expectedProbability * 100).toFixed(0)}%
                            </p>
                            <p className="text-sm text-destructive">
                              -{((market.probability - market.expectedProbability) * 100).toFixed(1)}% overvalued
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {markets.length === 0 && !isScanning && (
          <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-12 text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Scan</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Click "Scan Markets" to use AI to analyze prediction markets and find 
                opportunities where prices don't reflect true probabilities.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}