import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Position {
  outcome: string;
  shares: number;
  answerId?: string;
  avgPrice?: number;
  currentValue?: number;
  pnl?: number;
  pnlPercent?: number;
}

interface StopLoss {
  id: string;
  positionOutcome: string;
  answerId?: string;
  lossThreshold: number;
  isActive: boolean;
}

interface TerminalPositionsProps {
  positions: Position[];
  marketId: string;
  currentProbability: number;
  apiKey: string;
  onRefresh: () => void;
}

const STOP_LOSS_KEY = "manifold_terminal_stop_losses";

export default function TerminalPositions({ 
  positions, 
  marketId, 
  currentProbability, 
  apiKey,
  onRefresh 
}: TerminalPositionsProps) {
  const [stopLosses, setStopLosses] = useState<StopLoss[]>([]);
  const [newStopLossAmount, setNewStopLossAmount] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STOP_LOSS_KEY);
    if (saved) {
      setStopLosses(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STOP_LOSS_KEY, JSON.stringify(stopLosses));
  }, [stopLosses]);

  const enrichedPositions = positions.map(pos => {
    const estimatedEntryPrice = 0.5;
    const currentPrice = pos.outcome === 'YES' ? currentProbability : (1 - currentProbability);
    const currentValue = pos.shares * currentPrice;
    const costBasis = pos.shares * estimatedEntryPrice;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    return {
      ...pos,
      avgPrice: estimatedEntryPrice,
      currentValue,
      pnl,
      pnlPercent,
    };
  });

  useEffect(() => {
    if (stopLosses.length === 0 || !apiKey || !marketId) return;

    const checkStopLosses = async () => {
      for (const sl of stopLosses) {
        if (!sl.isActive) continue;
        
        const pos = enrichedPositions.find(p => 
          p.outcome === sl.positionOutcome && 
          (sl.answerId ? p.answerId === sl.answerId : true)
        );
        
        if (pos && pos.pnl && pos.pnl < -sl.lossThreshold) {
          toast.warning(`Stop-loss triggered for ${sl.positionOutcome}: Loss exceeds M$${sl.lossThreshold}`);
          await executeSell(pos);
          
          setStopLosses(prev => prev.map(s => 
            s.id === sl.id ? { ...s, isActive: false } : s
          ));
        }
      }
    };

    const interval = setInterval(checkStopLosses, 5000);
    setIsMonitoring(true);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [stopLosses, enrichedPositions, apiKey, marketId]);

  const executeSell = async (position: Position) => {
    try {
      const response = await fetch(`https://api.manifold.markets/v0/market/${marketId}/sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${apiKey}`,
        },
        body: JSON.stringify({
          outcome: position.outcome,
          shares: position.shares,
          ...(position.answerId && { answerId: position.answerId }),
        }),
      });

      if (response.ok) {
        toast.success(`Sold ${position.shares.toFixed(2)} ${position.outcome} shares`);
        onRefresh();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to sell");
      }
    } catch (err) {
      toast.error("Network error during sell");
    }
  };

  const addStopLoss = (positionOutcome: string, answerId?: string) => {
    const amount = parseFloat(newStopLossAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid loss threshold");
      return;
    }

    const newSL: StopLoss = {
      id: crypto.randomUUID(),
      positionOutcome,
      answerId,
      lossThreshold: amount,
      isActive: true,
    };

    setStopLosses([...stopLosses, newSL]);
    setNewStopLossAmount("");
    setSelectedPosition(null);
    toast.success(`Stop-loss set at M$${amount} loss`);
  };

  const removeStopLoss = (id: string) => {
    setStopLosses(stopLosses.filter(sl => sl.id !== id));
  };

  const totalPnL = enrichedPositions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalDelta = enrichedPositions.reduce((sum, p) => sum + (p.outcome === 'YES' ? p.shares : -p.shares), 0);

  return (
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Risk Controls</h3>
          <p className="text-xs text-gray-500">Real-time position limits and exposure monitoring</p>
        </div>
        {isMonitoring && stopLosses.some(s => s.isActive) && (
          <span className="text-xs text-yellow-400 px-2 py-0.5 border border-yellow-700 rounded">
            Monitoring
          </span>
        )}
      </div>

      {/* Group Delta Table */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Group Delta</div>
        <div className="border border-[#1e2736] rounded">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 uppercase tracking-wider p-2 border-b border-[#1e2736]">
            <span>Position</span>
            <span className="text-right">Delta</span>
            <span className="text-right">Max Loss</span>
          </div>
          
          {enrichedPositions.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No positions</div>
          ) : (
            <div className="divide-y divide-[#1e2736]">
              {enrichedPositions.map((pos, i) => {
                const posKey = `${pos.outcome}-${pos.answerId || 'binary'}`;
                const activeStopLoss = stopLosses.find(sl => 
                  sl.positionOutcome === pos.outcome && 
                  sl.answerId === pos.answerId && 
                  sl.isActive
                );
                const delta = pos.outcome === 'YES' ? pos.shares : -pos.shares;
                const maxLoss = -pos.shares * (pos.outcome === 'YES' ? currentProbability : (1 - currentProbability));

                return (
                  <div key={i} className="p-2">
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono items-center">
                      <span className={pos.outcome === 'YES' ? 'text-emerald-400' : 'text-red-400'}>
                        {pos.outcome}-{pos.shares.toFixed(0)}
                      </span>
                      <span className={`text-right ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(0)}
                      </span>
                      <span className="text-right text-red-400">
                        -${Math.abs(maxLoss).toFixed(0)}
                      </span>
                    </div>
                    
                    {/* Stop Loss Controls */}
                    <div className="mt-2 flex items-center gap-2">
                      {activeStopLoss ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-yellow-400 px-2 py-0.5 border border-yellow-700 rounded">
                            Stop @ -M${activeStopLoss.lossThreshold}
                          </span>
                          <button
                            onClick={() => removeStopLoss(activeStopLoss.id)}
                            className="text-gray-500 hover:text-red-400 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : selectedPosition === posKey ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={newStopLossAmount}
                            onChange={(e) => setNewStopLossAmount(e.target.value)}
                            placeholder="Loss M$"
                            className="h-6 text-xs bg-[#1a2332] border-[#1e2736] w-20"
                          />
                          <Button
                            size="sm"
                            onClick={() => addStopLoss(pos.outcome, pos.answerId)}
                            className="h-6 text-xs bg-yellow-600 hover:bg-yellow-700"
                          >
                            Set
                          </Button>
                          <button
                            onClick={() => setSelectedPosition(null)}
                            className="text-gray-500 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedPosition(posKey)}
                          className="text-xs text-gray-500 hover:text-yellow-400"
                        >
                          + Stop-Loss
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Summary Row */}
              {enrichedPositions.length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-xs font-mono p-2 bg-[#0a0e14]">
                  <span className="text-gray-400">Sum</span>
                  <span className={`text-right ${totalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalDelta >= 0 ? '+' : ''}{totalDelta.toFixed(0)}
                  </span>
                  <span className="text-right text-red-400">
                    -${Math.abs(enrichedPositions.reduce((sum, p) => 
                      sum + p.shares * (p.outcome === 'YES' ? currentProbability : (1 - currentProbability)), 0
                    )).toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Total P&L */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1e2736] text-sm">
        <span className="text-gray-500">Total P&L</span>
        <span className={`font-mono font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalPnL >= 0 ? '+' : ''}M${totalPnL.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
