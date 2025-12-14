import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { useAIArbitrage } from '@/hooks/useAIArbitrage';
import { WalletPopover } from '@/components/WalletPopover';
import { AIAnalysisCard } from '@/components/arbitrage/AIAnalysisCard';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Settings, LogOut, Loader2, Play, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle, Zap, BarChart3, ExternalLink, Shield, Clock, Sliders, AlertCircle, Activity, Droplets, ArrowUpRight, ArrowDownRight, Brain, Sparkles, Filter, Calendar, ChevronDown, ChevronRight, HelpCircle, Info, Users } from 'lucide-react';

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
    closeTime?: number;
    category?: string;
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
  confidence?: 'high' | 'medium' | 'low';
  closeDateScore?: number;
  categoryMatch?: boolean;
  canonicalEvent?: string;
}

interface ScanStats {
  marketsScanned: number;
  tradeableMarkets: number;
  filteredMarkets: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalProfit: number;
  lastScanTime: string | null;
  opportunitiesByConfidence: {
    high: number;
    medium: number;
    low: number;
  };
}

interface ScanConfig {
  minLiquidity: number;
  minVolume: number;
  baseThreshold: number;
  fullScan: boolean;
  maxMarkets: number;
  aiAnalysisEnabled: boolean;
  includeAllMarketTypes: boolean;
  focusThemes: string;
  focusCategories: string[];
  prioritizeNearClosing: boolean;
}

const CATEGORY_OPTIONS = [{
  value: 'politics_us',
  label: 'US Politics'
}, {
  value: 'politics_intl',
  label: 'International Politics'
}, {
  value: 'sports',
  label: 'Sports'
}, {
  value: 'crypto',
  label: 'Crypto'
}, {
  value: 'tech',
  label: 'Technology'
}, {
  value: 'entertainment',
  label: 'Entertainment'
}, {
  value: 'geopolitics',
  label: 'Geopolitics'
}, {
  value: 'science',
  label: 'Science'
}, {
  value: 'economics',
  label: 'Economics'
}];

const InfoTooltip = ({ content }: { content: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-4 h-4 text-muted-foreground cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function Arbitrage() {
  const {
    balance,
    fetchBalance
  } = useUserBalance();
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
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [stats, setStats] = useState<ScanStats>({
    marketsScanned: 0,
    tradeableMarkets: 0,
    filteredMarkets: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: 0,
    lastScanTime: null,
    opportunitiesByConfidence: {
      high: 0,
      medium: 0,
      low: 0
    }
  });
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [confirmingTrade, setConfirmingTrade] = useState<string | null>(null);
  const [config, setConfig] = useState<ScanConfig>({
    minLiquidity: 50,
    minVolume: 10,
    baseThreshold: 2,
    fullScan: true,
    maxMarkets: 50000,
    aiAnalysisEnabled: true,
    includeAllMarketTypes: true,
    focusThemes: '',
    focusCategories: [],
    prioritizeNearClosing: false
  });
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scanLockIdRef = useRef<string | null>(null);

  // Collapsible sections
  const [showQuestionable, setShowQuestionable] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  useEffect(() => {
    checkApiKey();
    checkActiveQueueStatus();
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const checkApiKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('user_manifold_settings').select('manifold_api_key').eq('user_id', user.id).maybeSingle();
    setHasApiKey(!!data?.manifold_api_key);
  };

  const checkActiveQueueStatus = async () => {
    // Only check if there's a queue - don't auto-resume scans
    const { data: activeScan } = await supabase
      .from('arbitrage_scan_locks')
      .select('*')
      .eq('status', 'scanning')
      .single();

    if (activeScan) {
      const { data: { user } } = await supabase.auth.getUser();
      if (activeScan.user_id !== user?.id) {
        // Another user is scanning - just show queue status, don't auto-start
        setQueuePosition(1);
      }
    }
  };

  const startProgressPolling = (lockId: string) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('arbitrage_scan_locks')
        .select('progress, markets_scanned, status')
        .eq('id', lockId)
        .single();

      if (data) {
        setScanProgress(data.progress || 0);
        if (data.markets_scanned) {
          setScanStatus(`Scanned ${data.markets_scanned.toLocaleString()} markets...`);
        }
        if (data.status === 'completed' || data.status === 'failed') {
          setScanProgress(100);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }
    }, 1000);
  };

  const handleScan = async () => {
    if (!hasApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first.',
        variant: 'destructive'
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Initializing scan...');
    setOpportunities([]);
    clearAnalysis();
    setQueuePosition(null);

    try {
      const focusThemesArray = config.focusThemes.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: {
          action: 'scan',
          config: {
            minLiquidity: config.minLiquidity,
            minVolume: config.minVolume,
            baseThreshold: config.baseThreshold / 100,
            dynamicThresholdEnabled: true,
            semanticMatchingEnabled: true,
            dryRun: false,
            fullScan: config.fullScan,
            maxMarkets: config.maxMarkets,
            includeAllMarketTypes: config.includeAllMarketTypes,
            focusThemes: focusThemesArray,
            focusCategories: config.focusCategories,
            prioritizeNearClosing: config.prioritizeNearClosing
          }
        }
      });

      if (error) throw error;
      
      if (data.queued) {
        setQueuePosition(data.queuePosition || 1);
        toast({
          title: 'Added to Queue',
          description: `Another scan is in progress. You are #${data.queuePosition} in line.`
        });
        // Poll for when it's our turn
        pollQueuePosition();
        return;
      }

      if (data.lockId) {
        scanLockIdRef.current = data.lockId;
        startProgressPolling(data.lockId);
      }

      if (data.error) throw new Error(data.error);

      setScanProgress(100);
      setScanStatus('Scan complete!');

      const opps = data.opportunities || [];
      setOpportunities(opps);
      setStats({
        marketsScanned: data.marketsScanned || 0,
        tradeableMarkets: data.tradeableMarkets || 0,
        filteredMarkets: data.filteredMarkets || 0,
        opportunitiesFound: opps.length,
        tradesExecuted: stats.tradesExecuted,
        totalProfit: stats.totalProfit,
        lastScanTime: new Date().toISOString(),
        opportunitiesByConfidence: data.opportunitiesByConfidence || {
          high: 0,
          medium: 0,
          low: 0
        }
      });

      // Run AI analysis on found opportunities if enabled
      if (config.aiAnalysisEnabled && opps.length > 0) {
        toast({
          title: 'Scan Complete',
          description: `Found ${opps.length} opportunities. Running AI analysis...`
        });
        const pairs = opps.filter((opp: ArbitrageOpportunity) => opp.markets.length >= 2).slice(0, 30)
        .map((opp: ArbitrageOpportunity) => ({
          market1: {
            id: opp.markets[0].id,
            question: opp.markets[0].question,
            probability: opp.markets[0].probability,
            liquidity: opp.markets[0].liquidity
          },
          market2: {
            id: opp.markets[1].id,
            question: opp.markets[1].question,
            probability: opp.markets[1].probability,
            liquidity: opp.markets[1].liquidity
          },
          expectedProfit: opp.expectedProfit,
          matchReason: opp.matchReason
        }));
        await analyzePairs(pairs);
        toast({
          title: 'AI Analysis Complete',
          description: `Analyzed ${pairs.length} opportunities with AI semantic matching.`
        });
      } else {
        toast({
          title: 'Scan Complete',
          description: `Found ${opps.length} opportunities across ${data.marketsScanned || 0} markets.`
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to scan markets',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanStatus('');
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  };

  const pollQueuePosition = async () => {
    const pollInterval = setInterval(async () => {
      const { data: activeScan } = await supabase
        .from('arbitrage_scan_locks')
        .select('*')
        .eq('status', 'scanning')
        .single();

      if (!activeScan) {
        // No active scan, notify user they can scan now
        clearInterval(pollInterval);
        setQueuePosition(null);
        setIsScanning(false);
        toast({
          title: 'Queue Cleared',
          description: 'You can now start your scan.',
        });
      }
    }, 3000);
  };

  const executeOpportunity = async (opportunity: ArbitrageOpportunity) => {
    if (confirmingTrade !== opportunity.id) {
      setConfirmingTrade(opportunity.id);
      return;
    }
    setConfirmingTrade(null);

    if (opportunity.requiredCapital > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need M$${opportunity.requiredCapital.toLocaleString()} but only have M$${balance.toLocaleString()}`,
        variant: 'destructive'
      });
      return;
    }
    setIsExecuting(opportunity.id);
    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: {
          action: 'execute',
          opportunityId: opportunity.id,
          markets: opportunity.markets
        }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setOpportunities(prev => prev.map(opp => opp.id === opportunity.id ? {
        ...opp,
        status: 'completed' as const
      } : opp));
      setStats(prev => ({
        ...prev,
        tradesExecuted: prev.tradesExecuted + 1,
        totalProfit: prev.totalProfit + opportunity.expectedProfit
      }));
      await fetchBalance();
      toast({
        title: 'Trade Executed',
        description: data.message
      });
    } catch (error) {
      console.error('Execution error:', error);
      setOpportunities(prev => prev.map(opp => opp.id === opportunity.id ? {
        ...opp,
        status: 'failed' as const,
        reason: error instanceof Error ? error.message : 'Unknown error'
      } : opp));
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Failed to execute trade',
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(null);
    }
  };

  const skipOpportunity = (opportunityId: string, reason: string) => {
    setOpportunities(prev => prev.map(opp => opp.id === opportunityId ? {
      ...opp,
      status: 'skipped' as const,
      reason
    } : opp));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const toggleCategory = (category: string) => {
    setConfig(c => ({
      ...c,
      focusCategories: c.focusCategories.includes(category) ? c.focusCategories.filter(cat => cat !== category) : [...c.focusCategories, category]
    }));
  };

  const getTypeLabel = (type: ArbitrageOpportunity['type']) => {
    switch (type) {
      case 'mutually_exclusive':
        return 'Opposite Pair';
      case 'exhaustive_incomplete':
        return 'Multi-Choice';
      case 'semantic_pair':
        return 'Semantic Match';
      case 'multi_market':
        return 'Multi-Market';
    }
  };

  const getTypeIcon = (type: ArbitrageOpportunity['type']) => {
    switch (type) {
      case 'mutually_exclusive':
        return <ArrowUpRight className="w-3 h-3" />;
      case 'exhaustive_incomplete':
        return <Activity className="w-3 h-3" />;
      case 'semantic_pair':
        return <Target className="w-3 h-3" />;
      case 'multi_market':
        return <BarChart3 className="w-3 h-3" />;
    }
  };

  const getRiskBadge = (risk: ArbitrageOpportunity['riskLevel']) => {
    switch (risk) {
      case 'low':
        return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" />Low Risk</Badge>;
      case 'medium':
        return <Badge variant="pending" className="gap-1"><AlertCircle className="w-3 h-3" />Medium</Badge>;
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />High Risk</Badge>;
    }
  };

  const getConfidenceBadge = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="success" className="gap-1"><Sparkles className="w-3 h-3" />High Confidence</Badge>;
      case 'medium':
        return <Badge variant="pending" className="gap-1"><HelpCircle className="w-3 h-3" />Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="gap-1 text-muted-foreground"><AlertCircle className="w-3 h-3" />Low</Badge>;
      default:
        return null;
    }
  };

  const formatCloseDate = (closeTime?: number) => {
    if (!closeTime) return null;
    const now = new Date();
    const daysUntil = Math.ceil((closeTime - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return <span className="text-destructive">{daysUntil}d</span>;
    if (daysUntil <= 30) return <span className="text-warning">{daysUntil}d</span>;
    return <span>{daysUntil}d</span>;
  };

  // Categorize opportunities
  const pendingOpps = opportunities.filter(o => o.status === 'pending');

  // High confidence: structurally high confidence AND (no AI analysis OR AI says valid)
  const highConfidenceOpps = pendingOpps.filter(o => {
    const aiAnalysis = getAnalysis(o.markets[0]?.id, o.markets[1]?.id);
    const aiValid = !config.aiAnalysisEnabled || !aiAnalysis || aiAnalysis.isValidArbitrage;
    return o.confidence === 'high' && aiValid;
  });

  // Questionable: medium confidence OR AI uncertain
  const questionableOpps = pendingOpps.filter(o => {
    const aiAnalysis = getAnalysis(o.markets[0]?.id, o.markets[1]?.id);
    const aiUncertain = aiAnalysis && aiAnalysis.confidence < 0.7 && aiAnalysis.confidence > 0.3;
    return (o.confidence === 'medium' || aiUncertain) && !highConfidenceOpps.includes(o);
  });

  // Invalid: AI says invalid OR low confidence
  const invalidOpps = pendingOpps.filter(o => {
    const aiAnalysis = getAnalysis(o.markets[0]?.id, o.markets[1]?.id);
    const aiInvalid = aiAnalysis && !aiAnalysis.isValidArbitrage;
    return (o.confidence === 'low' || aiInvalid) && !highConfidenceOpps.includes(o) && !questionableOpps.includes(o);
  });

  const completedOpportunities = opportunities.filter(o => o.status === 'completed' || o.status === 'failed' || o.status === 'skipped');

  const renderOpportunityCard = (opp: ArbitrageOpportunity, showConfidence = true) => (
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
              {showConfidence && getConfidenceBadge(opp.confidence)}
              <Badge variant="secondary" className="gap-1">
                <Droplets className="w-3 h-3" />
                Liq: {opp.liquidityScore.toFixed(0)}
              </Badge>
              {opp.similarityScore && <Badge variant="secondary" className="gap-1">
                  <Target className="w-3 h-3" />
                  {(opp.similarityScore * 100).toFixed(0)}% match
                </Badge>}
              {opp.categoryMatch && <Badge variant="outline" className="gap-1 text-primary">
                  <Filter className="w-3 h-3" />
                  Same Category
                </Badge>}
            </div>
            <p className="text-foreground font-medium">{opp.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>Threshold: {(opp.dynamicThreshold * 100).toFixed(2)}%</span>
              <span>•</span>
              <span>Impact: ~{(opp.priceImpactEstimate * 100).toFixed(1)}%</span>
              {opp.canonicalEvent && <>
                  <span>•</span>
                  <span className="text-primary">Event: {opp.canonicalEvent}</span>
                </>}
            </div>
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
          {opp.markets.slice(0, 4).map(market => (
            <div key={market.id} className="flex items-start gap-2 p-2 rounded bg-background/50 text-sm">
              <Badge variant={market.action === 'BUY_YES' ? 'success' : 'destructive'} className="shrink-0 text-xs">
                {market.action === 'BUY_YES' ? <><ArrowUpRight className="w-3 h-3 mr-1" />YES</> : <><ArrowDownRight className="w-3 h-3 mr-1" />NO</>}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{market.question}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>P: {(market.probability * 100).toFixed(1)}%</span>
                  {market.liquidity && <span>• Liq: M${market.liquidity.toFixed(0)}</span>}
                  {market.category && <span>• {market.category}</span>}
                  {market.closeTime && <span className="flex items-center gap-1">
                      • <Calendar className="w-3 h-3" /> {formatCloseDate(market.closeTime)}
                    </span>}
                </div>
              </div>
              <a href={market.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline shrink-0">
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
                    liquidity: opp.markets[0].liquidity
                  },
                  market2: {
                    id: opp.markets[1].id,
                    question: opp.markets[1].question,
                    probability: opp.markets[1].probability,
                    liquidity: opp.markets[1].liquidity
                  },
                  expectedProfit: opp.expectedProfit,
                  matchReason: opp.matchReason
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
          <Button variant="outline" size="sm" onClick={() => skipOpportunity(opp.id, 'Manually skipped')}>
            <XCircle className="w-4 h-4 mr-1" />
            Skip
          </Button>
          <Button 
            size="sm" 
            onClick={() => executeOpportunity(opp)} 
            disabled={isExecuting === opp.id}
            className={`gap-1 ${confirmingTrade === opp.id ? 'bg-destructive hover:bg-destructive/90' : ''}`}
          >
            {isExecuting === opp.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : confirmingTrade === opp.id ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {confirmingTrade === opp.id ? 'Confirm?' : 'Execute'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img alt="ManiFed" src="/lovable-uploads/aba42d1d-db26-419d-8f65-dc8e5c6d2339.png" className="w-10 h-10 rounded-xl object-cover border-primary/50 border-0" />
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
            Scans ALL Manifold Markets with structured semantic matching, close date awareness, and confidence scoring
          </p>
        </div>

        {/* Stats Overview */}
        <section className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
                    <Sparkles className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">High Confidence</p>
                    <p className="text-xl font-bold text-success">{stats.opportunitiesByConfidence.high}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <HelpCircle className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Questionable</p>
                    <p className="text-xl font-bold text-warning">{stats.opportunitiesByConfidence.medium}</p>
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
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="gap-2">
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
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-6">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  Scanner Configuration
                </h4>
                
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minLiquidity" className="flex items-center">
                      Min Liquidity (M$)
                      <InfoTooltip content="Minimum liquidity a market must have to be considered. Higher values reduce risk but may miss opportunities." />
                    </Label>
                    <Input 
                      id="minLiquidity" 
                      type="number" 
                      value={config.minLiquidity} 
                      onChange={e => setConfig(c => ({ ...c, minLiquidity: parseInt(e.target.value) || 0 }))} 
                      className="bg-background" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minVolume" className="flex items-center">
                      Min Volume (M$)
                      <InfoTooltip content="Minimum trading volume required. Markets with higher volume are more liquid and easier to trade." />
                    </Label>
                    <Input 
                      id="minVolume" 
                      type="number" 
                      value={config.minVolume} 
                      onChange={e => setConfig(c => ({ ...c, minVolume: parseInt(e.target.value) || 0 }))} 
                      className="bg-background" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="baseThreshold" className="flex items-center">
                      Base Threshold (%)
                      <InfoTooltip content="Minimum profit margin required before considering an opportunity. Adjusted dynamically based on liquidity and other factors." />
                    </Label>
                    <Input 
                      id="baseThreshold" 
                      type="number" 
                      step="0.5" 
                      value={config.baseThreshold} 
                      onChange={e => setConfig(c => ({ ...c, baseThreshold: parseFloat(e.target.value) || 2 }))} 
                      className="bg-background" 
                    />
                  </div>
                </div>

                {/* Focus Filters */}
                <div className="space-y-4">
                  <h5 className="text-sm font-medium flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Focus Filters (Optional)
                    <InfoTooltip content="Limit the scan to specific topics or categories. Leave empty to scan all markets." />
                  </h5>
                  
                  <div className="space-y-2">
                    <Label htmlFor="focusThemes" className="flex items-center">
                      Custom Themes/Entities (comma-separated)
                      <InfoTooltip content="Enter names, topics, or keywords to focus on. Example: 'Trump, Bitcoin, Super Bowl'" />
                    </Label>
                    <Textarea 
                      id="focusThemes" 
                      placeholder="e.g., Trump, AI, Bitcoin, Super Bowl" 
                      value={config.focusThemes} 
                      onChange={e => setConfig(c => ({ ...c, focusThemes: e.target.value }))} 
                      className="bg-background h-20" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to scan all markets. Add terms to focus on specific topics.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Category Filters
                      <InfoTooltip content="Click categories to toggle. Selected categories limit the scan to those topics only." />
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map(cat => (
                        <Badge 
                          key={cat.value} 
                          variant={config.focusCategories.includes(cat.value) ? 'default' : 'outline'} 
                          className="cursor-pointer transition-colors" 
                          onClick={() => toggleCategory(cat.value)}
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click to toggle. No selection = all categories.
                    </p>
                  </div>
                </div>
                
                {/* Toggles */}
                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="includeAllTypes" 
                      checked={config.includeAllMarketTypes} 
                      onCheckedChange={checked => setConfig(c => ({ ...c, includeAllMarketTypes: checked }))} 
                    />
                    <Label htmlFor="includeAllTypes" className="text-sm flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      All Market Types
                      <InfoTooltip content="Include binary, multiple choice, numeric, and other market types in the scan." />
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="prioritizeNearClosing" 
                      checked={config.prioritizeNearClosing} 
                      onCheckedChange={checked => setConfig(c => ({ ...c, prioritizeNearClosing: checked }))} 
                    />
                    <Label htmlFor="prioritizeNearClosing" className="text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Prioritize Near-Closing
                      <InfoTooltip content="Boost the score of markets closing soon. Useful for finding time-sensitive opportunities." />
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="aiAnalysis" 
                      checked={config.aiAnalysisEnabled} 
                      onCheckedChange={checked => setConfig(c => ({ ...c, aiAnalysisEnabled: checked }))} 
                    />
                    <Label htmlFor="aiAnalysis" className="text-sm flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI Analysis
                      <InfoTooltip content="Use AI to validate semantic equivalence of market pairs. Helps filter out false positives." />
                    </Label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={handleScan} disabled={isScanning || !hasApiKey || queuePosition !== null} className="gap-2" size="lg">
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning All Markets...
                  </>
                ) : queuePosition !== null ? (
                  <>
                    <Users className="w-4 h-4" />
                    In Queue (#{queuePosition})
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Full Scan
                  </>
                )}
              </Button>

              {queuePosition !== null && (
                <Badge variant="pending" className="gap-1">
                  <Users className="w-3 h-3" />
                  Waiting in queue - position #{queuePosition}
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
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {scanStatus || 'Fetching and analyzing markets...'}
                  </div>
                  <span>{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* High Confidence Opportunities */}
        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-success" />
                High Confidence Opportunities
              </span>
              {highConfidenceOpps.length > 0 && <Badge variant="success">{highConfidenceOpps.length} actionable</Badge>}
            </CardTitle>
            <CardDescription>
              Opportunities with high structural confidence and AI validation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highConfidenceOpps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No high confidence opportunities found.</p>
                <p className="text-sm mt-1">Run a scan or check the questionable section below.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {highConfidenceOpps.map(opp => renderOpportunityCard(opp, false))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questionable Opportunities (Collapsible) */}
        {questionableOpps.length > 0 && (
          <Card className="glass mb-8 border-warning/20">
            <CardHeader className="cursor-pointer" onClick={() => setShowQuestionable(!showQuestionable)}>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-warning">
                  <HelpCircle className="w-5 h-5" />
                  Questionable Opportunities
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="pending">{questionableOpps.length} need review</Badge>
                  {showQuestionable ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </div>
              </CardTitle>
              <CardDescription>
                Medium confidence matches - may be valid but need human verification
              </CardDescription>
            </CardHeader>
            {showQuestionable && (
              <CardContent>
                <div className="space-y-4">
                  {questionableOpps.map(opp => renderOpportunityCard(opp))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Invalid Opportunities (Collapsed by default) */}
        {invalidOpps.length > 0 && (
          <Card className="glass mb-8 border-destructive/20">
            <CardHeader className="cursor-pointer" onClick={() => setShowInvalid(!showInvalid)}>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="w-5 h-5" />
                  Invalid / Low Confidence
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-destructive">
                    {invalidOpps.length} filtered out
                  </Badge>
                  {showInvalid ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </div>
              </CardTitle>
              <CardDescription>
                Low confidence or AI-rejected opportunities (different events, timeframes, or semantics)
              </CardDescription>
            </CardHeader>
            {showInvalid && (
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invalidOpps.map(opp => {
                    const analysis = getAnalysis(opp.markets[0]?.id, opp.markets[1]?.id);
                    return (
                      <div key={opp.id} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground line-through">{opp.description}</p>
                            <div className="mt-1 space-y-1">
                              {opp.confidence === 'low' && (
                                <p className="text-xs text-destructive">
                                  Low structural confidence: {opp.matchReason}
                                </p>
                              )}
                              {analysis && !analysis.isValidArbitrage && (
                                <p className="text-xs text-destructive">
                                  AI: {analysis.reason} ({(analysis.confidence * 100).toFixed(0)}% confidence)
                                </p>
                              )}
                            </div>
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
                {completedOpportunities.map(opp => (
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
                        {opp.reason && <p className="text-xs text-muted-foreground">{opp.reason}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      {opp.status === 'completed' && <span className="text-success font-medium">+M${opp.expectedProfit.toFixed(2)}</span>}
                      {opp.status === 'failed' && <span className="text-destructive text-sm">Failed</span>}
                      {opp.status === 'skipped' && <span className="text-muted-foreground text-sm">Skipped</span>}
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
