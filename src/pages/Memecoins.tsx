import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { toast } from '@/hooks/use-toast';
import { WalletPopover } from '@/components/WalletPopover';
import {
  Landmark,
  Coins,
  Plus,
  Droplets,
  BarChart3,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Memecoin {
  id: string;
  name: string;
  symbol: string;
  image_url: string;
  creator_id: string;
  created_at: string;
  pool_mana: number;
  pool_tokens: number;
  total_supply: number;
}

interface Trade {
  id: string;
  price_per_token: number;
  created_at: string;
}

const TRANSACTION_FEE = 0.005; // 0.5%
const AMM_FEE = 0.003; // 0.3% AMM fee

export default function Memecoins() {
  const [coins, setCoins] = useState<Memecoin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Memecoin | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ timestamp: string; price: number }[]>([]);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [isLoading, setIsLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCoin, setNewCoin] = useState({ name: '', symbol: '', emoji: '🪙', initialLiquidity: '' });
  const { balance, fetchBalance } = useUserBalance();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      fetchPriceHistory(selectedCoin.id);
    }
  }, [selectedCoin]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Fetch memecoins
      const { data: coinsData } = await supabase
        .from('memecoins')
        .select('*')
        .order('created_at', { ascending: false });

      if (coinsData) {
        setCoins(coinsData as Memecoin[]);
      }

      if (user) {
        await fetchBalance();
        const { data: settings } = await supabase
          .from('user_manifold_settings')
          .select('manifold_api_key')
          .eq('user_id', user.id)
          .maybeSingle();
        setHasApiKey(!!settings?.manifold_api_key);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPriceHistory = async (coinId: string) => {
    const { data: trades } = await supabase
      .from('memecoin_trades')
      .select('price_per_token, created_at')
      .eq('memecoin_id', coinId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (trades && trades.length > 0) {
      setPriceHistory(trades.map(t => ({
        timestamp: new Date(t.created_at).toLocaleTimeString(),
        price: t.price_per_token,
      })));
    } else {
      // Show initial price if no trades
      const coin = coins.find(c => c.id === coinId);
      if (coin && coin.pool_tokens > 0) {
        setPriceHistory([{ timestamp: 'Now', price: coin.pool_mana / coin.pool_tokens }]);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getPrice = (coin: Memecoin) => {
    if (coin.pool_tokens === 0) return 0;
    return coin.pool_mana / coin.pool_tokens;
  };

  const calculateBuyOutput = (coin: Memecoin, manaIn: number) => {
    const ammFee = manaIn * AMM_FEE;
    const manaInAfterFee = manaIn - ammFee;
    const k = coin.pool_mana * coin.pool_tokens;
    const newPoolMana = coin.pool_mana + manaInAfterFee;
    const newPoolTokens = k / newPoolMana;
    return coin.pool_tokens - newPoolTokens;
  };

  const calculateSellOutput = (coin: Memecoin, tokensIn: number) => {
    const k = coin.pool_mana * coin.pool_tokens;
    const newPoolTokens = coin.pool_tokens + tokensIn;
    const newPoolMana = k / newPoolTokens;
    const manaOut = coin.pool_mana - newPoolMana;
    const ammFee = manaOut * AMM_FEE;
    return manaOut - ammFee;
  };

  const handleTrade = async () => {
    if (!selectedCoin || !tradeAmount || !isAuthenticated) return;
    
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
      return;
    }

    const txFee = amount * TRANSACTION_FEE;
    if (tradeType === 'buy' && (amount + txFee) > balance) {
      toast({ title: 'Insufficient Balance', description: `Need M$${(amount + txFee).toFixed(2)} including fee`, variant: 'destructive' });
      return;
    }

    setIsTrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (tradeType === 'buy') {
        const tokensOut = calculateBuyOutput(selectedCoin, amount);
        const newPoolMana = selectedCoin.pool_mana + amount - (amount * AMM_FEE);
        const newPoolTokens = selectedCoin.pool_tokens - tokensOut;
        const pricePerToken = amount / tokensOut;

        // Deduct balance
        await supabase.functions.invoke('managram', { body: { action: 'withdraw', amount: amount + txFee } });

        // Update pool
        await supabase.from('memecoins').update({ pool_mana: newPoolMana, pool_tokens: newPoolTokens }).eq('id', selectedCoin.id);

        // Record trade
        await supabase.from('memecoin_trades').insert({
          memecoin_id: selectedCoin.id,
          user_id: user.id,
          trade_type: 'buy',
          mana_amount: amount,
          token_amount: tokensOut,
          price_per_token: pricePerToken,
          fee_amount: txFee,
        });

        // Update holdings
        const { data: holding } = await supabase.from('memecoin_holdings').select('*').eq('user_id', user.id).eq('memecoin_id', selectedCoin.id).maybeSingle();
        if (holding) {
          await supabase.from('memecoin_holdings').update({ amount: holding.amount + tokensOut }).eq('id', holding.id);
        } else {
          await supabase.from('memecoin_holdings').insert({ user_id: user.id, memecoin_id: selectedCoin.id, amount: tokensOut });
        }

        toast({ title: 'Trade Executed!', description: `Bought ${tokensOut.toFixed(2)} ${selectedCoin.symbol} for M$${amount} (+M$${txFee.toFixed(2)} fee)` });
      } else {
        // Sell logic - check holdings first
        const { data: holding } = await supabase.from('memecoin_holdings').select('*').eq('user_id', user.id).eq('memecoin_id', selectedCoin.id).maybeSingle();
        if (!holding || holding.amount < amount) {
          toast({ title: 'Insufficient Tokens', variant: 'destructive' });
          setIsTrading(false);
          return;
        }

        const manaOut = calculateSellOutput(selectedCoin, amount);
        const newPoolTokens = selectedCoin.pool_tokens + amount;
        const newPoolMana = selectedCoin.pool_mana - manaOut - (manaOut * AMM_FEE);
        const netMana = manaOut - txFee;

        // Update pool
        await supabase.from('memecoins').update({ pool_mana: newPoolMana, pool_tokens: newPoolTokens }).eq('id', selectedCoin.id);

        // Credit balance
        await supabase.functions.invoke('managram', { body: { action: 'deposit', amount: netMana } });

        // Record trade
        await supabase.from('memecoin_trades').insert({
          memecoin_id: selectedCoin.id,
          user_id: user.id,
          trade_type: 'sell',
          mana_amount: manaOut,
          token_amount: amount,
          price_per_token: manaOut / amount,
          fee_amount: txFee,
        });

        // Update holdings
        await supabase.from('memecoin_holdings').update({ amount: holding.amount - amount }).eq('id', holding.id);

        toast({ title: 'Trade Executed!', description: `Sold ${amount} ${selectedCoin.symbol} for M$${netMana.toFixed(2)} (after fees)` });
      }

      setTradeAmount('');
      await fetchData();
      if (selectedCoin) {
        const updated = coins.find(c => c.id === selectedCoin.id);
        if (updated) setSelectedCoin(updated);
        fetchPriceHistory(selectedCoin.id);
      }
    } catch (error) {
      console.error('Trade error:', error);
      toast({ title: 'Trade Failed', variant: 'destructive' });
    } finally {
      setIsTrading(false);
    }
  };

  const handleCreateCoin = async () => {
    if (!newCoin.name || !newCoin.symbol || !newCoin.initialLiquidity) {
      toast({ title: 'Missing Fields', variant: 'destructive' });
      return;
    }

    const liquidity = parseFloat(newCoin.initialLiquidity);
    const fee = liquidity * TRANSACTION_FEE;
    if (isNaN(liquidity) || liquidity < 100) {
      toast({ title: 'Minimum liquidity is M$100', variant: 'destructive' });
      return;
    }
    if ((liquidity + fee) > balance) {
      toast({ title: 'Insufficient Balance', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deduct balance
      await supabase.functions.invoke('managram', { body: { action: 'withdraw', amount: liquidity + fee } });

      // Create coin with initial pool (50/50 split)
      const { error } = await supabase.from('memecoins').insert({
        name: newCoin.name,
        symbol: newCoin.symbol.toUpperCase(),
        image_url: newCoin.emoji,
        creator_id: user.id,
        pool_mana: liquidity,
        pool_tokens: liquidity * 2, // Start at 0.5 M$ per token
        total_supply: 1000000,
      });

      if (error) throw error;

      toast({ title: 'Memecoin Created!', description: `${newCoin.name} is now live! (M$${fee.toFixed(2)} fee applied)` });
      setCreateOpen(false);
      setNewCoin({ name: '', symbol: '', emoji: '🪙', initialLiquidity: '' });
      await fetchData();
    } catch (error) {
      console.error('Create error:', error);
      toast({ title: 'Creation Failed', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed Memecoins</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">AMM Trading • 0.5% fee</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <WalletPopover balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
                  <Link to="/hub"><Button variant="ghost" size="sm">Hub</Button></Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}><LogOut className="w-4 h-4" /></Button>
                </>
              ) : (
                <Link to="/auth"><Button variant="glow" size="sm">Sign In</Button></Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Real AMM Trading
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Trade <span className="text-gradient">Memecoins</span></h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Constant product AMM with 0.3% pool fee + 0.5% transaction fee.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search coins..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/50" />
          </div>
          {isAuthenticated && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button variant="glow" className="gap-2"><Plus className="w-4 h-4" />Create Memecoin</Button></DialogTrigger>
              <DialogContent className="glass">
                <DialogHeader><DialogTitle>Create New Memecoin</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Name</Label><Input placeholder="ManaCat" value={newCoin.name} onChange={(e) => setNewCoin({ ...newCoin, name: e.target.value })} className="bg-secondary/50" /></div>
                  <div><Label>Symbol</Label><Input placeholder="MCAT" value={newCoin.symbol} onChange={(e) => setNewCoin({ ...newCoin, symbol: e.target.value.toUpperCase().slice(0, 6) })} className="bg-secondary/50" maxLength={6} /></div>
                  <div><Label>Emoji</Label><Input value={newCoin.emoji} onChange={(e) => setNewCoin({ ...newCoin, emoji: e.target.value.slice(0, 2) })} className="bg-secondary/50 text-2xl text-center" maxLength={2} /></div>
                  <div><Label>Initial Liquidity (M$, min 100)</Label><Input type="number" placeholder="100" value={newCoin.initialLiquidity} onChange={(e) => setNewCoin({ ...newCoin, initialLiquidity: e.target.value })} className="bg-secondary/50" min={100} /></div>
                  <Button variant="glow" className="w-full" onClick={handleCreateCoin} disabled={isCreating}>{isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Fund Pool'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Coins className="w-5 h-5 text-primary" />Available Coins ({filteredCoins.length})</h2>
            {filteredCoins.length === 0 ? (
              <Card className="glass p-8 text-center text-muted-foreground">No coins yet. Be the first to create one!</Card>
            ) : (
              filteredCoins.map((coin) => {
                const price = getPrice(coin);
                const isSelected = selectedCoin?.id === coin.id;
                return (
                  <Card key={coin.id} className={`glass cursor-pointer transition-all hover:-translate-y-0.5 ${isSelected ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedCoin(coin)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-2xl">{coin.image_url}</div>
                          <div><h3 className="font-semibold text-foreground">{coin.name}</h3><p className="text-sm text-muted-foreground">{coin.symbol}</p></div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">M${price.toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><Droplets className="w-3 h-3" />Pool: M${coin.pool_mana.toLocaleString()}</div>
                        <div className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />Tokens: {coin.pool_tokens.toLocaleString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            {selectedCoin ? (
              <>
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedCoin.image_url}</span>
                      <div><CardTitle>{selectedCoin.name}</CardTitle><p className="text-sm text-muted-foreground">{selectedCoin.symbol}</p></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceHistory}><XAxis dataKey="timestamp" hide /><YAxis hide domain={['auto', 'auto']} /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} /><Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {isAuthenticated && (
                  <Card className="glass">
                    <CardHeader><CardTitle className="text-lg">Trade {selectedCoin.symbol}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
                        <TabsList className="grid grid-cols-2 w-full"><TabsTrigger value="buy" className="gap-1"><ArrowUp className="w-3 h-3" />Buy</TabsTrigger><TabsTrigger value="sell" className="gap-1"><ArrowDown className="w-3 h-3" />Sell</TabsTrigger></TabsList>
                      </Tabs>
                      <Input type="number" placeholder={tradeType === 'buy' ? 'M$ to spend' : 'Tokens to sell'} value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} className="bg-secondary/50" />
                      <p className="text-xs text-muted-foreground">0.3% AMM fee + 0.5% transaction fee</p>
                      <Button variant="glow" className="w-full" onClick={handleTrade} disabled={isTrading || !hasApiKey}>{isTrading ? <Loader2 className="w-4 h-4 animate-spin" /> : tradeType === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}</Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="glass p-8 text-center text-muted-foreground"><Coins className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Select a coin to trade</p></Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}