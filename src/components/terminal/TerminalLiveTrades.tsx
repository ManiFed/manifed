import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  answers?: { id: string; text: string }[];
  selectedAnswerId?: string;
  soundEnabled?: boolean;
}

export default function TerminalLiveTrades({ marketId, answers, selectedAnswerId, soundEnabled = true }: TerminalLiveTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const lastTradeIdRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { playTradeSound } = useTradeSound();

  useEffect(() => {
    if (marketId) {
      // Initial fetch
      fetchTrades(true);

      // Poll every 2 seconds for new trades
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

        // Map to our trade format
        const mappedTrades: Trade[] = bets
          .filter((bet: any) => {
            // Filter by selected answer if MC market
            if (selectedAnswerId && bet.answerId !== selectedAnswerId) return false;
            return true;
          })
          .map((bet: any) => {
            // Find answer text if this is MC market
            let answerText = "";
            if (bet.answerId && answers) {
              const answer = answers.find((a) => a.id === bet.answerId);
              answerText = answer?.text || "";
            }

            // Determine if this is a limit order
            const isLimitOrder = bet.limitProb !== undefined && bet.limitProb !== null;

            return {
              id: bet.id,
              createdTime: bet.createdTime,
              userName: bet.userName || bet.userUsername || "Unknown",
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

        // Play sound if new trade detected
        if (!isInitial && soundEnabled && mappedTrades.length > 0) {
          const latestTrade = mappedTrades[0];
          if (lastTradeIdRef.current && latestTrade.id !== lastTradeIdRef.current) {
            playTradeSound('newTrade');
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Live Trades</span>
        <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
          {trades.length} recent
        </Badge>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">Loading trades...</div>
      ) : trades.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">No recent trades</div>
      ) : (
        <ScrollArea className="h-48">
          <div className="space-y-1 pr-2">
            {trades.map((trade) => (
              <div key={trade.id} className="text-xs p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold ${trade.outcome === "YES" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {trade.outcome}
                    </span>
                    <span className="text-gray-400">M${Math.round(trade.amount)}</span>
                    {trade.isLimitOrder ? (
                      <span className="text-yellow-400 text-[10px]">[LMT]</span>
                    ) : (
                      <span className="text-blue-400 text-[10px]">[MKT]</span>
                    )}
                    {trade.isApi && <span className="text-purple-400 text-[10px]">[API]</span>}
                  </div>
                  <span className="text-gray-600">{formatTime(trade.createdTime)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span className="truncate max-w-[120px]">@{trade.userName}</span>
                  <span
                    className={`font-mono ${trade.probAfter > trade.probBefore ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {(trade.probBefore * 100).toFixed(0)}→{(trade.probAfter * 100).toFixed(0)}%
                  </span>
                </div>
                {/* Limit order details */}
                {trade.isLimitOrder && trade.limitProb !== undefined && (
                  <div className="text-[10px] text-yellow-500/80 mt-1">
                    Limit @{(trade.limitProb * 100).toFixed(0)}%
                    {trade.orderAmount && ` • Order: M$${Math.round(trade.orderAmount)}`}
                    {trade.isFilled !== undefined && (
                      <span className={trade.isFilled ? " • Filled" : " • Partial"}></span>
                    )}
                  </div>
                )}
                {trade.answerText && <div className="text-gray-500 truncate mt-1 text-[10px]">{trade.answerText}</div>}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
