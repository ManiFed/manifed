import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import trumpPortrait from '@/assets/trump-portrait.png';
import { 
  ArrowLeft, ExternalLink, Loader2, Target, TrendingUp, 
  CheckCircle, Sparkles, AlertCircle, Clock, Zap, 
  ArrowUpRight, ArrowDownRight, Eye, Key, Shield
} from 'lucide-react';

interface PublicOpportunity {
  id: string;
  market_1_id: string;
  market_1_question: string;
  market_1_prob: number;
  market_1_url: string;
  market_1_position: string;
  market_2_id: string;
  market_2_question: string;
  market_2_prob: number;
  market_2_url: string;
  market_2_position: string;
  expected_profit: number;
  confidence: string;
  ai_analysis: string | null;
  status: string;
  created_at: string;
  executed_by: string | null;
  executed_at: string | null;
}

export default function PublicArbitrage() {
  const [opportunities, setOpportunities] = useState<PublicOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<PublicOpportunity | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [betAmount, setBetAmount] = useState('100');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchOpportunities();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('public_arbitrage_opportunities')
        .select('*')
        .eq('status', 'active')
        .order('expected_profit', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load opportunities',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteClick = (opp: PublicOpportunity) => {
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to execute trades',
        variant: 'destructive',
      });
      return;
    }
    setSelectedOpportunity(opp);
    setShowExecuteModal(true);
  };

  const handleExecute = async () => {
    if (!selectedOpportunity || !apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Manifold API key',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum bet amount is M$10',
        variant: 'destructive',
      });
      return;
    }

    setExecutingId(selectedOpportunity.id);
    try {
      // Call edge function to execute the trade with the one-time API key
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: {
          action: 'execute_public',
          opportunityId: selectedOpportunity.id,
          apiKey: apiKey,
          amount: amount,
          markets: [
            {
              id: selectedOpportunity.market_1_id,
              action: selectedOpportunity.market_1_position,
              optimalBet: amount / 2,
            },
            {
              id: selectedOpportunity.market_2_id,
              action: selectedOpportunity.market_2_position,
              optimalBet: amount / 2,
            },
          ],
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Mark opportunity as executed
      await supabase
        .from('public_arbitrage_opportunities')
        .update({
          status: 'executed',
          executed_by: (await supabase.auth.getUser()).data.user?.id,
          executed_at: new Date().toISOString(),
        })
        .eq('id', selectedOpportunity.id);

      toast({
        title: 'Trade Executed!',
        description: 'Your arbitrage trades have been placed successfully.',
      });

      // Remove from list
      setOpportunities(prev => prev.filter(o => o.id !== selectedOpportunity.id));
      setShowExecuteModal(false);
      setApiKey('');
      setSelectedOpportunity(null);
    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute trade',
        variant: 'destructive',
      });
    } finally {
      setExecutingId(null);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="success" className="gap-1"><Sparkles className="w-3 h-3" />High Confidence</Badge>;
      case 'medium':
        return <Badge variant="pending" className="gap-1"><AlertCircle className="w-3 h-3" />Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><AlertCircle className="w-3 h-3" />Low</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-16 top-40 w-[550px] h-auto opacity-[0.06] rotate-6" />
        <img src={trumpPortrait} alt="" className="absolute -left-24 bottom-10 w-[400px] h-auto opacity-[0.04] -rotate-12 scale-x-[-1]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3">
                <img alt="ManiFed" className="w-10 h-10 rounded-xl object-cover border-2 border-primary/50" src="/lovable-uploads/aba42d1d-db26-419d-8f65-dc8e5c6d2339.png" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                  <p className="text-xs text-muted-foreground -mt-0.5">Arbitrage Scanner</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/hub">
                  <Button variant="outline" size="sm">Dashboard</Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Hero Section */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Public Arbitrage Scanner</h1>
          </div>
          <p className="text-muted-foreground">
            Admin-verified arbitrage opportunities on Manifold Markets. Execute with your own API key - keys are NOT stored.
          </p>
          <div className="flex items-center gap-2 mt-2 text-sm text-primary">
            <Shield className="w-4 h-4" />
            <span>Your API key is used once and never saved</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{opportunities.length}</p>
              <p className="text-sm text-muted-foreground">Active Opportunities</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">
                {opportunities.filter(o => o.confidence === 'high').length}
              </p>
              <p className="text-sm text-muted-foreground">High Confidence</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {opportunities.length > 0 
                  ? `${(opportunities.reduce((sum, o) => sum + o.expected_profit, 0) / opportunities.length * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
              <p className="text-sm text-muted-foreground">Avg Expected Profit</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-sm text-muted-foreground">Updated by Admin</p>
            </CardContent>
          </Card>
        </div>

        {/* Opportunities List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : opportunities.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-16 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Active Opportunities</h3>
              <p className="text-muted-foreground">
                Check back later - our admin team scans for new opportunities regularly.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <Card key={opp.id} className="glass hover:border-primary/50 transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {getConfidenceBadge(opp.confidence)}
                        <Badge variant="secondary" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {(opp.expected_profit * 100).toFixed(1)}% profit
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleExecuteClick(opp)}
                      disabled={!!executingId}
                      className="gap-2"
                    >
                      {executingId === opp.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      Execute Trade
                    </Button>
                  </div>

                  {/* Markets */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={opp.market_1_position === 'BUY_YES' ? 'success' : 'destructive'} className="gap-1">
                          {opp.market_1_position === 'BUY_YES' ? (
                            <><ArrowUpRight className="w-3 h-3" /> BUY YES</>
                          ) : (
                            <><ArrowDownRight className="w-3 h-3" /> BUY NO</>
                          )}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          @ {(opp.market_1_prob * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 mb-2">{opp.market_1_question}</p>
                      <a
                        href={opp.market_1_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View on Manifold <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={opp.market_2_position === 'BUY_YES' ? 'success' : 'destructive'} className="gap-1">
                          {opp.market_2_position === 'BUY_YES' ? (
                            <><ArrowUpRight className="w-3 h-3" /> BUY YES</>
                          ) : (
                            <><ArrowDownRight className="w-3 h-3" /> BUY NO</>
                          )}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          @ {(opp.market_2_prob * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 mb-2">{opp.market_2_question}</p>
                      <a
                        href={opp.market_2_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View on Manifold <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  {opp.ai_analysis && (
                    <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Eye className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">AI Analysis</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{opp.ai_analysis}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-4">
                    Added {new Date(opp.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Execute Modal */}
      <Dialog open={showExecuteModal} onOpenChange={setShowExecuteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Execute Arbitrage Trade
            </DialogTitle>
            <DialogDescription>
              Enter your Manifold API key to execute this trade. Your key is used once and NOT stored.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm text-success font-medium">Expected Profit</p>
              <p className="text-2xl font-bold text-foreground">
                {((selectedOpportunity?.expected_profit || 0) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Manifold API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://manifold.markets/profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Manifold Settings
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Total Bet Amount (M$)</Label>
              <Input
                id="amount"
                type="number"
                min="10"
                placeholder="100"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Amount will be split between both markets
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 p-3 rounded-lg">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Your API key is transmitted securely and never saved to any database.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecute} disabled={!!executingId} className="gap-2">
              {executingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Execute Trade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
