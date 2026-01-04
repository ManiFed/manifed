import { useState, useEffect, useRef, useLayoutEffect } from "react";

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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const centerLineRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (marketId) {
      fetchOrderBook();
      pollingRef.current = setInterval(fetchOrderBook, 3000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [marketId, answerId]);

  const fetchOrderBook = async () => {
    try {
      const marketResponse = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
      if (marketResponse.ok) {
        const market = await marketResponse.json();
        setVolume24h(market.volume24Hours || 0);
        setLiquidity(market.totalLiquidity || 0);
      }

      const betsResponse = await fetch(`https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=1000`);
      if (betsResponse.ok) {
        const bets = await betsResponse.json();
        
        const limitOrders = bets.filter((bet: any) => {
          if (bet.limitProb === undefined || bet.limitProb === null) return false;
          if (bet.isCancelled || bet.isFilled) return false;
          const orderAmount = bet.orderAmount || bet.amount || 0;
          const filledAmount = bet.fills?.reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0) || 0;
          const remaining = orderAmount - filledAmount;
          if (remaining <= 0) return false;
          if (answerId && bet.answerId !== answerId) return false;
          return true;
        });
        
        const currentProbPercent = Math.round(currentProbability * 100);
        const ordersByPrice: { [key: string]: { amount: number; count: number; side: 'YES' | 'NO' } } = {};
        
        for (const order of limitOrders) {
          const limitProb = order.limitProb;
          const price = Math.round(limitProb * 100);
          const orderAmount = order.orderAmount || order.amount || 0;
          const filledAmount = order.fills?.reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0) || 0;
          const remainingAmount = Math.max(0, orderAmount - filledAmount);
          
          if (remainingAmount <= 0) continue;
          
          const key = `${price}-${order.outcome}`;
          if (!ordersByPrice[key]) {
            ordersByPrice[key] = { amount: 0, count: 0, side: order.outcome };
          }
          ordersByPrice[key].amount += remainingAmount;
          ordersByPrice[key].count += 1;
        }
        
        const bids: OrderLevel[] = [];
        const asks: OrderLevel[] = [];
        
        for (const [key, data] of Object.entries(ordersByPrice)) {
          const [priceStr, side] = key.split('-');
          const price = parseInt(priceStr);
          
          if (side === 'YES') {
            if (price < currentProbPercent) {
              bids.push({ price, amount: Math.round(data.amount), side: 'YES', orderCount: data.count });
            } else if (price > currentProbPercent) {
              asks.push({ price, amount: Math.round(data.amount), side: 'YES', orderCount: data.count });
            }
          } else {
            if (price < currentProbPercent) {
              bids.push({ price, amount: Math.round(data.amount), side: 'NO', orderCount: data.count });
            } else if (price > currentProbPercent) {
              asks.push({ price, amount: Math.round(data.amount), side: 'NO', orderCount: data.count });
            }
          }
        }
        
        bids.sort((a, b) => b.price - a.price);
        asks.sort((a, b) => a.price - b.price);
        
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

  useLayoutEffect(() => {
    if (!hasScrolledRef.current && centerLineRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const centerLine = centerLineRef.current;
      const containerHeight = container.clientHeight;
      const centerLineOffsetTop = centerLine.offsetTop;
      container.scrollTop = centerLineOffsetTop - containerHeight / 2 + centerLine.clientHeight / 2;
      hasScrolledRef.current = true;
    }
  }, [orderLevels]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [marketId, answerId]);

  return (
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Orderbook</h3>
          <p className="text-xs text-gray-500">Order entry with live market depth</p>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-5 gap-1 text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">
        <span>Our_Qty</span>
        <span className="text-right">Bid_Size</span>
        <span className="text-center">Bid</span>
        <span className="text-center">Ask</span>
        <span>Ask_Size</span>
      </div>

      {loading && orderLevels.bids.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">Loading...</div>
      ) : orderLevels.bids.length === 0 && orderLevels.asks.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">No pending limit orders</div>
      ) : (
        <div ref={scrollContainerRef} className="h-[200px] overflow-y-auto">
          <div className="space-y-0.5">
            {/* Asks - reversed so lowest ask is closest to spread */}
            {orderLevels.asks.slice().reverse().map((level, i) => (
              <div key={`ask-${i}`} className="grid grid-cols-5 gap-1 text-xs py-1 px-1 hover:bg-[#1a2332] rounded font-mono items-center">
                <span className="text-gray-600">—</span>
                <span className="text-right text-gray-400">{level.amount}</span>
                <span className="text-center text-yellow-400 font-bold">{level.price}</span>
                <span className={`text-center font-bold ${level.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {level.price}
                </span>
                <span className="text-gray-400">{level.amount}</span>
              </div>
            ))}
            
            {/* Current price line */}
            <div 
              ref={centerLineRef}
              className="py-2 my-1 border-y border-[#1e2736] bg-[#0a0e14]"
            >
              <div className="text-center">
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {(currentProbability * 100).toFixed(1)}%
                </span>
                {spread !== null && (
                  <span className="text-xs text-gray-500 ml-2">
                    Spread: {spread}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Bids */}
            {orderLevels.bids.map((level, i) => (
              <div key={`bid-${i}`} className="grid grid-cols-5 gap-1 text-xs py-1 px-1 hover:bg-[#1a2332] rounded font-mono items-center">
                <span className="text-gray-600">—</span>
                <span className="text-right text-gray-400">{level.amount}</span>
                <span className={`text-center font-bold ${level.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {level.price}
                </span>
                <span className="text-center text-yellow-400 font-bold">{level.price}</span>
                <span className="text-gray-400">{level.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e2736] text-xs">
        <div className="text-gray-500">
          24h Vol: <span className="text-white font-mono">M${Math.round(volume24h).toLocaleString()}</span>
        </div>
        <div className="text-gray-500">
          Liquidity: <span className="text-white font-mono">M${Math.round(liquidity).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
