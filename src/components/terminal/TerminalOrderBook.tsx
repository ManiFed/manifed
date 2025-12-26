import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrderLevel {
  price: number;
  amount: number;
  side: 'YES' | 'NO';
}

interface TerminalOrderBookProps {
  marketId: string;
  currentProbability: number;
}

export default function TerminalOrderBook({ marketId, currentProbability }: TerminalOrderBookProps) {
  const [orderLevels, setOrderLevels] = useState<{ bids: OrderLevel[]; asks: OrderLevel[] }>({ bids: [], asks: [] });
  const [loading, setLoading] = useState(false);
  const [volume24h, setVolume24h] = useState<number>(0);
  const [liquidity, setLiquidity] = useState<number>(0);

  useEffect(() => {
    if (marketId) {
      fetchOrderBook();
    }
  }, [marketId]);

  const fetchOrderBook = async () => {
    setLoading(true);
    try {
      // Fetch market details for volume and liquidity
      const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
      if (marketResponse.ok) {
        const market = await marketResponse.json();
        setVolume24h(market.volume24Hours || 0);
        setLiquidity(market.totalLiquidity || 0);
      }

      // Fetch pending limit orders to show order book depth
      // Note: Manifold API doesn't directly expose order book, so we simulate based on bets
      const betsResponse = await fetch(`https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=100`);
      if (betsResponse.ok) {
        const bets = await betsResponse.json();
        
        // Look for limit orders (isFilled: false or partially filled)
        const limitOrders = bets.filter((bet: any) => bet.limitProb && !bet.isCancelled && !bet.isFilled);
        
        const bids: OrderLevel[] = [];
        const asks: OrderLevel[] = [];
        
        for (const order of limitOrders) {
          const price = Math.round(order.limitProb * 100);
          const amount = Math.abs(order.amount || order.orderAmount || 0);
          
          if (order.outcome === 'YES') {
            // YES limit buy = bid
            bids.push({ price, amount, side: 'YES' });
          } else {
            // NO limit buy = ask (selling YES)
            asks.push({ price: 100 - price, amount, side: 'NO' });
          }
        }
        
        // Aggregate by price level
        const aggregateBids: { [key: number]: number } = {};
        const aggregateAsks: { [key: number]: number } = {};
        
        bids.forEach(b => {
          aggregateBids[b.price] = (aggregateBids[b.price] || 0) + b.amount;
        });
        asks.forEach(a => {
          aggregateAsks[a.price] = (aggregateAsks[a.price] || 0) + a.amount;
        });
        
        const sortedBids = Object.entries(aggregateBids)
          .map(([price, amount]) => ({ price: parseInt(price), amount, side: 'YES' as const }))
          .sort((a, b) => b.price - a.price)
          .slice(0, 5);
          
        const sortedAsks = Object.entries(aggregateAsks)
          .map(([price, amount]) => ({ price: parseInt(price), amount, side: 'NO' as const }))
          .sort((a, b) => a.price - b.price)
          .slice(0, 5);
        
        setOrderLevels({ bids: sortedBids, asks: sortedAsks });
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
            24h Vol: M${Math.round(volume24h).toLocaleString()}
          </Badge>
          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
            Liq: M${Math.round(liquidity).toLocaleString()}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center text-gray-500 text-xs">
          Loading...
        </div>
      ) : orderLevels.bids.length === 0 && orderLevels.asks.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-gray-500 text-xs">
          No pending limit orders
        </div>
      ) : (
        <div className="space-y-1">
          {/* Asks (selling YES / buying NO) */}
          {orderLevels.asks.slice().reverse().map((level, i) => (
            <div key={`ask-${i}`} className="relative h-5 flex items-center text-xs">
              <div
                className="absolute right-0 h-full bg-red-900/30"
                style={{ width: `${(level.amount / maxAmount) * 100}%` }}
              />
              <span className="relative z-10 w-12 text-red-400">{level.price}%</span>
              <span className="relative z-10 flex-1 text-right text-gray-400 pr-1">
                M${Math.round(level.amount).toLocaleString()}
              </span>
            </div>
          ))}
          
          {/* Current price line */}
          <div className="h-6 flex items-center justify-center border-y border-gray-700 my-1">
            <span className="text-sm font-bold text-emerald-400">
              {(currentProbability * 100).toFixed(1)}%
            </span>
          </div>
          
          {/* Bids (buying YES) */}
          {orderLevels.bids.map((level, i) => (
            <div key={`bid-${i}`} className="relative h-5 flex items-center text-xs">
              <div
                className="absolute left-0 h-full bg-emerald-900/30"
                style={{ width: `${(level.amount / maxAmount) * 100}%` }}
              />
              <span className="relative z-10 w-12 text-emerald-400">{level.price}%</span>
              <span className="relative z-10 flex-1 text-right text-gray-400 pr-1">
                M${Math.round(level.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
