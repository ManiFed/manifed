import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Landmark, Shield, TrendingUp, FileText, Loader2, Plus, Save, Trash2, AlertTriangle, CheckCircle, XCircle, Users, Ban, Bot, Play, Pause, Settings, MessageSquare, Clock, Zap, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  // Arbitrage
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

        // Fetch emergency stop status
        const { data: stopData } = await supabase
          .from('trading_bot_settings')
          .select('setting_value')
          .eq('setting_key', 'emergency_stop')
          .single();
        if (stopData) setEmergencyStop(stopData.setting_value === 'true');
      }
    } catch (error) {
      console.error('Error:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
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
      // First cancel to return funds, then delete
      const { data, error } = await supabase.functions.invoke('cancel-loan', {
        body: { loanId, reason: 'Admin moderation: Loan deleted by administrator' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Now delete the loan record
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
        title: newValue ? '🛑 Emergency Stop Activated' : '✅ Bots Resumed', 
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
      // Extract market IDs from URLs if possible
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
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
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient">Treasury Admin</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Rate, Policy & Moderation</p>
              </div>
            </Link>
            <Badge variant="outline" className="gap-2">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="rates" className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl">
            <TabsTrigger value="rates" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Rates
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <FileText className="w-4 h-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="loans" className="gap-2">
              <Users className="w-4 h-4" />
              Loans
            </TabsTrigger>
            <TabsTrigger value="arbitrage" className="gap-2">
              <Zap className="w-4 h-4" />
              Arbitrage
            </TabsTrigger>
            <TabsTrigger value="bots" className="gap-2">
              <Bot className="w-4 h-4" />
              Bots
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          {/* Rates Tab */}
          <TabsContent value="rates">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Set Bond Rates
                </CardTitle>
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
                    <Button onClick={handleSaveRate} disabled={isSavingRate} className="w-full gap-2">
                      {isSavingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Set Rate
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
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Publish Treasury News
                </CardTitle>
                <CardDescription>
                  Post official announcements about rate changes, policies, or treasury updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input 
                    placeholder="Announcement title..."
                    value={newNews.title}
                    onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea 
                    placeholder="Announcement content..."
                    value={newNews.content}
                    onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                    rows={4}
                  />
                </div>
                <Button onClick={handlePublishNews} disabled={isSavingNews} className="gap-2">
                  {isSavingNews ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Publish Announcement
                </Button>

                {news.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">Recent Announcements</p>
                    <div className="space-y-2">
                      {news.map(item => (
                        <div key={item.id} className="p-3 rounded-lg bg-secondary/30 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.published_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="shrink-0"
                            onClick={() => handleDeleteNews(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loans Moderation Tab */}
          <TabsContent value="loans">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  P2P Loans Moderation
                </CardTitle>
                <CardDescription>
                  Review, approve, flag, delete, or cancel loans in the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No loans to moderate
                    </div>
                  ) : (
                    loans.map(loan => (
                      <div key={loan.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground truncate">{loan.title}</h3>
                              <Badge 
                                variant={
                                  loan.status === 'active' ? 'active' : 
                                  loan.status === 'seeking_funding' ? 'pending' : 
                                  loan.status === 'cancelled' ? 'destructive' : 'secondary'
                                }
                              >
                                {loan.status.replace('_', ' ')}
                              </Badge>
                              <Badge 
                                variant={
                                  loan.risk_score === 'low' ? 'success' :
                                  loan.risk_score === 'high' ? 'destructive' : 'secondary'
                                }
                              >
                                {loan.risk_score} risk
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              By @{loan.borrower_username} • M${loan.amount.toLocaleString()} • 
                              Funded: M${loan.funded_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(loan.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveLoan(loan.id)}
                              disabled={processingLoan === loan.id || loan.risk_score === 'low'}
                              className="gap-1"
                            >
                              {processingLoan === loan.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFlagLoan(loan.id)}
                              disabled={processingLoan === loan.id || loan.risk_score === 'high'}
                              className="gap-1"
                            >
                              {processingLoan === loan.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              Flag
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelLoan(loan.id)}
                              disabled={processingLoan === loan.id || loan.status === 'cancelled'}
                              className="gap-1 text-warning border-warning/50 hover:bg-warning/10"
                            >
                              {processingLoan === loan.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Ban className="w-3 h-3" />
                              )}
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteLoan(loan.id)}
                              disabled={processingLoan === loan.id}
                              className="gap-1"
                            >
                              {processingLoan === loan.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Delete
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
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  ManiFed Trading Bots
                </CardTitle>
                <CardDescription>
                  Automated trading strategies that run continuously. Market making, mispricing detection, and more.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Emergency Stop & Controls */}
                <div className="p-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${emergencyStop ? 'bg-destructive animate-pulse' : 'bg-success'}`} />
                      <span className="font-medium">
                        {emergencyStop ? '🛑 EMERGENCY STOP ACTIVE' : '✅ Bots Running Normally'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={emergencyStop ? 'default' : 'destructive'} 
                        size="sm" 
                        onClick={handleToggleEmergencyStop}
                        disabled={togglingEmergencyStop}
                        className="gap-2"
                      >
                        {togglingEmergencyStop ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : emergencyStop ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                        {emergencyStop ? 'Resume Bots' : 'Emergency Stop'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleManualBotRun}
                        disabled={runningBots || emergencyStop}
                        className="gap-2"
                      >
                        {runningBots ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Run Now
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {emergencyStop 
                      ? 'All trading bots are halted. Click "Resume Bots" to allow them to trade again.'
                      : 'Bots run automatically every minute via scheduled job. Use "Emergency Stop" to halt all trading immediately.'}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {bots.filter(b => b.is_active).length} active bots configured
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewBot(!showNewBot)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Bot
                  </Button>
                </div>

                {showNewBot && (
                  <div className="p-4 rounded-lg border border-primary/50 bg-primary/5 space-y-3">
                    <h4 className="font-medium">Create New Bot</h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Bot Name</Label>
                        <Input 
                          placeholder="e.g., Alpha Maker 1"
                          value={newBot.name}
                          onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Strategy</Label>
                        <select 
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={newBot.strategy}
                          onChange={(e) => setNewBot({ ...newBot, strategy: e.target.value })}
                        >
                          {BOT_STRATEGIES.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {BOT_STRATEGIES.find(s => s.id === newBot.strategy)?.description}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateBot}>Create Bot</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewBot(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {bots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No trading bots configured</p>
                      <p className="text-sm">Create your first bot to start automated trading</p>
                    </div>
                  ) : (
                    bots.map(bot => {
                      const strategy = BOT_STRATEGIES.find(s => s.id === bot.strategy);
                      return (
                        <div key={bot.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-foreground">{bot.name}</h3>
                                <Badge variant={bot.is_active ? 'success' : 'secondary'}>
                                  {bot.is_active ? 'Active' : 'Paused'}
                                </Badge>
                                <Badge variant="outline">{strategy?.name || bot.strategy}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {bot.description || strategy?.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Trades: {bot.total_trades}</span>
                                <span>Profit: M${bot.total_profit.toFixed(2)}</span>
                                {bot.last_run_at && (
                                  <span>Last run: {new Date(bot.last_run_at).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={bot.is_active}
                                onCheckedChange={() => handleToggleBot(bot.id, bot.is_active)}
                                disabled={processingBot === bot.id}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBot(bot.id)}
                                disabled={processingBot === bot.id}
                              >
                                {processingBot === bot.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Available Strategies</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {BOT_STRATEGIES.map(s => (
                      <div key={s.id} className="p-3 rounded-lg bg-background/50 text-sm">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Product Suggestions
                </CardTitle>
                <CardDescription>
                  User-submitted feature requests and product ideas.
                </CardDescription>
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
                              <Badge variant={
                                suggestion.status === 'approved' ? 'success' :
                                suggestion.status === 'rejected' ? 'destructive' :
                                suggestion.status === 'in_progress' ? 'pending' :
                                'secondary'
                              }>
                                {suggestion.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                            </div>
                            {suggestion.admin_notes && (
                              <p className="text-xs text-primary mt-2 italic">Admin: {suggestion.admin_notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateSuggestionStatus(suggestion.id, 'approved')}
                              disabled={processingSuggestion === suggestion.id || suggestion.status === 'approved'}
                            >
                              <CheckCircle className="w-4 h-4 text-success" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateSuggestionStatus(suggestion.id, 'rejected')}
                              disabled={processingSuggestion === suggestion.id || suggestion.status === 'rejected'}
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSuggestion(suggestion.id)}
                              disabled={processingSuggestion === suggestion.id}
                            >
                              {processingSuggestion === suggestion.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-destructive" />
                              )}
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

          {/* Arbitrage Tab */}
          <TabsContent value="arbitrage">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Public Arbitrage Opportunities
                </CardTitle>
                <CardDescription>
                  Create and manage arbitrage opportunities that users can execute with one-time API keys.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {arbitrageOpportunities.filter(a => a.status === 'active').length} active opportunities
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewArbitrage(!showNewArbitrage)} className="gap-2">
                    <Plus className="w-4 h-4" />
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
                              <Button variant="ghost" size="icon" asChild>
                                <a href={opp.market_1_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleUpdateArbitrageStatus(opp.id, opp.status === 'active' ? 'expired' : 'active')} disabled={processingArbitrage === opp.id}>
                              {opp.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteArbitrage(opp.id)} disabled={processingArbitrage === opp.id}>
                              {processingArbitrage === opp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
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
        </Tabs>
      </main>
    </div>
  );
}