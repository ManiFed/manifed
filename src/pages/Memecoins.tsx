import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useUserBalance } from "@/hooks/useUserBalance";
import { toast } from "@/hooks/use-toast";
import { WalletPopover } from "@/components/WalletPopover";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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

interface Holding {
  memecoin_id: string;
  amount: number;
}

const TRANSACTION_FEE = 0.005; // 0.5%
const AMM_FEE = 0.003; // 0.3% AMM fee

export default function Memecoins() {
  const [coins, setCoins] = useState<Memecoin[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Memecoin | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ timestamp: string; price: number }[]>([]);
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [isLoading, setIsLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCoin, setNewCoin] = useState({ name: "", symbol: "", emoji: "🪙", initialLiquidity: "" });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Fetch memecoins
      const { data: coinsData } = await supabase
        .from("memecoins")
        .select("*")
        .order("created_at", { ascending: false });

      if (coinsData) {
        setCoins(coinsData as Memecoin[]);
      }

      if (user) {
        await fetchBalance();
        const { data: settings } = await supabase
          .from("user_manifold_settings")
          .select("manifold_api_key")
          .eq("user_id", user.id)
          .maybeSingle();
        setHasApiKey(!!settings?.manifold_api_key);

        // Fetch holdings
        const { data: holdingsData } = await supabase
          .from("memecoin_holdings")
          .select("memecoin_id, amount")
          .eq("user_id", user.id);

        if (holdingsData) {
          setHoldings(holdingsData as Holding[]);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPriceHistory = async (coinId: string) => {
    const { data: trades } = await supabase
      .from("memecoin_trades")
      .select("price_per_token, created_at")
      .eq("memecoin_id", coinId)
      .order("created_at", { ascending: true })
      .limit(50);

    if (trades && trades.length > 0) {
      setPriceHistory(
        trades.map((t) => ({
          timestamp: new Date(t.created_at).toLocaleTimeString(),
          price: t.price_per_token,
        })),
      );
    } else {
      const coin = coins.find((c) => c.id === coinId);
      if (coin && coin.pool_tokens > 0) {
        setPriceHistory([{ timestamp: "Now", price: coin.pool_mana / coin.pool_tokens }]);
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getPrice = (coin: Memecoin) => {
    if (coin.pool_tokens === 0) return 0;
    return coin.pool_mana / coin.pool_tokens;
  };

  const getHolding = (coinId: string) => {
    return holdings.find((h) => h.memecoin_id === coinId)?.amount || 0;
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
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }

    // Enforce M$10 minimum for buys
    if (tradeType === "buy" && amount < 10) {
      toast({ title: "Minimum Trade", description: "Minimum buy amount is M$10", variant: "destructive" });
      return;
    }

    // For sells, check if the output would be at least M$10
    if (tradeType === "sell") {
      const estimatedManaOut = calculateSellOutput(selectedCoin, amount);
      if (estimatedManaOut < 10) {
        toast({
          title: "Trade Too Small",
          description: "Sell must result in at least M$10 output",
          variant: "destructive",
        });
        return;
      }
    }

    const txFee = amount * TRANSACTION_FEE;
    if (tradeType === "buy" && amount + txFee > balance) {
      toast({
        title: "Insufficient Balance",
        description: `Need M$${(amount + txFee).toFixed(2)} including fee`,
        variant: "destructive",
      });
      return;
    }

    setIsTrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trade-memecoin", {
        body: { coinId: selectedCoin.id, amount, tradeType },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (tradeType === "buy") {
        toast({
          title: "Trade Executed!",
          description: `Bought ${data.tokensOut?.toFixed(2)} ${selectedCoin.symbol} for M$${amount} (+M$${data.fee?.toFixed(2)} fee)`,
        });
      } else {
        toast({
          title: "Trade Executed!",
          description: `Sold ${amount} ${selectedCoin.symbol} for M$${data.manaOut?.toFixed(2)} (after fees)`,
        });
      }

      setTradeAmount("");
      await fetchData();
      if (selectedCoin) {
        fetchPriceHistory(selectedCoin.id);
      }
    } catch (error) {
      console.error("Trade error:", error);
      toast({
        title: "Trade Failed",
        description:
          error instanceof Error ? error.message : "The WOKE RADICAL LEFT has prevented you from completing the trade.",
        variant: "destructive",
      });
    } finally {
      setIsTrading(false);
    }
  };

  const handleCreateCoin = async () => {
    if (!newCoin.name || !newCoin.symbol || !newCoin.initialLiquidity) {
      toast({ title: "Missing Fields", variant: "destructive" });
      return;
    }

    const liquidity = parseFloat(newCoin.initialLiquidity);
    const fee = liquidity * TRANSACTION_FEE;
    if (isNaN(liquidity) || liquidity < 100) {
      toast({ title: "Minimum liquidity is M$100", variant: "destructive" });
      return;
    }
    if (liquidity + fee > balance) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-memecoin", {
        body: {
          name: newCoin.name,
          symbol: newCoin.symbol,
          emoji: newCoin.emoji,
          initialLiquidity: newCoin.initialLiquidity,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Memecoin Created!",
        description: `${newCoin.name} is now live! (M$${data.fee?.toFixed(2)} fee applied)`,
      });
      setCreateOpen(false);
      setNewCoin({ name: "", symbol: "", emoji: "🪙", initialLiquidity: "" });
      await fetchData();
    } catch (error) {
      console.error("Create error:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Could not create memecoin",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCoins = coins.filter(
    (coin) =>
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
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
                  <Link to="/hub">
                    <Button variant="ghost" size="sm">
                      Hub
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Link to="/auth">
                  <Button variant="default" size="sm">
                    Sign In
                  </Button>
                </Link>
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
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Trade <span className="text-gradient">Memecoins</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Constant product AMM with 0.3% pool fee + 0.5% transaction fee.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between mb-8">
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
                <Button variant="default" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Memecoin
                </Button>
              </DialogTrigger>
              <DialogContent className="glass">
                <DialogHeader>
                  <DialogTitle>Create New Memecoin</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      placeholder="ManaCat"
                      value={newCoin.name}
                      onChange={(e) => setNewCoin({ ...newCoin, name: e.target.value })}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div>
                    <Label>Symbol</Label>
                    <Input
                      placeholder="MCAT"
                      value={newCoin.symbol}
                      onChange={(e) => setNewCoin({ ...newCoin, symbol: e.target.value.toUpperCase().slice(0, 6) })}
                      className="bg-secondary/50"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>Emoji</Label>
                    <Input
                      value={newCoin.emoji}
                      onChange={(e) => setNewCoin({ ...newCoin, emoji: e.target.value.slice(0, 2) })}
                      className="bg-secondary/50 text-2xl text-center"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label>Initial Liquidity (M$, min 100)</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={newCoin.initialLiquidity}
                      onChange={(e) => setNewCoin({ ...newCoin, initialLiquidity: e.target.value })}
                      className="bg-secondary/50"
                      min={100}
                    />
                  </div>
                  <Button variant="default" className="w-full" onClick={handleCreateCoin} disabled={isCreating}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Fund Pool"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Available Coins ({filteredCoins.length})
            </h2>
            {filteredCoins.length === 0 ? (
              <Card className="glass p-8 text-center text-muted-foreground">
                No coins yet. Be the first to create one!
              </Card>
            ) : (
              filteredCoins.map((coin) => {
                const price = getPrice(coin);
                const isSelected = selectedCoin?.id === coin.id;
                const holding = getHolding(coin.id);
                return (
                  <Card
                    key={coin.id}
                    className={`glass cursor-pointer transition-all hover:-translate-y-0.5 ${isSelected ? "ring-2 ring-primary" : ""}`}
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
                          {holding > 0 && <p className="text-xs text-primary">You own: {holding.toFixed(2)}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3 h-3" />
                          Pool: M${coin.pool_mana.toFixed(0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          Tokens: {coin.pool_tokens.toFixed(0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Trading Panel */}
          <div className="space-y-4">
            {selectedCoin ? (
              <>
                <Card className="glass">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <span className="text-2xl">{selectedCoin.image_url}</span>
                      {selectedCoin.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {priceHistory.length > 0 && (
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={priceHistory}>
                            <XAxis dataKey="timestamp" tick={false} />
                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={40} />
                            <Tooltip />
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
                    )}
                    <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg">
                      <Button
                        variant={tradeType === "buy" ? "default" : "ghost"}
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => setTradeType("buy")}
                      >
                        <ArrowUp className="w-3 h-3" />
                        Buy
                      </Button>
                      <Button
                        variant={tradeType === "sell" ? "default" : "ghost"}
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => setTradeType("sell")}
                      >
                        <ArrowDown className="w-3 h-3" />
                        Sell
                      </Button>
                    </div>
                    <div>
                      <Label>{tradeType === "buy" ? "Amount (M$)" : "Tokens to sell"}</Label>
                      <Input
                        type="number"
                        placeholder={tradeType === "buy" ? "Min M$10" : "Enter tokens"}
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="bg-secondary/50"
                      />
                    </div>
                    {tradeAmount && parseFloat(tradeAmount) > 0 && (
                      <div className="p-3 rounded-lg bg-secondary/30 text-sm">
                        {tradeType === "buy" ? (
                          <>
                            <p className="text-muted-foreground">You'll receive:</p>
                            <p className="font-semibold text-foreground">
                              {calculateBuyOutput(selectedCoin, parseFloat(tradeAmount)).toFixed(4)}{" "}
                              {selectedCoin.symbol}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Fee: M${(parseFloat(tradeAmount) * TRANSACTION_FEE).toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground">You'll receive:</p>
                            <p className="font-semibold text-foreground">
                              M$
                              {(
                                calculateSellOutput(selectedCoin, parseFloat(tradeAmount)) *
                                (1 - TRANSACTION_FEE)
                              ).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">After 0.5% fee</p>
                          </>
                        )}
                      </div>
                    )}
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handleTrade}
                      disabled={isTrading || !isAuthenticated || !hasApiKey}
                    >
                      {isTrading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        `${tradeType === "buy" ? "Buy" : "Sell"} ${selectedCoin.symbol}`
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Holdings */}
                {getHolding(selectedCoin.id) > 0 && (
                  <Card className="glass">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Your Holdings</p>
                      <p className="text-xl font-bold text-foreground">
                        {getHolding(selectedCoin.id).toFixed(4)} {selectedCoin.symbol}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ≈ M${(getHolding(selectedCoin.id) * getPrice(selectedCoin)).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="glass p-8 text-center text-muted-foreground">
                <Coins className="w-8 h-8 mx-auto mb-3 opacity-50" />
                Select a coin to trade
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
