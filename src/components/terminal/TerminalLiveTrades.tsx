import { useState, useEffect, useRef } from "react";
import { useTradeSound } from "@/hooks/useTradeSound";

interface Trade {
  id: string;
  createdTime: number;
  userName: string;
  userId: string;
  amount: number;
  outcome: string;
  probBefore: number;
  probAfter: number;
  shares: number;
  isApi?: boolean;
  answerId?: string;
  answerText?: string;
  isLimitOrder: boolean;
  limitProb?: number;
  orderAmount?: number;
  isFilled?: boolean;
}

interface TerminalLiveTradesProps {
  marketId: string;
  answers?: {
    id: string;
    text: string;
  }[];
  selectedAnswerId?: string;
  soundEnabled?: boolean;
}

export default function TerminalLiveTrades({
  marketId,
  answers,
  selectedAnswerId,
  soundEnabled = true,
}: TerminalLiveTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const lastTradeIdRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { playTradeSound } = useTradeSound();

  // Stats
  const makerCount = trades.filter(t => t.isLimitOrder).length;
  const takerCount = trades.filter(t => !t.isLimitOrder).length;

  useEffect(() => {
    if (marketId) {
      fetchTrades(true);
      pollingRef.current = setInterval(() => fetchTrades(false), 2000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [marketId, selectedAnswerId]);

  const fetchTrades = async (isInitial: boolean) => {
    if (isInitial) setLoading(true);
    try {
      const url = `https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=50&order=desc`;
      const response = await fetch(url);
      if (response.ok) {
        const bets = await response.json();
        const mappedTrades: Trade[] = bets
          .filter((bet: any) => {
            if (selectedAnswerId && bet.answerId !== selectedAnswerId) return false;
            return true;
          })
          .map((bet: any) => {
            let answerText = "";
            if (bet.answerId && answers) {
              const answer = answers.find((a) => a.id === bet.answerId);
              answerText = answer?.text || "";
            }
            const isLimitOrder = bet.limitProb !== undefined && bet.limitProb !== null;
            return {
              id: bet.id,
              createdTime: bet.createdTime,
              userName: bet.username || bet.userUsername || bet.userName || "Unknown",
              userId: bet.userId,
              amount: Math.abs(bet.amount),
              outcome: bet.outcome,
              probBefore: bet.probBefore,
              probAfter: bet.probAfter,
              shares: bet.shares,
              isApi: bet.isApi,
              answerId: bet.answerId,
              answerText,
              isLimitOrder,
              limitProb: bet.limitProb,
              orderAmount: bet.orderAmount,
              isFilled: bet.isFilled,
            };
          });

        if (!isInitial && soundEnabled && mappedTrades.length > 0) {
          const latestTrade = mappedTrades[0];
          if (lastTradeIdRef.current && latestTrade.id !== lastTradeIdRef.current) {
            playTradeSound("newTrade");
          }
        }
        if (mappedTrades.length > 0) {
          lastTradeIdRef.current = mappedTrades[0].id;
        }
        setTrades(mappedTrades);
      }
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">Blotter</h3>
        <p className="text-xs text-gray-500">Real-time trade execution and monitoring</p>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 mb-4 text-xs border-b border-[#1e2736] pb-3">
        <div>
          <span className="text-gray-500">TRADES:</span>
          <span className="text-white font-mono ml-1">{trades.length}</span>
        </div>
        <div>
          <span className="text-gray-500">MAKER:</span>
          <span className="text-white font-mono ml-1">{makerCount}</span>
        </div>
        <div>
          <span className="text-gray-500">TAKER:</span>
          <span className="text-white font-mono ml-1">{takerCount}</span>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-6 gap-2 text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">
        <span>Time</span>
        <span>Side</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Px</span>
        <span className="text-right">P&L</span>
        <span className="text-right">M/T</span>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">Loading...</div>
      ) : trades.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">No recent trades</div>
      ) : (
        <div className="h-[180px] overflow-y-auto space-y-0.5">
          {trades.slice(0, 15).map((trade) => {
            const pnlChange = trade.probAfter - trade.probBefore;
            const pnlValue = pnlChange * trade.amount;
            return (
              <div 
                key={trade.id} 
                className="grid grid-cols-6 gap-2 text-xs py-1.5 px-1 hover:bg-[#1a2332] rounded transition-colors font-mono"
              >
                <span className="text-gray-400">{formatTime(trade.createdTime)}</span>
                <span className={trade.outcome === "YES" ? "text-emerald-400" : "text-red-400"}>
                  {trade.outcome}
                </span>
                <span className={`text-right ${trade.outcome === "YES" ? "text-emerald-400" : "text-red-400"}`}>
                  {trade.outcome === "YES" ? "+" : "-"}{Math.round(trade.amount)}
                </span>
                <span className="text-right text-gray-300">
                  ${(trade.probAfter).toFixed(2)}
                </span>
                <span className={`text-right ${pnlValue >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pnlValue >= 0 ? "+" : ""}${pnlValue.toFixed(2)}
                </span>
                <span className="text-right text-gray-500">
                  {trade.isLimitOrder ? "M" : "T"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
