import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ExternalLink, TrendingUp, Trash2, Plus, Loader2, CheckCircle, Key } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IndexFund {
  id: string;
  name: string;
  description: string;
  markets: IndexMarket[];
}

interface IndexMarket {
  id: string;
  question: string;
  url: string;
  probability: number;
  allocation: number;
}

export default function IndexFunds() {
  const [funds, setFunds] = useState<IndexFund[]>([]);
  const [selectedFund, setSelectedFund] = useState<IndexFund | null>(null);
  const [customMarkets, setCustomMarkets] = useState<IndexMarket[]>([]);
  const [investmentAmount, setInvestmentAmount] = useState("100");
  const [apiKey, setApiKey] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFunds();
  }, []);

  const fetchFunds = async () => {
    // Fetch admin-created index funds
    const { data } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('strategy', 'index_fund');

    if (data) {
      const parsedFunds = data.map(bot => ({
        id: bot.id,
        name: bot.name,
        description: bot.description || '',
        markets: (bot.config as any)?.markets || [],
      }));
      setFunds(parsedFunds);
      if (parsedFunds.length > 0 && !selectedFund) {
        selectFund(parsedFunds[0]);
      }
    }
    setIsLoading(false);
  };

  const selectFund = (fund: IndexFund) => {
    setSelectedFund(fund);
    setCustomMarkets(fund.markets.map(m => ({ ...m })));
  };

  const updateAllocation = (marketId: string, allocation: number) => {
    setCustomMarkets(prev => prev.map(m => 
      m.id === marketId ? { ...m, allocation } : m
    ));
  };

  const removeMarket = (marketId: string) => {
    setCustomMarkets(prev => prev.filter(m => m.id !== marketId));
  };

  const totalAllocation = customMarkets.reduce((sum, m) => sum + m.allocation, 0);

  const handleExecuteTrades = async () => {
    if (!apiKey.trim()) {
      toast({ title: "API Key Required", description: "Enter your Manifold API key to execute trades.", variant: "destructive" });
      return;
    }

    if (customMarkets.length === 0) {
      toast({ title: "No Markets", description: "Add some markets to the fund first.", variant: "destructive" });
      return;
    }

    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount < 10) {
      toast({ title: "Invalid Amount", description: "Minimum investment is M$10", variant: "destructive" });
      return;
    }

    setIsExecuting(true);
    
    try {
      // Execute trades via edge function (API key is NOT stored)
      const { data, error } = await supabase.functions.invoke('execute-index-fund', {
        body: {
          apiKey, // One-time use, not stored
          markets: customMarkets,
          totalAmount: amount,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Trades Executed!",
        description: `Successfully placed ${data.tradesExecuted} trades totaling M$${amount}.`,
      });

      // Clear the API key after use
      setApiKey("");
    } catch (error) {
      console.error('Execute error:', error);
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Failed to execute trades",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Index Funds
          </CardTitle>
          <CardDescription>
            Choose an index fund curated by ManiFed admins, customize the allocation, and execute all trades at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fund Selection */}
          {funds.length > 0 ? (
            <div className="space-y-4">
              <Label>Select Index Fund</Label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {funds.map(fund => (
                  <Card 
                    key={fund.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedFund?.id === fund.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => selectFund(fund)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold">{fund.name}</h4>
                      <p className="text-sm text-muted-foreground">{fund.description}</p>
                      <Badge variant="secondary" className="mt-2">{fund.markets.length} markets</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No index funds available yet.</p>
              <p className="text-sm">Admins can create index funds from the Treasury Admin page.</p>
            </div>
          )}

          {/* Custom Markets */}
          {selectedFund && customMarkets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Markets in Fund (Customize Allocation)</Label>
                <Badge variant={totalAllocation === 100 ? "success" : "destructive"}>
                  {totalAllocation}% allocated
                </Badge>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {customMarkets.map(market => (
                  <div key={market.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{market.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{(market.probability * 100).toFixed(0)}%</Badge>
                          <a 
                            href={market.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeMarket(market.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-16">{market.allocation}%</span>
                      <Slider
                        value={[market.allocation]}
                        onValueChange={([val]) => updateAllocation(market.id, val)}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Investment Amount & Execute */}
          {selectedFund && customMarkets.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Investment Amount (M$)</Label>
                  <Input
                    type="number"
                    value={investmentAmount}
                    onChange={e => setInvestmentAmount(e.target.value)}
                    min={10}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    Manifold API Key (one-time use)
                  </Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Enter your API key..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your API key is NOT stored.</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium mb-2">Trade Preview:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {customMarkets.map(m => {
                    const amt = (parseFloat(investmentAmount) || 0) * (m.allocation / 100);
                    return (
                      <li key={m.id} className="flex justify-between">
                        <span className="truncate pr-2">{m.question.slice(0, 40)}...</span>
                        <span className="font-mono text-primary">M${amt.toFixed(0)} YES</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Button 
                onClick={handleExecuteTrades}
                disabled={isExecuting || totalAllocation !== 100 || !apiKey}
                className="w-full gap-2"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {isExecuting ? 'Executing Trades...' : 'Execute All Trades'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
