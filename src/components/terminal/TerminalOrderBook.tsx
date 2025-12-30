import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OrderLevel {
  price: number;
  amount: number;
  side: 'YES' | 'NO';
  orderCount: number;
}

interface TerminalOrderBookProps {
  marketId: string;
  currentProbability: number;
  answerId?: string;
}

export default function TerminalOrderBook({ marketId, currentProbability, answerId }: TerminalOrderBookProps) {
  const [orderLevels, setOrderLevels] = useState<{ bids: OrderLevel[]; asks: OrderLevel[] }>({ bids: [], asks: [] });
  const [loading, setLoading] = useState(false);
  const [volume24h, setVolume24h] = useState<number>(0);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [spread, setSpread] = useState<number | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (marketId) {
      fetchOrderBook();
      // Refresh every 3 seconds for live updates
      pollingRef.current = setInterval(fetchOrderBook, 3000);
      
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [marketId, answerId]);

  const fetchOrderBook = async () => {
    try {
      // Fetch market details for volume and liquidity
      const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
      if (marketResponse.ok) {
        const market = await marketResponse.json();
        setVolume24h(market.volume24Hours || 0);
        setLiquidity(market.totalLiquidity || 0);
      }

      // Fetch ALL bets to get complete order book - use larger limit
      const betsResponse = await fetch(`https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=1000`);
      if (betsResponse.ok) {
        const bets = await betsResponse.json();
        
        // Filter for unfilled limit orders only
        const limitOrders = bets.filter((bet: any) => {
          // Must have a limit probability set
          if (bet.limitProb === undefined || bet.limitProb === null) return false;
          // Skip cancelled or fully filled orders
          if (bet.isCancelled || bet.isFilled) return false;
          // Calculate remaining amount
          const orderAmount = bet.orderAmount || bet.amount || 0;
          const filledAmount = bet.fills?.reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0) || 0;
          const remaining = orderAmount - filledAmount;
          if (remaining <= 0) return false;
          // Filter by answerId for MC markets
          if (answerId && bet.answerId !== answerId) return false;
          return true;
        });
        
        // Aggregate by price level with precise remaining amounts
        const bidLevels: { [key: number]: { amount: number; count: number } } = {};
        const askLevels: { [key: number]: { amount: number; count: number } } = {};
        
        for (const order of limitOrders) {
          const limitProb = order.limitProb;
          const price = Math.round(limitProb * 100);
          const orderAmount = order.orderAmount || order.amount || 0;
          const filledAmount = order.fills?.reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0) || 0;
          const remainingAmount = Math.max(0, orderAmount - filledAmount);
          
          if (remainingAmount <= 0) continue;
          
          if (order.outcome === 'YES') {
            // YES limit buy = bid (wanting to buy YES at this price or lower)
            if (!bidLevels[price]) bidLevels[price] = { amount: 0, count: 0 };
            bidLevels[price].amount += remainingAmount;
            bidLevels[price].count += 1;
          } else {
            // NO limit buy at price X means they want to sell YES at price (100-X)
            // So if someone buys NO at 40%, that's like selling YES at 60%
            const effectiveAskPrice = 100 - price;
            if (!askLevels[effectiveAskPrice]) askLevels[effectiveAskPrice] = { amount: 0, count: 0 };
            askLevels[effectiveAskPrice].amount += remainingAmount;
            askLevels[effectiveAskPrice].count += 1;
          }
        }
        
        // Convert to arrays - bids sorted high to low, asks sorted low to high
        const bids = Object.entries(bidLevels)
          .map(([price, data]) => ({ 
            price: parseInt(price), 
            amount: Math.round(data.amount), 
            side: 'YES' as const,
            orderCount: data.count 
          }))
          .sort((a, b) => b.price - a.price);
          
        const asks = Object.entries(askLevels)
          .map(([price, data]) => ({ 
            price: parseInt(price), 
            amount: Math.round(data.amount), 
            side: 'NO' as const,
            orderCount: data.count 
          }))
          .sort((a, b) => a.price - b.price);
        
        // Calculate spread from best bid and best ask
        if (bids.length > 0 && asks.length > 0) {
          const bestBid = bids[0].price;
          const bestAsk = asks[0].price;
          setSpread(Math.abs(bestAsk - bestBid));
        } else {
          setSpread(null);
        }
        
        setOrderLevels({ bids, asks });
      }
    } catch (err) {
      console.error('Failed to fetch order book:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxAmount = Math.max(
    ...orderLevels.bids.map(b => b.amount),
    ...orderLevels.asks.map(a => a.amount),
    1
  );

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Order Book</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
            24h: M${Math.round(volume24h).toLocaleString()}
          </Badge>
          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
            Liq: M${Math.round(liquidity).toLocaleString()}
          </Badge>
        </div>
      </div>

      {loading && orderLevels.bids.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
          Loading...
        </div>
      ) : orderLevels.bids.length === 0 && orderLevels.asks.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
          No pending limit orders
        </div>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="space-y-1 pr-2">
            {/* Asks (selling YES / buying NO) - show in reverse order */}
            {orderLevels.asks.slice().reverse().map((level, i) => (
              <div key={`ask-${i}`} className="relative h-6 flex items-center text-xs">
                <div
                  className="absolute right-0 h-full bg-red-900/30 transition-all duration-300"
                  style={{ width: `${(level.amount / maxAmount) * 100}%` }}
                />
                <span className="relative z-10 w-14 text-red-400 font-mono">{level.price}%</span>
                <span className="relative z-10 flex-1 text-right text-gray-400 pr-1 font-mono">
                  M${Math.round(level.amount).toLocaleString()}
                </span>
                <span className="relative z-10 w-8 text-right text-gray-600 text-[10px]">
                  ({level.orderCount})
                </span>
              </div>
            ))}
            
            {/* Current price line with spread */}
            <div className="h-8 flex flex-col items-center justify-center border-y border-gray-700 my-1 sticky top-0 bg-gray-900/90 z-10">
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {(currentProbability * 100).toFixed(1)}%
              </span>
              {spread !== null && (
                <span className="text-[10px] text-gray-500">
                  Spread: {spread}%
                </span>
              )}
            </div>
            
            {/* Bids (buying YES) */}
            {orderLevels.bids.map((level, i) => (
              <div key={`bid-${i}`} className="relative h-6 flex items-center text-xs">
                <div
                  className="absolute left-0 h-full bg-emerald-900/30 transition-all duration-300"
                  style={{ width: `${(level.amount / maxAmount) * 100}%` }}
                />
                <span className="relative z-10 w-14 text-emerald-400 font-mono">{level.price}%</span>
                <span className="relative z-10 flex-1 text-right text-gray-400 pr-1 font-mono">
                  M${Math.round(level.amount).toLocaleString()}
                </span>
                <span className="relative z-10 w-8 text-right text-gray-600 text-[10px]">
                  ({level.orderCount})
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
