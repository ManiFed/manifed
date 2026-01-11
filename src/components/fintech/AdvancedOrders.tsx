import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Target, X, RefreshCw, ExternalLink, ShieldAlert, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CopyTradeOrder from "./CopyTradeOrder";

interface Position {
  yesShares: number;
  noShares: number;
  invested: number;
  hasYesShares: boolean;
  hasNoShares: boolean;
  answerId?: string;
  answerText?: string;
}

interface Market {
  id: string;
  question: string;
  url: string;
  probability: number;
  outcomeType?: string;
  answers?: {
    id: string;
    text: string;
    probability: number;
  }[];
}

interface LimitSellOrder {
  id: string;
  market_id: string;
  market_question: string;
  market_url: string;
  position_type: string;
  shares_held: number;
  entry_price: number;
  target_exit_price: number;
  status: string;
  cash_required: number;
  expected_profit: number;
  created_at: string;
}

export default function AdvancedOrders() {
  const [apiKey, setApiKey] = useState("");
  const [marketUrl, setMarketUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Limit Sell Order state
  const [position, setPosition] = useState<Position | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [targetExitPrice, setTargetExitPrice] = useState("");
  const [limitSellOrders, setLimitSellOrders] = useState<LimitSellOrder[]>([]);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: limitData } = await supabase.functions.invoke('limit-sell-order', {
        body: { action: 'get-orders' }
      });
      if (limitData?.orders) setLimitSellOrders(limitData.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const extractMarketId = (url: string): string | null => {
    const patterns = [
      /manifold\.markets\/[^/]+\/([a-zA-Z0-9-]+)/,
      /^([a-zA-Z0-9-]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const loadMarket = async () => {
    const marketId = extractMarketId(marketUrl);
    if (!marketId) {
      toast({ title: 'Invalid URL', description: 'Could not parse market URL', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/slug/${marketId}`);
      if (!response.ok) throw new Error('Market not found');
      const data = await response.json();
      setMarket({
        id: data.id,
        question: data.question,
        url: data.url,
        probability: data.probability,
        outcomeType: data.outcomeType,
        answers: data.answers
      });
      setPosition(null);
      setSelectedAnswerId('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load market', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPosition = async () => {
    if (!apiKey || !market) {
      toast({ title: 'Missing fields', description: 'Enter API key and load market first', variant: 'destructive' });
      return;
    }

    // For MC markets, require answer selection
    if (market.outcomeType === 'MULTIPLE_CHOICE' && !selectedAnswerId) {
      toast({ title: 'Select an option', description: 'Choose an option for Multiple Choice markets', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('limit-sell-order', {
        body: { 
          action: 'get-position', 
          apiKey, 
          marketId: market.id,
          answerId: selectedAnswerId || undefined
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const pos = data.position;
      if (selectedAnswerId && market.answers) {
        const answer = market.answers.find(a => a.id === selectedAnswerId);
        pos.answerId = selectedAnswerId;
        pos.answerText = answer?.text;
      }

      setMarket(prev => prev ? { ...prev, probability: data.market?.probability || prev.probability } : null);
      setPosition(pos);
      setUserBalance(data.user?.balance || 0);

      toast({ title: 'Position loaded', description: `Found ${pos.hasYesShares ? 'YES' : 'NO'} shares` });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to load position', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const placeLimitSellOrder = async () => {
    if (!market || !position || !targetExitPrice) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }

    const targetPrice = parseFloat(targetExitPrice) / 100;
    if (targetPrice <= 0 || targetPrice >= 1) {
      toast({ title: 'Invalid price', description: 'Target must be between 1-99%', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('limit-sell-order', {
        body: { 
          action: 'place-limit-sell', 
          apiKey, 
          marketId: market.id,
          targetExitPrice: targetPrice,
          answerId: position.answerId || undefined
        }
      });

      if (error) throw error;
      if (data?.error) {
        const errorMsg = data.details || data.error;
        toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
        return;
      }

      toast({ title: 'Success', description: data.message });
      setPosition(null);
      setMarket(null);
      setTargetExitPrice("");
      setSelectedAnswerId("");
      setApiKey("");
      fetchOrders();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to place order', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!apiKey) {
      toast({ title: 'API key required', description: 'Enter your API key to cancel orders', variant: 'destructive' });
      return;
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('limit-sell-order', {
        body: { action: 'cancel-order', orderId, apiKey }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Order cancelled' });
      fetchOrders();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to cancel', 
        variant: 'destructive' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      filled: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-muted text-muted-foreground',
      failed: 'bg-destructive/20 text-destructive',
    };
    return <Badge className={variants[status] || 'bg-muted'}>{status}</Badge>;
  };

  const calculatePreview = () => {
    if (!position || !targetExitPrice || !market) return null;
    
    const targetPrice = parseFloat(targetExitPrice) / 100;
    if (isNaN(targetPrice) || targetPrice <= 0 || targetPrice >= 1) return null;

    const positionType = position.hasYesShares ? 'YES' : 'NO';
    const sharesHeld = position.hasYesShares ? position.yesShares : position.noShares;
    const entryPrice = position.invested / sharesHeld;
    
    const cashRequired = positionType === 'YES' 
      ? sharesHeld * (1 - targetPrice)
      : sharesHeld * targetPrice;

    const expectedProfit = positionType === 'YES'
      ? sharesHeld * (targetPrice - entryPrice)
      : sharesHeld * ((1 - targetPrice) - (1 - entryPrice));

    const hasEnoughBalance = userBalance >= cashRequired;

    return {
      positionType,
      sharesHeld,
      entryPrice,
      cashRequired,
      expectedProfit,
      oppositeOutcome: positionType === 'YES' ? 'NO' : 'YES',
      limitPrice: positionType === 'YES' ? 1 - targetPrice : targetPrice,
      hasEnoughBalance
    };
  };

  const preview = calculatePreview();
  const isMultiChoice = market?.outcomeType === 'MULTIPLE_CHOICE';

  return (
    <div className="space-y-6">
      {/* API Key Input */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="font-display">Manifold API Key</CardTitle>
          <CardDescription className="font-serif">
            Required for placing orders on your behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Manifold API key..."
            className="font-serif"
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm font-serif text-amber-500">
              <strong>Privacy Notice:</strong> We do NOT store your API key. It is only used temporarily to execute your order and is cleared immediately after.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Types Tabs */}
      <Tabs defaultValue="limit-sell" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="limit-sell" className="gap-2">
            <Target className="w-4 h-4" /> Limit Sell
          </TabsTrigger>
          <TabsTrigger value="copy-trade" className="gap-2">
            <Copy className="w-4 h-4" /> Copy Trade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="limit-sell">
          {/* Limit Sell Order Creation */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Target className="w-5 h-5" />
                Limit Sell Orders
              </CardTitle>
              <CardDescription className="font-serif">
                Exit your position by placing an opposite limit order. When the market reaches your target price,
                you'll hold equal YES and NO shares, locking in profit regardless of resolution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-serif">Market URL or ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={marketUrl}
                    onChange={(e) => setMarketUrl(e.target.value)}
                    placeholder="https://manifold.markets/..."
                    className="font-serif flex-1"
                  />
                  <Button onClick={loadMarket} disabled={isLoading || !marketUrl} className="font-serif">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Market'}
                  </Button>
                </div>
              </div>

              {/* Market Info */}
              {market && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-serif font-medium">{market.question}</p>
                  <div className="flex gap-4 text-sm">
                    <span>Current: <strong>{(market.probability * 100).toFixed(1)}%</strong></span>
                    {isMultiChoice && (
                      <Badge variant="outline">Multiple Choice ({market.answers?.length} options)</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* MC Option Selection */}
              {isMultiChoice && market?.answers && (
                <div className="space-y-2">
                  <Label className="font-serif">Select Option</Label>
                  <Select value={selectedAnswerId} onValueChange={setSelectedAnswerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {market.answers.map((answer) => (
                        <SelectItem key={answer.id} value={answer.id}>
                          {answer.text} ({(answer.probability * 100).toFixed(1)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {market && (
                <Button 
                  onClick={loadPosition} 
                  disabled={isLoading || !apiKey || (isMultiChoice && !selectedAnswerId)} 
                  className="font-serif"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Position'}
                </Button>
              )}

              {market && position && (
                <>
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <p className="font-serif text-sm text-muted-foreground">Your Position</p>
                    <div className="flex gap-4 text-sm">
                      <span>
                        Position: <strong className={position.hasYesShares ? 'text-emerald-500' : 'text-red-500'}>
                          {position.hasYesShares ? 'YES' : 'NO'}
                        </strong> 
                        {' '}({(position.hasYesShares ? position.yesShares : position.noShares).toFixed(2)} shares)
                      </span>
                    </div>
                    {position.answerText && (
                      <p className="text-xs text-muted-foreground">Option: {position.answerText}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-serif">Target Exit Price (%)</Label>
                    <Input
                      type="number"
                      value={targetExitPrice}
                      onChange={(e) => setTargetExitPrice(e.target.value)}
                      placeholder={position.hasYesShares ? "e.g. 70 (sell when YES reaches 70%)" : "e.g. 30 (sell when NO reaches 30%)"}
                      min="1"
                      max="99"
                      className="font-serif"
                    />
                  </div>

                  {preview && (
                    <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 space-y-2">
                      <p className="font-serif font-medium text-accent">Order Preview</p>
                      <div className="grid grid-cols-2 gap-2 text-sm font-serif">
                        <span className="text-muted-foreground">Will place:</span>
                        <span>{preview.oppositeOutcome} limit @ {(preview.limitPrice * 100).toFixed(0)}%</span>
                        <span className="text-muted-foreground">Cash required:</span>
                        <span className={!preview.hasEnoughBalance ? 'text-red-400 font-medium' : ''}>
                          Ṁ{preview.cashRequired.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">Your balance:</span>
                        <span className={!preview.hasEnoughBalance ? 'text-red-400 font-medium' : 'text-green-400'}>
                          Ṁ{userBalance.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground">Expected profit:</span>
                        <span className={preview.expectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                          Ṁ{preview.expectedProfit.toFixed(2)}
                        </span>
                      </div>
                      {!preview.hasEnoughBalance && (
                        <p className="text-sm text-red-400 mt-2">
                          ⚠️ Insufficient balance. You need Ṁ{Math.ceil(preview.cashRequired - userBalance)} more to place this order.
                        </p>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={placeLimitSellOrder} 
                    disabled={isLoading || !preview || !preview.hasEnoughBalance}
                    className="w-full font-serif"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Place Limit Sell Order
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copy-trade">
          <CopyTradeOrder apiKey={apiKey} onOrderPlaced={fetchOrders} />
        </TabsContent>
      </Tabs>

      {/* Limit Sell Orders List */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Your Limit Sell Orders</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchOrders} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {limitSellOrders.length === 0 ? (
            <p className="text-muted-foreground font-serif text-center py-4">No limit sell orders yet</p>
          ) : (
            <div className="space-y-3">
              {limitSellOrders.map((order) => (
                <div key={order.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-serif text-sm flex-1">{order.market_question}</p>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-serif text-muted-foreground">
                    <span>{order.position_type} @ {(order.target_exit_price * 100).toFixed(0)}%</span>
                    <span>Profit: M${order.expected_profit.toFixed(2)}</span>
                    {order.status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={() => cancelOrder(order.id)}
                      >
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                    <a 
                      href={order.market_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-auto"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}