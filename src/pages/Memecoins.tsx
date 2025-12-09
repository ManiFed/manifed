import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { toast } from '@/hooks/use-toast';
import {
  Landmark,
  Coins,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpDown,
  Droplets,
  BarChart3,
  Loader2,
  LogOut,
  Wallet,
  Search,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { WalletPopover } from '@/components/WalletPopover';
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

interface PriceHistory {
  timestamp: string;
  price: number;
}

// Mock data for demo
const MOCK_COINS: Memecoin[] = [
  {
    id: '1',
    name: 'ManaCat',
    symbol: 'MCAT',
    image_url: '🐱',
    creator_id: 'user1',
    created_at: new Date().toISOString(),
    pool_mana: 50000,
    pool_tokens: 100000,
    total_supply: 1000000,
  },
  {
    id: '2',
    name: 'Prediction Pepe',
    symbol: 'PEPE',
    image_url: '🐸',
    creator_id: 'user2',
    created_at: new Date().toISOString(),
    pool_mana: 25000,
    pool_tokens: 250000,
    total_supply: 1000000,
  },
  {
    id: '3',
    name: 'Diamond Hands',
    symbol: 'DHAND',
    image_url: '💎',
    creator_id: 'user3',
    created_at: new Date().toISOString(),
    pool_mana: 100000,
    pool_tokens: 50000,
    total_supply: 1000000,
  },
];

const generateMockPriceHistory = (): PriceHistory[] => {
  const data: PriceHistory[] = [];
  let price = 0.5;
  for (let i = 24; i >= 0; i--) {
    const date = new Date();
    date.setHours(date.getHours() - i);
    price = price * (1 + (Math.random() - 0.48) * 0.1);
    data.push({
      timestamp: date.toISOString(),
      price: Math.max(0.01, price),
    });
  }
  return data;
};

export default function Memecoins() {
  const [coins, setCoins] = useState<Memecoin[]>(MOCK_COINS);
  const [selectedCoin, setSelectedCoin] = useState<Memecoin | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newCoin, setNewCoin] = useState({ name: '', symbol: '', emoji: '🪙', initialLiquidity: '' });
  const { balance, fetchBalance } = useUserBalance();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedCoin) {
      setPriceHistory(generateMockPriceHistory());
    }
  }, [selectedCoin]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    if (user) {
      await fetchBalance();
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasApiKey(!!settings?.manifold_api_key);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getPrice = (coin: Memecoin) => {
    // AMM constant product formula: x * y = k
    return coin.pool_mana / coin.pool_tokens;
  };

  const calculateBuyOutput = (coin: Memecoin, manaIn: number) => {
    // Constant product formula with 0.3% fee
    const fee = manaIn * 0.003;
    const manaInAfterFee = manaIn - fee;
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
    const fee = manaOut * 0.003;
    return manaOut - fee;
  };

  const handleTrade = async () => {
    if (!selectedCoin || !tradeAmount) return;
    
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (tradeType === 'buy' && amount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You need more M$ to make this trade',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate trade (in production this would call an edge function)
    setTimeout(() => {
      const output = tradeType === 'buy' 
        ? calculateBuyOutput(selectedCoin, amount)
        : calculateSellOutput(selectedCoin, amount);
      
      toast({
        title: 'Trade Executed!',
        description: tradeType === 'buy'
          ? `Bought ${output.toFixed(2)} ${selectedCoin.symbol} for M$${amount}`
          : `Sold ${amount} ${selectedCoin.symbol} for M$${output.toFixed(2)}`,
      });
      
      setTradeAmount('');
      setIsLoading(false);
    }, 1000);
  };

  const handleCreateCoin = async () => {
    if (!newCoin.name || !newCoin.symbol || !newCoin.initialLiquidity) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const liquidity = parseFloat(newCoin.initialLiquidity);
    if (isNaN(liquidity) || liquidity < 100) {
      toast({
        title: 'Invalid Liquidity',
        description: 'Minimum initial liquidity is M$100',
        variant: 'destructive',
      });
      return;
    }

    if (liquidity > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You need more M$ to create this pool',
        variant: 'destructive',
      });
      return;
    }

    // Simulate creation
    const newMemecoin: Memecoin = {
      id: Date.now().toString(),
      name: newCoin.name,
      symbol: newCoin.symbol.toUpperCase(),
      image_url: newCoin.emoji,
      creator_id: 'current_user',
      created_at: new Date().toISOString(),
      pool_mana: liquidity,
      pool_tokens: liquidity * 2, // Start at 0.5 M$ per token
      total_supply: 1000000,
    };

    setCoins([newMemecoin, ...coins]);
    setCreateOpen(false);
    setNewCoin({ name: '', symbol: '', emoji: '🪙', initialLiquidity: '' });
    
    toast({
      title: 'Memecoin Created!',
      description: `${newCoin.name} (${newCoin.symbol}) is now live!`,
    });
  };

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const price24hChange = () => {
    if (priceHistory.length < 2) return 0;
    const first = priceHistory[0].price;
    const last = priceHistory[priceHistory.length - 1].price;
    return ((last - first) / first) * 100;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed Memecoins</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">AMM Trading</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <WalletPopover balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
                  <Link to="/hub">
                    <Button variant="ghost" size="sm">Dashboard</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button variant="glow" size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AMM-Style Trading
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Trade <span className="text-gradient">Memecoins</span> with Mana
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Create or trade memecoins in automated liquidity pools. Constant product AMM with 0.3% trading fees.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          
          {isAuthenticated && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="glow" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Memecoin
                </Button>
              </DialogTrigger>
              <DialogContent className="glass">
                <DialogHeader>
                  <DialogTitle>Create New Memecoin</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Coin Name</Label>
                    <Input
                      placeholder="e.g., ManaCat"
                      value={newCoin.name}
                      onChange={(e) => setNewCoin({ ...newCoin, name: e.target.value })}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input
                      placeholder="e.g., MCAT"
                      value={newCoin.symbol}
                      onChange={(e) => setNewCoin({ ...newCoin, symbol: e.target.value.toUpperCase().slice(0, 6) })}
                      className="bg-secondary/50"
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emoji Icon</Label>
                    <Input
                      placeholder="🪙"
                      value={newCoin.emoji}
                      onChange={(e) => setNewCoin({ ...newCoin, emoji: e.target.value.slice(0, 2) })}
                      className="bg-secondary/50 text-2xl text-center"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Liquidity (M$)</Label>
                    <Input
                      type="number"
                      placeholder="Minimum M$100"
                      value={newCoin.initialLiquidity}
                      onChange={(e) => setNewCoin({ ...newCoin, initialLiquidity: e.target.value })}
                      className="bg-secondary/50"
                      min={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll receive LP tokens representing your share of the pool
                    </p>
                  </div>
                  <Button variant="glow" className="w-full" onClick={handleCreateCoin}>
                    Create & Fund Pool
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Coin List */}
          <div className="lg:col-span-2 space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Available Coins
            </h2>
            
            <div className="space-y-3">
              {filteredCoins.map((coin) => {
                const price = getPrice(coin);
                const isSelected = selectedCoin?.id === coin.id;
                const change = Math.random() > 0.5 ? Math.random() * 20 : -Math.random() * 15;
                
                return (
                  <Card
                    key={coin.id}
                    className={`glass cursor-pointer transition-all hover:-translate-y-0.5 ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedCoin(coin)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-2xl">
                            {coin.image_url}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{coin.name}</h3>
                            <p className="text-sm text-muted-foreground">{coin.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">M${price.toFixed(4)}</p>
                          <div className={`flex items-center justify-end gap-1 text-sm ${
                            change >= 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(change).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          Pool: M${coin.pool_mana.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          Supply: {(coin.total_supply / 1000).toFixed(0)}K
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Trading Panel */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
            {selectedCoin ? (
              <>
                {/* Price Chart */}
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{selectedCoin.image_url}</span>
                        <div>
                          <CardTitle className="text-lg">{selectedCoin.symbol}</CardTitle>
                          <CardDescription>{selectedCoin.name}</CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">M${getPrice(selectedCoin).toFixed(4)}</p>
                        <p className={`text-sm ${price24hChange() >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {price24hChange() >= 0 ? '+' : ''}{price24hChange().toFixed(2)}% (24h)
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceHistory}>
                          <XAxis dataKey="timestamp" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                            formatter={(value: number) => [`M$${value.toFixed(4)}`, 'Price']}
                          />
                          <Line
                            type="monotone"
                            dataKey="price"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Trade Form */}
                {isAuthenticated ? (
                  <Card className="glass">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowUpDown className="w-5 h-5 text-primary" />
                        Trade
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs value={tradeType} onValueChange={(v) => setTradeType(v as 'buy' | 'sell')}>
                        <TabsList className="w-full">
                          <TabsTrigger value="buy" className="flex-1">Buy</TabsTrigger>
                          <TabsTrigger value="sell" className="flex-1">Sell</TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Label>{tradeType === 'buy' ? 'M$ Amount' : `${selectedCoin.symbol} Amount`}</Label>
                          {tradeType === 'buy' && (
                            <span className="text-muted-foreground">Balance: M${balance.toLocaleString()}</span>
                          )}
                        </div>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          className="bg-secondary/50"
                        />
                      </div>

                      {tradeAmount && parseFloat(tradeAmount) > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-sm text-muted-foreground">You'll receive</p>
                          <p className="text-lg font-semibold text-foreground">
                            {tradeType === 'buy' 
                              ? `${calculateBuyOutput(selectedCoin, parseFloat(tradeAmount)).toFixed(2)} ${selectedCoin.symbol}`
                              : `M$${calculateSellOutput(selectedCoin, parseFloat(tradeAmount)).toFixed(2)}`
                            }
                          </p>
                        </div>
                      )}

                      <Button
                        variant="glow"
                        className="w-full"
                        onClick={handleTrade}
                        disabled={isLoading || !tradeAmount}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : tradeType === 'buy' ? (
                          <>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Buy {selectedCoin.symbol}
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Sell {selectedCoin.symbol}
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        0.3% trading fee
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="glass">
                    <CardContent className="p-6 text-center">
                      <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-foreground font-medium mb-2">Connect to Trade</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sign in to buy and sell memecoins
                      </p>
                      <Link to="/auth">
                        <Button variant="glow" className="w-full">Sign In</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}

                {/* Pool Info */}
                <Card className="glass">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      Liquidity Pool
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pool M$</span>
                      <span className="text-foreground">M${selectedCoin.pool_mana.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pool {selectedCoin.symbol}</span>
                      <span className="text-foreground">{selectedCoin.pool_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Supply</span>
                      <span className="text-foreground">{selectedCoin.total_supply.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="glass">
                <CardContent className="p-8 text-center">
                  <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-foreground font-medium">Select a coin to trade</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click on any coin to view details and start trading
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
