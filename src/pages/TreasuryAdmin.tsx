import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAIArbitrage } from '@/hooks/useAIArbitrage';

interface BondRate {
  id: string;
  term_weeks: number;
  annual_yield: number;
  monthly_yield: number;
  effective_date: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

interface Loan {
  id: string;
  title: string;
  borrower_username: string;
  amount: number;
  status: string;
  created_at: string;
  risk_score: string;
  funded_amount: number;
  is_verified: boolean;
  research_fee_paid: boolean;
  research_fee_amount: number | null;
  loan_type: string;
}

interface TradingBot {
  id: string;
  name: string;
  strategy: string;
  description: string;
  is_active: boolean;
  config: Record<string, unknown>;
  last_run_at: string | null;
  total_profit: number;
  total_trades: number;
}

interface ProductSuggestion {
  id: string;
  title: string;
  description: string;
  status: string;
  user_id: string;
  admin_notes: string | null;
  created_at: string;
}

interface ArbitrageOpportunity {
  id: string;
  market_1_id: string;
  market_1_question: string;
  market_1_url: string;
  market_1_prob: number;
  market_1_position: string;
  market_2_id: string;
  market_2_question: string;
  market_2_url: string;
  market_2_prob: number;
  market_2_position: string;
  expected_profit: number;
  confidence: string;
  status: string;
  ai_analysis: string | null;
  created_at: string;
}

interface ScanOpportunity {
  id: string;
  type: string;
  markets: {
    id: string;
    question: string;
    probability: number;
    url: string;
    liquidity?: number;
    action: 'BUY_YES' | 'BUY_NO';
  }[];
  expectedProfit: number;
  confidence?: 'high' | 'medium' | 'low';
  matchReason?: string;
}

interface ScanConfig {
  minLiquidity: number;
  minVolume: number;
  baseThreshold: number;
  fullScan: boolean;
  maxMarkets: number;
  aiAnalysisEnabled: boolean;
}

const TERM_LABELS: Record<number, string> = {
  4: '4 Week T-Bond',
  13: '3 Month T-Bond',
  26: '6 Month T-Bond',
  52: '1 Year T-Bond',
};

const BOT_STRATEGIES = [
  { id: 'market_maker', name: 'Market Maker', description: 'Provides liquidity by placing YES/NO orders at spread.' },
  { id: 'mispriced_hunter', name: 'Mispriced Hunter', description: 'Bets against markets with prices far from calibration data.' },
  { id: 'overleveraged', name: 'Overleveraged Trader Fader', description: 'Fades positions from traders with high leverage and poor calibration.' },
  { id: 'calibration_arb', name: 'Calibration Arbitrage', description: 'Uses historical Manifold calibration data to find edge.' },
  { id: 'big_bad_bet', name: 'BigBadBetUser', description: 'Aggressive contrarian betting on highly confident markets.' },
];

export default function TreasuryAdmin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rates, setRates] = useState<BondRate[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([]);
  
  // New rate form
  const [newRate, setNewRate] = useState({ term_weeks: 4, annual_yield: 6, monthly_yield: 0.5 });
  const [isSavingRate, setIsSavingRate] = useState(false);
  
  // New news form
  const [newNews, setNewNews] = useState({ title: '', content: '' });
  const [isSavingNews, setIsSavingNews] = useState(false);

  // Loan moderation
  const [processingLoan, setProcessingLoan] = useState<string | null>(null);

  // Bot management
  const [processingBot, setProcessingBot] = useState<string | null>(null);
  const [showNewBot, setShowNewBot] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', strategy: 'market_maker', description: '' });
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [togglingEmergencyStop, setTogglingEmergencyStop] = useState(false);
  const [runningBots, setRunningBots] = useState(false);

  // Suggestions
  const [processingSuggestion, setProcessingSuggestion] = useState<string | null>(null);

  // Arbitrage - manual entry
  const [showNewArbitrage, setShowNewArbitrage] = useState(false);
  const [processingArbitrage, setProcessingArbitrage] = useState<string | null>(null);
  const [newArbitrage, setNewArbitrage] = useState({
    market_1_question: '',
    market_1_url: '',
    market_1_prob: 50,
    market_1_position: 'YES',
    market_2_question: '',
    market_2_url: '',
    market_2_prob: 50,
    market_2_position: 'NO',
    expected_profit: 5,
    confidence: 'medium',
    ai_analysis: '',
  });

  // AI Scan
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [scannedOpportunities, setScannedOpportunities] = useState<ScanOpportunity[]>([]);
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    minLiquidity: 50,
    minVolume: 10,
    baseThreshold: 2,
    fullScan: true,
    maxMarkets: 50000,
    aiAnalysisEnabled: true,
  });
  const scanHistoryIdRef = useRef<string | null>(null);
  
  const { analyzePairs, getAnalysis, clearAnalysis } = useAIArbitrage();

  // Index Funds
  const [indexFunds, setIndexFunds] = useState<TradingBot[]>([]);
  const [showNewIndexFund, setShowNewIndexFund] = useState(false);
  const [processingIndexFund, setProcessingIndexFund] = useState<string | null>(null);
  const [newIndexFund, setNewIndexFund] = useState({
    name: '',
    description: '',
    markets: [] as { id: string; question: string; url: string; probability: number; allocation: number }[],
  });
  const [newMarketInput, setNewMarketInput] = useState({ question: '', url: '', probability: 50, allocation: 25 });

  // Bot Strategies
  const [botStrategies, setBotStrategies] = useState<TradingBot[]>([]);
  const [showNewStrategy, setShowNewStrategy] = useState(false);
  const [processingStrategy, setProcessingStrategy] = useState<string | null>(null);
  const [newStrategy, setNewStrategy] = useState({ name: '', description: '', codeSnippet: '' });

  // Treasury Management
  const [wipeUserId, setWipeUserId] = useState('');
  const [wipingAccount, setWipingAccount] = useState(false);
  const [testBondId, setTestBondId] = useState('');
  const [testingBond, setTestingBond] = useState(false);

  // NAVLOC Applications
  const [navlocApplications, setNavlocApplications] = useState<any[]>([]);
  const [processingNavloc, setProcessingNavloc] = useState<string | null>(null);
  const [navlocApprovalForm, setNavlocApprovalForm] = useState({
    credit_grade: 'B',
    credit_limit: 5000,
    interest_rate: 8.5,
  });

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: isAdminResult, error: roleError } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError) {
        console.error('Error checking admin role:', roleError);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setIsAdmin(isAdminResult);

      if (isAdminResult) {
        // Fetch current rates
        const { data: ratesData } = await supabase
          .from('bond_rates')
          .select('*')
          .order('effective_date', { ascending: false });
        if (ratesData) setRates(ratesData);

        // Fetch news
        const { data: newsData } = await supabase
          .from('treasury_news')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(10);
        if (newsData) setNews(newsData);

        // Fetch all loans for moderation
        const { data: loansData } = await supabase
          .from('loans')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (loansData) setLoans(loansData);

        // Fetch bots
        const { data: botsData } = await supabase
          .from('trading_bots')
          .select('*')
          .order('created_at', { ascending: false });
        if (botsData) setBots(botsData as TradingBot[]);

        // Fetch product suggestions
        const { data: suggestionsData } = await supabase
          .from('product_suggestions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (suggestionsData) setSuggestions(suggestionsData as ProductSuggestion[]);

        // Fetch arbitrage opportunities
        const { data: arbitrageData } = await supabase
          .from('public_arbitrage_opportunities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (arbitrageData) setArbitrageOpportunities(arbitrageData as ArbitrageOpportunity[]);

        // Fetch index funds
        const { data: indexFundsData } = await supabase
          .from('trading_bots')
          .select('*')
          .eq('strategy', 'index_fund')
          .order('created_at', { ascending: false });
        if (indexFundsData) setIndexFunds(indexFundsData as TradingBot[]);

        // Fetch bot strategies for playground
        const { data: strategiesData } = await supabase
          .from('trading_bots')
          .select('*')
          .eq('strategy', 'playground_strategy')
          .order('created_at', { ascending: false });
        if (strategiesData) setBotStrategies(strategiesData as TradingBot[]);

        // Fetch emergency stop status
        const { data: stopData } = await supabase
          .from('trading_bot_settings')
          .select('setting_value')
          .eq('setting_key', 'emergency_stop')
          .single();
        if (stopData) setEmergencyStop(stopData.setting_value === 'true');

        // Fetch NAVLOC applications
        const { data: navlocData } = await supabase
          .from('navloc_applications')
          .select('*')
          .order('created_at', { ascending: false });
        if (navlocData) setNavlocApplications(navlocData);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // AI Scan handler
  const handleAIScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Initializing scan...');
    setScannedOpportunities([]);
    clearAnalysis();

    try {
      const { data, error } = await supabase.functions.invoke('arbitrage-scan', {
        body: {
          action: 'scan',
          config: {
            minLiquidity: scanConfig.minLiquidity,
            minVolume: scanConfig.minVolume,
            baseThreshold: scanConfig.baseThreshold / 100,
            dynamicThresholdEnabled: true,
            semanticMatchingEnabled: true,
            dryRun: false,
            fullScan: scanConfig.fullScan,
            maxMarkets: scanConfig.maxMarkets,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.historyId) {
        scanHistoryIdRef.current = data.historyId;
      }

      setScanProgress(100);
      setScanStatus('Scan complete!');
      const opps = data.opportunities || [];
      setScannedOpportunities(opps);

      toast({
        title: 'Scan Complete',
        description: `Found ${opps.length} opportunities across ${data.marketsScanned || 0} markets.`
      });
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
    }
  };

  // Publish scanned opportunity to public list
  const publishScannedOpportunity = async (opp: ScanOpportunity) => {
    if (opp.markets.length < 2) {
      toast({ title: 'Invalid', description: 'Need at least 2 markets', variant: 'destructive' });
      return;
    }

    try {
      const aiAnalysis = getAnalysis(opp.markets[0]?.id, opp.markets[1]?.id);
      
      const { error } = await supabase.from('public_arbitrage_opportunities').insert({
        market_1_id: opp.markets[0].id,
        market_1_question: opp.markets[0].question,
        market_1_prob: opp.markets[0].probability,
        market_1_url: opp.markets[0].url,
        market_1_position: opp.markets[0].action,
        market_2_id: opp.markets[1].id,
        market_2_question: opp.markets[1].question,
        market_2_prob: opp.markets[1].probability,
        market_2_url: opp.markets[1].url,
        market_2_position: opp.markets[1].action,
        expected_profit: opp.expectedProfit,
        confidence: opp.confidence || 'medium',
        ai_analysis: aiAnalysis?.reason || null,
        status: 'active'
      });

      if (error) throw error;

      toast({ title: 'Published!', description: 'Opportunity visible to Private Client subscribers' });
      
      // Remove from scanned list
      setScannedOpportunities(prev => prev.filter(o => o.id !== opp.id));
      
      // Refresh published list
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: 'Publish Failed',
        description: error instanceof Error ? error.message : 'Failed to publish',
        variant: 'destructive'
      });
    }
  };

  const handleSaveRate = async () => {
    if (!newRate.annual_yield || newRate.annual_yield <= 0) {
      toast({ title: 'Invalid rate', description: 'Please enter a valid annual yield', variant: 'destructive' });
      return;
    }

    setIsSavingRate(true);
    try {
      const { error } = await supabase.from('bond_rates').insert({
        term_weeks: newRate.term_weeks,
        annual_yield: newRate.annual_yield,
        monthly_yield: newRate.annual_yield / 12,
      });

      if (error) throw error;

      toast({ title: 'Rate saved', description: `New rate for ${TERM_LABELS[newRate.term_weeks]} set to ${newRate.annual_yield}% APY` });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast({ title: 'Error', description: 'Failed to save rate', variant: 'destructive' });
    } finally {
      setIsSavingRate(false);
    }
  };

  const handlePublishNews = async () => {
    if (!newNews.title.trim() || !newNews.content.trim()) {
      toast({ title: 'Invalid news', description: 'Please enter title and content', variant: 'destructive' });
      return;
    }

    setIsSavingNews(true);
    try {
      const { error } = await supabase.from('treasury_news').insert({
        title: newNews.title,
        content: newNews.content,
      });

      if (error) throw error;

      toast({ title: 'News published', description: 'Treasury announcement has been published' });
      setNewNews({ title: '', content: '' });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error publishing news:', error);
      toast({ title: 'Error', description: 'Failed to publish news', variant: 'destructive' });
    } finally {
      setIsSavingNews(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    try {
      const { error } = await supabase.from('treasury_news').delete().eq('id', newsId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'News item deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleCancelLoan = async (loanId: string) => {
    setProcessingLoan(loanId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-loan', {
        body: { loanId, reason: 'Admin moderation: Loan cancelled by administrator' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Loan Cancelled', description: 'The loan has been cancelled and funds returned to investors.' });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error cancelling loan:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to cancel loan', 
        variant: 'destructive' 
      });
    } finally {
      setProcessingLoan(null);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    setProcessingLoan(loanId);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-loan', {
        body: { loanId, reason: 'Admin moderation: Loan deleted by administrator' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: deleteError } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId);

      if (deleteError) throw deleteError;

      toast({ title: 'Loan Deleted', description: 'The loan has been removed from the marketplace.' });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete loan', 
        variant: 'destructive' 
      });
    } finally {
      setProcessingLoan(null);
    }
  };

  const handleApproveLoan = async (loanId: string) => {
    setProcessingLoan(loanId);
    try {
      const { error } = await supabase
        .from('loans')
        .update({ risk_score: 'low' })
        .eq('id', loanId);

      if (error) throw error;

      toast({ title: 'Loan Approved', description: 'Risk score set to low. Loan is now more visible.' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve loan', variant: 'destructive' });
    } finally {
      setProcessingLoan(null);
    }
  };

  const handleFlagLoan = async (loanId: string) => {
    setProcessingLoan(loanId);
    try {
      const { error } = await supabase
        .from('loans')
        .update({ risk_score: 'high' })
        .eq('id', loanId);

      if (error) throw error;

      toast({ title: 'Loan Flagged', description: 'Risk score set to high. Users will be warned.' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to flag loan', variant: 'destructive' });
    } finally {
      setProcessingLoan(null);
    }
  };

  const handleVerifyLoan = async (loanId: string, verify: boolean) => {
    setProcessingLoan(loanId);
    try {
      const { error } = await supabase
        .from('loans')
        .update({ is_verified: verify })
        .eq('id', loanId);

      if (error) throw error;

      toast({ 
        title: verify ? 'Loan Verified' : 'Verification Removed', 
        description: verify ? 'Trustworthy-ish badge added.' : 'Badge removed from loan.'
      });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update verification', variant: 'destructive' });
    } finally {
      setProcessingLoan(null);
    }
  };

  // NAVLOC Application Handlers
  const handleApproveNavloc = async (applicationId: string, userId: string) => {
    setProcessingNavloc(applicationId);
    try {
      // Create or update credit line
      const { error: creditError } = await supabase
        .from('navloc_credit_lines')
        .upsert({
          user_id: userId,
          credit_grade: navlocApprovalForm.credit_grade,
          credit_limit: navlocApprovalForm.credit_limit,
          interest_rate: navlocApprovalForm.interest_rate,
          current_balance: 0,
          available_credit: navlocApprovalForm.credit_limit,
          is_active: true,
          granted_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (creditError) throw creditError;

      // Update application status
      const { data: { user } } = await supabase.auth.getUser();
      const { error: appError } = await supabase
        .from('navloc_applications')
        .update({ 
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: `Approved: Grade ${navlocApprovalForm.credit_grade}, Limit M$${navlocApprovalForm.credit_limit}, Rate ${navlocApprovalForm.interest_rate}%`
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      toast({ title: 'NAVLOC Approved', description: `Credit line granted with M$${navlocApprovalForm.credit_limit} limit` });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error approving NAVLOC:', error);
      toast({ title: 'Error', description: 'Failed to approve application', variant: 'destructive' });
    } finally {
      setProcessingNavloc(null);
    }
  };

  const handleRejectNavloc = async (applicationId: string, reason: string) => {
    setProcessingNavloc(applicationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('navloc_applications')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: reason || 'Application rejected'
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({ title: 'Application Rejected' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject application', variant: 'destructive' });
    } finally {
      setProcessingNavloc(null);
    }
  };

  const handleCreateBot = async () => {
    if (!newBot.name.trim()) {
      toast({ title: 'Invalid', description: 'Please enter a bot name', variant: 'destructive' });
      return;
    }

    try {
      const strategy = BOT_STRATEGIES.find(s => s.id === newBot.strategy);
      const { error } = await supabase.from('trading_bots').insert({
        name: newBot.name,
        strategy: newBot.strategy,
        description: newBot.description || strategy?.description || '',
        config: {},
        is_active: false,
      });

      if (error) throw error;

      toast({ title: 'Bot Created', description: `${newBot.name} has been created.` });
      setNewBot({ name: '', strategy: 'market_maker', description: '' });
      setShowNewBot(false);
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create bot', variant: 'destructive' });
    }
  };

  const handleToggleBot = async (botId: string, currentState: boolean) => {
    setProcessingBot(botId);
    try {
      const { error } = await supabase
        .from('trading_bots')
        .update({ is_active: !currentState, updated_at: new Date().toISOString() })
        .eq('id', botId);

      if (error) throw error;

      toast({ 
        title: currentState ? 'Bot Paused' : 'Bot Activated', 
        description: currentState ? 'Trading bot has been paused.' : 'Trading bot is now active!' 
      });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to toggle bot', variant: 'destructive' });
    } finally {
      setProcessingBot(null);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    setProcessingBot(botId);
    try {
      const { error } = await supabase.from('trading_bots').delete().eq('id', botId);
      if (error) throw error;
      toast({ title: 'Bot Deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete bot', variant: 'destructive' });
    } finally {
      setProcessingBot(null);
    }
  };

  const handleToggleEmergencyStop = async () => {
    setTogglingEmergencyStop(true);
    try {
      const newValue = !emergencyStop;
      const { error } = await supabase
        .from('trading_bot_settings')
        .update({ setting_value: String(newValue), updated_at: new Date().toISOString() })
        .eq('setting_key', 'emergency_stop');
      
      if (error) throw error;
      
      setEmergencyStop(newValue);
      toast({ 
        title: newValue ? 'Emergency Stop Activated' : 'Bots Resumed', 
        description: newValue ? 'All trading bots have been halted.' : 'Trading bots can now run.',
        variant: newValue ? 'destructive' : 'default'
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to toggle emergency stop', variant: 'destructive' });
    } finally {
      setTogglingEmergencyStop(false);
    }
  };

  const handleManualBotRun = async () => {
    setRunningBots(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-trading-bots');
      if (error) throw error;
      toast({ 
        title: 'Bots Executed', 
        description: data?.message || `Processed ${data?.botsProcessed || 0} bots`
      });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to run bots', variant: 'destructive' });
    } finally {
      setRunningBots(false);
    }
  };

  const handleUpdateSuggestionStatus = async (suggestionId: string, status: string, notes?: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      const { error } = await supabase
        .from('product_suggestions')
        .update({ 
          status, 
          admin_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) throw error;
      toast({ title: 'Updated', description: `Suggestion marked as ${status}` });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update suggestion', variant: 'destructive' });
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const handleDeleteSuggestion = async (suggestionId: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      const { error } = await supabase.from('product_suggestions').delete().eq('id', suggestionId);
      if (error) throw error;
      toast({ title: 'Deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete suggestion', variant: 'destructive' });
    } finally {
      setProcessingSuggestion(null);
    }
  };

  // Arbitrage handlers
  const handleCreateArbitrage = async () => {
    if (!newArbitrage.market_1_question.trim() || !newArbitrage.market_2_question.trim()) {
      toast({ title: 'Invalid', description: 'Please enter both market questions', variant: 'destructive' });
      return;
    }

    try {
      const market1Id = newArbitrage.market_1_url.split('/').pop() || `m1_${Date.now()}`;
      const market2Id = newArbitrage.market_2_url.split('/').pop() || `m2_${Date.now()}`;

      const { error } = await supabase.from('public_arbitrage_opportunities').insert({
        market_1_id: market1Id,
        market_1_question: newArbitrage.market_1_question,
        market_1_url: newArbitrage.market_1_url,
        market_1_prob: newArbitrage.market_1_prob / 100,
        market_1_position: newArbitrage.market_1_position,
        market_2_id: market2Id,
        market_2_question: newArbitrage.market_2_question,
        market_2_url: newArbitrage.market_2_url,
        market_2_prob: newArbitrage.market_2_prob / 100,
        market_2_position: newArbitrage.market_2_position,
        expected_profit: newArbitrage.expected_profit,
        confidence: newArbitrage.confidence,
        ai_analysis: newArbitrage.ai_analysis || null,
        status: 'active',
      });

      if (error) throw error;

      toast({ title: 'Opportunity Created', description: 'Arbitrage opportunity is now visible to users.' });
      setNewArbitrage({
        market_1_question: '',
        market_1_url: '',
        market_1_prob: 50,
        market_1_position: 'YES',
        market_2_question: '',
        market_2_url: '',
        market_2_prob: 50,
        market_2_position: 'NO',
        expected_profit: 5,
        confidence: 'medium',
        ai_analysis: '',
      });
      setShowNewArbitrage(false);
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create opportunity', variant: 'destructive' });
    }
  };

  const handleDeleteArbitrage = async (id: string) => {
    setProcessingArbitrage(id);
    try {
      const { error } = await supabase.from('public_arbitrage_opportunities').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete opportunity', variant: 'destructive' });
    } finally {
      setProcessingArbitrage(null);
    }
  };

  const handleUpdateArbitrageStatus = async (id: string, status: string) => {
    setProcessingArbitrage(id);
    try {
      const { error } = await supabase
        .from('public_arbitrage_opportunities')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Updated', description: `Opportunity marked as ${status}` });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setProcessingArbitrage(null);
    }
  };

  // Index Fund handlers
  const handleAddMarketToFund = () => {
    if (!newMarketInput.question.trim()) {
      toast({ title: 'Invalid', description: 'Enter a market question', variant: 'destructive' });
      return;
    }
    const marketId = newMarketInput.url.split('/').pop() || `market_${Date.now()}`;
    setNewIndexFund(prev => ({
      ...prev,
      markets: [...prev.markets, { ...newMarketInput, id: marketId }]
    }));
    setNewMarketInput({ question: '', url: '', probability: 50, allocation: 25 });
  };

  const handleRemoveMarketFromFund = (marketId: string) => {
    setNewIndexFund(prev => ({
      ...prev,
      markets: prev.markets.filter(m => m.id !== marketId)
    }));
  };

  const handleCreateIndexFund = async () => {
    if (!newIndexFund.name.trim()) {
      toast({ title: 'Invalid', description: 'Enter a fund name', variant: 'destructive' });
      return;
    }
    if (newIndexFund.markets.length === 0) {
      toast({ title: 'Invalid', description: 'Add at least one market', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('trading_bots').insert({
        name: newIndexFund.name,
        description: newIndexFund.description,
        strategy: 'index_fund',
        config: { markets: newIndexFund.markets },
        is_active: true,
      });

      if (error) throw error;

      toast({ title: 'Index Fund Created' });
      setNewIndexFund({ name: '', description: '', markets: [] });
      setShowNewIndexFund(false);
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create index fund', variant: 'destructive' });
    }
  };

  const handleDeleteIndexFund = async (fundId: string) => {
    setProcessingIndexFund(fundId);
    try {
      const { error } = await supabase.from('trading_bots').delete().eq('id', fundId);
      if (error) throw error;
      toast({ title: 'Deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setProcessingIndexFund(null);
    }
  };

  // Bot Strategy handlers
  const handleCreateStrategy = async () => {
    if (!newStrategy.name.trim() || !newStrategy.codeSnippet.trim()) {
      toast({ title: 'Invalid', description: 'Enter name and code snippet', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('trading_bots').insert({
        name: newStrategy.name,
        description: newStrategy.description,
        strategy: 'playground_strategy',
        config: { codeSnippet: newStrategy.codeSnippet },
        is_active: true,
      });

      if (error) throw error;

      toast({ title: 'Strategy Created' });
      setNewStrategy({ name: '', description: '', codeSnippet: '' });
      setShowNewStrategy(false);
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create strategy', variant: 'destructive' });
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    setProcessingStrategy(strategyId);
    try {
      const { error } = await supabase.from('trading_bots').delete().eq('id', strategyId);
      if (error) throw error;
      toast({ title: 'Deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
    setProcessingStrategy(null);
    }
  };

  // Treasury Management handlers
  const handleWipeUserTreasury = async () => {
    if (!wipeUserId.trim()) {
      toast({ title: 'Invalid', description: 'Enter a user ID', variant: 'destructive' });
      return;
    }

    setWipingAccount(true);
    try {
      // Delete all bonds for this user
      const { error: bondsError } = await supabase
        .from('bonds')
        .delete()
        .eq('user_id', wipeUserId);

      if (bondsError) throw bondsError;

      // Reset user balance to 0
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({ balance: 0, total_invested: 0, updated_at: new Date().toISOString() })
        .eq('user_id', wipeUserId);

      if (balanceError) console.error('Balance reset error:', balanceError);

      toast({ title: 'Account Wiped', description: 'All bonds deleted and balance reset.' });
      setWipeUserId('');
    } catch (error) {
      console.error('Wipe error:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to wipe account', variant: 'destructive' });
    } finally {
      setWipingAccount(false);
    }
  };

  const handleTestBondLifecycle = async () => {
    if (!testBondId.trim()) {
      toast({ title: 'Invalid', description: 'Enter a bond ID', variant: 'destructive' });
      return;
    }

    setTestingBond(true);
    try {
      // Get the bond
      const { data: bond, error: fetchError } = await supabase
        .from('bonds')
        .select('*')
        .eq('id', testBondId)
        .single();

      if (fetchError || !bond) {
        throw new Error('Bond not found');
      }

      // Calculate interest
      const monthlyInterest = bond.amount * (bond.annual_yield / 100) / 12;

      // Credit interest to user balance
      const { error: balanceError } = await supabase.rpc('modify_user_balance', {
        p_user_id: bond.user_id,
        p_amount: monthlyInterest,
        p_operation: 'add'
      });

      if (balanceError) throw balanceError;

      // Record interest payment
      await supabase.from('bond_interest_payments').insert({
        bond_id: bond.id,
        user_id: bond.user_id,
        amount: monthlyInterest,
        payment_date: new Date().toISOString(),
      });

      // Now mature the bond - return principal
      const { error: principalError } = await supabase.rpc('modify_user_balance', {
        p_user_id: bond.user_id,
        p_amount: bond.amount,
        p_operation: 'add'
      });

      if (principalError) throw principalError;

      // Mark bond as matured
      const { error: updateError } = await supabase
        .from('bonds')
        .update({ status: 'matured', updated_at: new Date().toISOString() })
        .eq('id', testBondId);

      if (updateError) throw updateError;

      toast({ 
        title: 'Bond Lifecycle Complete', 
        description: `Paid M$${monthlyInterest.toFixed(2)} interest + M$${bond.amount} principal to user.` 
      });
      setTestBondId('');
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Test bond error:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to test bond', variant: 'destructive' });
    } finally {
      setTestingBond(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have admin privileges to access this page.</p>
            <Link to="/hub">
              <Button>Return to Hub</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <span className="text-primary-foreground font-bold">T</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient">Treasury Admin</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Rate, Policy & Moderation</p>
              </div>
            </Link>
            <Badge variant="outline" className="gap-2">
              Admin
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="arbitrage" className="space-y-6">
          <TabsList className="grid grid-cols-5 sm:grid-cols-10 w-full">
            <TabsTrigger value="arbitrage">
              <span className="hidden sm:inline">Arbitrage</span>
              <span className="sm:hidden">Arb</span>
            </TabsTrigger>
            <TabsTrigger value="treasury">
              <span className="hidden sm:inline">Treasury</span>
              <span className="sm:hidden">T</span>
            </TabsTrigger>
            <TabsTrigger value="rates">
              <span className="hidden sm:inline">Rates</span>
              <span className="sm:hidden">$</span>
            </TabsTrigger>
            <TabsTrigger value="news">
              <span className="hidden sm:inline">News</span>
              <span className="sm:hidden">N</span>
            </TabsTrigger>
            <TabsTrigger value="loans">
              <span className="hidden sm:inline">Loans</span>
              <span className="sm:hidden">L</span>
            </TabsTrigger>
            <TabsTrigger value="bots">
              <span className="hidden sm:inline">Bots</span>
              <span className="sm:hidden">B</span>
            </TabsTrigger>
            <TabsTrigger value="indexfunds">
              <span className="hidden sm:inline">Funds</span>
              <span className="sm:hidden">F</span>
            </TabsTrigger>
            <TabsTrigger value="strategies">
              <span className="hidden sm:inline">Snippets</span>
              <span className="sm:hidden">S</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <span className="hidden sm:inline">Subs</span>
              <span className="sm:hidden">$</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <span className="hidden sm:inline">Suggest</span>
              <span className="sm:hidden">?</span>
            </TabsTrigger>
            <TabsTrigger value="navloc">
              <span className="hidden sm:inline">NAVLOC</span>
              <span className="sm:hidden">C</span>
            </TabsTrigger>
          </TabsList>

          {/* Arbitrage Tab - Now with AI Scan */}
          <TabsContent value="arbitrage">
            <div className="space-y-6">
              {/* AI Scan Section */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>AI Arbitrage Scanner</CardTitle>
                  <CardDescription>
                    Scan markets for arbitrage opportunities using AI analysis. Found opportunities can be published for Private Client subscribers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Scan Config */}
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div>
                      <Label>Min Liquidity</Label>
                      <Input 
                        type="number" 
                        value={scanConfig.minLiquidity} 
                        onChange={(e) => setScanConfig(c => ({ ...c, minLiquidity: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Min Volume</Label>
                      <Input 
                        type="number" 
                        value={scanConfig.minVolume} 
                        onChange={(e) => setScanConfig(c => ({ ...c, minVolume: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Threshold %</Label>
                      <Input 
                        type="number" 
                        value={scanConfig.baseThreshold} 
                        onChange={(e) => setScanConfig(c => ({ ...c, baseThreshold: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Max Markets</Label>
                      <Input 
                        type="number" 
                        value={scanConfig.maxMarkets} 
                        onChange={(e) => setScanConfig(c => ({ ...c, maxMarkets: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={scanConfig.fullScan}
                        onCheckedChange={(v) => setScanConfig(c => ({ ...c, fullScan: v }))}
                      />
                      <Label>Full Scan</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={scanConfig.aiAnalysisEnabled}
                        onCheckedChange={(v) => setScanConfig(c => ({ ...c, aiAnalysisEnabled: v }))}
                      />
                      <Label>AI Analysis</Label>
                    </div>
                  </div>

                  <Button 
                    onClick={handleAIScan} 
                    disabled={isScanning}
                    className="w-full"
                  >
                    {isScanning ? 'Scanning...' : 'Run AI Scan'}
                  </Button>

                  {isScanning && (
                    <div className="space-y-2">
                      <Progress value={scanProgress} />
                      <p className="text-sm text-muted-foreground text-center">{scanStatus}</p>
                    </div>
                  )}

                  {/* Scanned Results */}
                  {scannedOpportunities.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-medium">Found {scannedOpportunities.length} Opportunities</h4>
                      {scannedOpportunities.slice(0, 20).map(opp => (
                        <div key={opp.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={opp.confidence === 'high' ? 'success' : opp.confidence === 'medium' ? 'pending' : 'secondary'}>
                                  {opp.confidence || 'unknown'}
                                </Badge>
                                <Badge variant="outline">{opp.type}</Badge>
                                <span className="text-sm font-medium text-success">+M${opp.expectedProfit.toFixed(2)}</span>
                              </div>
                              {opp.markets.slice(0, 2).map((m, i) => (
                                <p key={i} className="text-sm text-muted-foreground truncate">
                                  {i + 1}. {m.action === 'BUY_YES' ? 'YES' : 'NO'} @ {(m.probability * 100).toFixed(0)}% - {m.question}
                                </p>
                              ))}
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => publishScannedOpportunity(opp)}
                            >
                              Publish
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Manual Entry & Published List */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Published Opportunities</CardTitle>
                  <CardDescription>
                    Manage opportunities visible to Private Client subscribers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {arbitrageOpportunities.filter(a => a.status === 'active').length} active opportunities
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShowNewArbitrage(!showNewArbitrage)}>
                      New Opportunity
                    </Button>
                  </div>

                  {showNewArbitrage && (
                    <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-4">
                      <h4 className="font-medium">Create Arbitrage Opportunity</h4>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label>Market 1 Question</Label>
                          <Input placeholder="e.g., Will X happen?" value={newArbitrage.market_1_question} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_1_question: e.target.value })} />
                          <Label>Market 1 URL</Label>
                          <Input placeholder="https://manifold.markets/..." value={newArbitrage.market_1_url} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_1_url: e.target.value })} />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label>Prob %</Label>
                              <Input type="number" value={newArbitrage.market_1_prob} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_1_prob: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="flex-1">
                              <Label>Position</Label>
                              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newArbitrage.market_1_position} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_1_position: e.target.value })}>
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label>Market 2 Question</Label>
                          <Input placeholder="e.g., Will Y happen?" value={newArbitrage.market_2_question} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_2_question: e.target.value })} />
                          <Label>Market 2 URL</Label>
                          <Input placeholder="https://manifold.markets/..." value={newArbitrage.market_2_url} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_2_url: e.target.value })} />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label>Prob %</Label>
                              <Input type="number" value={newArbitrage.market_2_prob} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_2_prob: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="flex-1">
                              <Label>Position</Label>
                              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newArbitrage.market_2_position} onChange={(e) => setNewArbitrage({ ...newArbitrage, market_2_position: e.target.value })}>
                                <option value="YES">YES</option>
                                <option value="NO">NO</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Expected Profit %</Label>
                          <Input type="number" value={newArbitrage.expected_profit} onChange={(e) => setNewArbitrage({ ...newArbitrage, expected_profit: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <Label>Confidence</Label>
                          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newArbitrage.confidence} onChange={(e) => setNewArbitrage({ ...newArbitrage, confidence: e.target.value })}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label>AI Analysis (optional)</Label>
                        <Textarea placeholder="Explain why this is a valid arbitrage opportunity..." value={newArbitrage.ai_analysis} onChange={(e) => setNewArbitrage({ ...newArbitrage, ai_analysis: e.target.value })} rows={3} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleCreateArbitrage}>Create Opportunity</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewArbitrage(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {arbitrageOpportunities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No opportunities yet</div>
                    ) : (
                      arbitrageOpportunities.map(opp => (
                        <div key={opp.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={opp.status === 'active' ? 'success' : opp.status === 'executed' ? 'secondary' : 'destructive'}>{opp.status}</Badge>
                                <Badge variant={opp.confidence === 'high' ? 'success' : opp.confidence === 'medium' ? 'pending' : 'secondary'}>{opp.confidence}</Badge>
                                <span className="text-sm font-medium text-success">+{(opp.expected_profit * 100).toFixed(1)}%</span>
                              </div>
                              <p className="text-sm font-medium">{opp.market_1_question}</p>
                              <p className="text-xs text-muted-foreground">vs {opp.market_2_question}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {opp.market_1_url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={opp.market_1_url} target="_blank" rel="noopener noreferrer">View</a>
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={() => handleUpdateArbitrageStatus(opp.id, opp.status === 'active' ? 'expired' : 'active')} disabled={processingArbitrage === opp.id}>
                                {opp.status === 'active' ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteArbitrage(opp.id)} disabled={processingArbitrage === opp.id}>
                                {processingArbitrage === opp.id ? '...' : 'Delete'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Treasury Management Tab */}
          <TabsContent value="treasury">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Wipe User Treasury Account</CardTitle>
                  <CardDescription>
                    Delete all bonds and reset balance to 0 for a user. This is irreversible.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>User ID (UUID)</Label>
                    <Input
                      placeholder="Enter user UUID..."
                      value={wipeUserId}
                      onChange={(e) => setWipeUserId(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="destructive" 
                    onClick={handleWipeUserTreasury}
                    disabled={wipingAccount || !wipeUserId.trim()}
                    className="w-full"
                  >
                    {wipingAccount ? 'Wiping...' : 'Wipe Treasury Account'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Test Bond Lifecycle</CardTitle>
                  <CardDescription>
                    Simulate full bond lifecycle: pay interest and return principal immediately for testing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Bond ID (UUID)</Label>
                    <Input
                      placeholder="Enter bond UUID..."
                      value={testBondId}
                      onChange={(e) => setTestBondId(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleTestBondLifecycle}
                    disabled={testingBond || !testBondId.trim()}
                    className="w-full"
                  >
                    {testingBond ? 'Processing...' : 'Run Full Lifecycle (Interest + Mature)'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This will pay one month's interest + full principal to the user's balance and mark the bond as matured.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Rates Tab */}
          <TabsContent value="rates">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Set Bond Rates</CardTitle>
                <CardDescription>
                  Update interest rates for Treasury Bonds. New rates apply to future purchases.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Term</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={newRate.term_weeks}
                      onChange={(e) => setNewRate({ ...newRate, term_weeks: parseInt(e.target.value) })}
                    >
                      <option value={4}>4 Week T-Bond</option>
                      <option value={13}>3 Month T-Bond</option>
                      <option value={26}>6 Month T-Bond</option>
                      <option value={52}>1 Year T-Bond</option>
                    </select>
                  </div>
                  <div>
                    <Label>Annual Yield (%)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={newRate.annual_yield}
                      onChange={(e) => setNewRate({ ...newRate, annual_yield: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSaveRate} disabled={isSavingRate} className="w-full">
                      {isSavingRate ? '...' : 'Set Rate'}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Current Rates</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[4, 13, 26, 52].map(term => {
                      const rate = rates.find(r => r.term_weeks === term);
                      return (
                        <div key={term} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                          <span className="text-sm">{TERM_LABELS[term]}</span>
                          <Badge variant="secondary">{rate?.annual_yield || 6}% APY</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Publish Treasury News</CardTitle>
                <CardDescription>
                  Announcements appear on the bonds page for all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input 
                    placeholder="e.g., Rate Update: 6% APY Now Available"
                    value={newNews.title}
                    onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea 
                    placeholder="Write your announcement here..."
                    rows={4}
                    value={newNews.content}
                    onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                  />
                </div>
                <Button onClick={handlePublishNews} disabled={isSavingNews}>
                  {isSavingNews ? '...' : 'Publish'}
                </Button>

                {news.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">Recent News</p>
                    <div className="space-y-2">
                      {news.map(item => (
                        <div key={item.id} className="p-3 rounded-lg bg-secondary/30 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.published_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteNews(item.id)}>
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loans Tab */}
          <TabsContent value="loans">
            <Card className="glass">
              <CardHeader>
                <CardTitle>P2P Loans Moderation</CardTitle>
                <CardDescription>
                  Review, approve, flag, delete, or cancel loans in the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No loans to moderate</div>
                  ) : (
                    loans.map(loan => (
                      <div key={loan.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-medium text-foreground truncate">{loan.title}</h3>
                              <Badge variant={loan.status === 'active' ? 'active' : loan.status === 'seeking_funding' ? 'pending' : loan.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                {loan.status.replace('_', ' ')}
                              </Badge>
                              <Badge variant={loan.risk_score === 'low' ? 'success' : loan.risk_score === 'high' ? 'destructive' : 'secondary'}>
                                {loan.risk_score} risk
                              </Badge>
                              {loan.loan_type === 'offer' && (
                                <Badge variant="outline">Offer</Badge>
                              )}
                              {loan.is_verified && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Verified</Badge>
                              )}
                              {loan.research_fee_paid && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                  Fee Paid: M${loan.research_fee_amount || 0}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              By @{loan.borrower_username} • M${loan.amount.toLocaleString()} • Funded: M${loan.funded_amount.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {loan.research_fee_paid && !loan.is_verified && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleVerifyLoan(loan.id, true)} 
                                disabled={processingLoan === loan.id}
                              >
                                {processingLoan === loan.id ? '...' : 'Grant Badge'}
                              </Button>
                            )}
                            {loan.is_verified && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleVerifyLoan(loan.id, false)} 
                                disabled={processingLoan === loan.id}
                              >
                                {processingLoan === loan.id ? '...' : 'Remove Badge'}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleApproveLoan(loan.id)} disabled={processingLoan === loan.id || loan.risk_score === 'low'}>
                              {processingLoan === loan.id ? '...' : 'Approve'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleFlagLoan(loan.id)} disabled={processingLoan === loan.id || loan.risk_score === 'high'}>
                              {processingLoan === loan.id ? '...' : 'Flag'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleCancelLoan(loan.id)} disabled={processingLoan === loan.id || loan.status === 'cancelled'}>
                              {processingLoan === loan.id ? '...' : 'Cancel'}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteLoan(loan.id)} disabled={processingLoan === loan.id}>
                              {processingLoan === loan.id ? '...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bots Tab */}
          <TabsContent value="bots">
            <Card className="glass">
              <CardHeader>
                <CardTitle>ManiFed Trading Bots</CardTitle>
                <CardDescription>
                  Automated trading strategies that run continuously.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Emergency Stop */}
                <div className="p-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${emergencyStop ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                      <span className="font-medium">{emergencyStop ? 'EMERGENCY STOP ACTIVE' : 'Bots Running Normally'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant={emergencyStop ? 'default' : 'destructive'} size="sm" onClick={handleToggleEmergencyStop} disabled={togglingEmergencyStop}>
                        {togglingEmergencyStop ? '...' : emergencyStop ? 'Resume Bots' : 'Emergency Stop'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleManualBotRun} disabled={runningBots || emergencyStop}>
                        {runningBots ? '...' : 'Run Now'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{bots.filter(b => b.is_active).length} active bots</p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewBot(!showNewBot)}>New Bot</Button>
                </div>

                {showNewBot && (
                  <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-3">
                    <h4 className="font-medium">Create New Bot</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Bot Name</Label>
                        <Input placeholder="e.g., Alpha Maker 1" value={newBot.name} onChange={(e) => setNewBot({ ...newBot, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Strategy</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newBot.strategy} onChange={(e) => setNewBot({ ...newBot, strategy: e.target.value })}>
                          {BOT_STRATEGIES.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateBot}>Create Bot</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewBot(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {bots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No trading bots configured</div>
                  ) : (
                    bots.map(bot => {
                      const strategy = BOT_STRATEGIES.find(s => s.id === bot.strategy);
                      return (
                        <div key={bot.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground">{bot.name}</h3>
                                <Badge variant={bot.is_active ? 'success' : 'secondary'}>{bot.is_active ? 'Active' : 'Paused'}</Badge>
                                <Badge variant="outline">{strategy?.name || bot.strategy}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{bot.description || strategy?.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Trades: {bot.total_trades}</span>
                                <span>Profit: M${bot.total_profit.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={bot.is_active} onCheckedChange={() => handleToggleBot(bot.id, bot.is_active)} disabled={processingBot === bot.id} />
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteBot(bot.id)} disabled={processingBot === bot.id}>
                                {processingBot === bot.id ? '...' : 'Delete'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Index Funds Tab */}
          <TabsContent value="indexfunds">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Index Funds</CardTitle>
                <CardDescription>Create index funds with custom market selections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{indexFunds.length} funds</p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewIndexFund(!showNewIndexFund)}>New Fund</Button>
                </div>

                {showNewIndexFund && (
                  <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-4">
                    <h4 className="font-medium">Create Index Fund</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Fund Name</Label>
                        <Input placeholder="e.g., AI Tech Index" value={newIndexFund.name} onChange={(e) => setNewIndexFund({ ...newIndexFund, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input placeholder="Brief description..." value={newIndexFund.description} onChange={(e) => setNewIndexFund({ ...newIndexFund, description: e.target.value })} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Add Markets</Label>
                      <div className="grid sm:grid-cols-4 gap-2">
                        <Input placeholder="Question" value={newMarketInput.question} onChange={(e) => setNewMarketInput({ ...newMarketInput, question: e.target.value })} />
                        <Input placeholder="URL" value={newMarketInput.url} onChange={(e) => setNewMarketInput({ ...newMarketInput, url: e.target.value })} />
                        <Input type="number" placeholder="Prob %" value={newMarketInput.probability} onChange={(e) => setNewMarketInput({ ...newMarketInput, probability: parseInt(e.target.value) || 0 })} />
                        <Button size="sm" onClick={handleAddMarketToFund}>Add</Button>
                      </div>
                    </div>

                    {newIndexFund.markets.length > 0 && (
                      <div className="space-y-2">
                        <Label>Markets ({newIndexFund.markets.length})</Label>
                        {newIndexFund.markets.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                            <span className="flex-1 text-sm truncate">{m.question}</span>
                            <Badge variant="secondary">{m.allocation}%</Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveMarketFromFund(m.id)}>X</Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateIndexFund}>Create Fund</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewIndexFund(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {indexFunds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No index funds yet</div>
                  ) : (
                    indexFunds.map(fund => (
                      <div key={fund.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{fund.name}</h3>
                            <p className="text-sm text-muted-foreground">{fund.description}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteIndexFund(fund.id)} disabled={processingIndexFund === fund.id}>
                            {processingIndexFund === fund.id ? '...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Bot Strategies</CardTitle>
                <CardDescription>Custom code snippets for bot playground.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{botStrategies.length} strategies</p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewStrategy(!showNewStrategy)}>New Strategy</Button>
                </div>

                {showNewStrategy && (
                  <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-4">
                    <h4 className="font-medium">Create Strategy</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input placeholder="Strategy name" value={newStrategy.name} onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input placeholder="Brief description" value={newStrategy.description} onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Code Snippet</Label>
                      <Textarea placeholder="// Your code here..." rows={6} value={newStrategy.codeSnippet} onChange={(e) => setNewStrategy({ ...newStrategy, codeSnippet: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateStrategy}>Create</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewStrategy(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {botStrategies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No strategies yet</div>
                  ) : (
                    botStrategies.map(strat => (
                      <div key={strat.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium">{strat.name}</h3>
                            <p className="text-sm text-muted-foreground">{strat.description}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteStrategy(strat.id)} disabled={processingStrategy === strat.id}>
                            {processingStrategy === strat.id ? '...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>Manage Private Client subscriptions and gift codes.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">Coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Product Suggestions</CardTitle>
                <CardDescription>User-submitted feature requests and product ideas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No suggestions yet</p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map(suggestion => (
                      <div key={suggestion.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground">{suggestion.title}</h3>
                              <Badge variant={suggestion.status === 'approved' ? 'success' : suggestion.status === 'rejected' ? 'destructive' : suggestion.status === 'in_progress' ? 'pending' : 'secondary'}>
                                {suggestion.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                            <p className="text-xs text-muted-foreground">{new Date(suggestion.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleUpdateSuggestionStatus(suggestion.id, 'approved')} disabled={processingSuggestion === suggestion.id || suggestion.status === 'approved'}>
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleUpdateSuggestionStatus(suggestion.id, 'rejected')} disabled={processingSuggestion === suggestion.id || suggestion.status === 'rejected'}>
                              Reject
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteSuggestion(suggestion.id)} disabled={processingSuggestion === suggestion.id}>
                              {processingSuggestion === suggestion.id ? '...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* NAVLOC Tab */}
          <TabsContent value="navloc">
            <Card className="glass">
              <CardHeader>
                <CardTitle>NAVLOC Credit Applications</CardTitle>
                <CardDescription>
                  Review and approve Net Account Value Line of Credit applications. Set credit grade (AAA-C), limit, and interest rate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Applications List */}
                {navlocApplications.filter(a => a.status === 'pending').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending applications</p>
                ) : (
                  <div className="space-y-3">
                    {navlocApplications.filter(a => a.status === 'pending').map(app => (
                      <div key={app.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground">User: {app.user_id.slice(0, 8)}...</h3>
                              <Badge variant="pending">pending</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Requested: M${app.requested_limit?.toLocaleString() || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {/* Inline approval parameters */}
                          <div className="flex flex-wrap items-center gap-2">
                            <select 
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              value={navlocApprovalForm.credit_grade}
                              onChange={(e) => setNavlocApprovalForm(f => ({ ...f, credit_grade: e.target.value }))}
                            >
                              <option value="AAA">AAA</option>
                              <option value="AA">AA</option>
                              <option value="A">A</option>
                              <option value="BBB">BBB</option>
                              <option value="BB">BB</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                            <Input 
                              type="number"
                              className="h-8 w-24 text-xs"
                              placeholder="Limit"
                              value={navlocApprovalForm.credit_limit}
                              onChange={(e) => setNavlocApprovalForm(f => ({ ...f, credit_limit: parseInt(e.target.value) || 0 }))}
                            />
                            <Input 
                              type="number"
                              className="h-8 w-16 text-xs"
                              placeholder="%"
                              step="0.5"
                              value={navlocApprovalForm.interest_rate}
                              onChange={(e) => setNavlocApprovalForm(f => ({ ...f, interest_rate: parseFloat(e.target.value) || 0 }))}
                            />
                            <Button 
                              variant="default" 
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleApproveNavloc(app.id, app.user_id)}
                              disabled={processingNavloc === app.id}
                            >
                              {processingNavloc === app.id ? '...' : 'Approve'}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="h-8"
                              onClick={() => handleRejectNavloc(app.id, 'Does not meet credit requirements')}
                              disabled={processingNavloc === app.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
