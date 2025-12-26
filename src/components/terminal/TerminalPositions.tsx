import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Shield, X } from "lucide-react";
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
  lossThreshold: number; // in mana
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

  // Load stop losses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STOP_LOSS_KEY);
    if (saved) {
      setStopLosses(JSON.parse(saved));
    }
  }, []);

  // Save stop losses
  useEffect(() => {
    localStorage.setItem(STOP_LOSS_KEY, JSON.stringify(stopLosses));
  }, [stopLosses]);

  // Calculate P&L for each position
  const enrichedPositions = positions.map(pos => {
    // Estimate entry price from shares (simplified - in reality would need bet history)
    const estimatedEntryPrice = 0.5; // Default assumption
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

  // Monitor stop losses
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
          // Trigger stop loss
          toast.warning(`Stop-loss triggered for ${sl.positionOutcome}: Loss exceeds M$${sl.lossThreshold}`);
          await executeSell(pos);
          
          // Deactivate the stop loss
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

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Positions & P&L</span>
          {isMonitoring && stopLosses.some(s => s.isActive) && (
            <Badge variant="outline" className="text-xs border-yellow-700 text-yellow-400">
              <Shield className="w-3 h-3 mr-1" />
              Monitoring
            </Badge>
          )}
        </div>
        <div className={`text-sm font-mono ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {totalPnL >= 0 ? '+' : ''}M${totalPnL.toFixed(2)}
        </div>
      </div>

      <ScrollArea className="h-[150px]">
        {enrichedPositions.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No positions in this market
          </div>
        ) : (
          <div className="space-y-2">
            {enrichedPositions.map((pos, i) => {
              const posKey = `${pos.outcome}-${pos.answerId || 'binary'}`;
              const activeStopLoss = stopLosses.find(sl => 
                sl.positionOutcome === pos.outcome && 
                sl.answerId === pos.answerId && 
                sl.isActive
              );

              return (
                <div
                  key={i}
                  className="p-2 bg-gray-800/50 rounded text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          pos.outcome === 'YES' 
                            ? 'border-emerald-700 text-emerald-400' 
                            : 'border-red-700 text-red-400'
                        }`}
                      >
                        {pos.outcome}
                      </Badge>
                      <span className="text-gray-400">{pos.shares.toFixed(2)} shares</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(pos.pnl ?? 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <span className={`font-mono ${(pos.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {(pos.pnl ?? 0) >= 0 ? '+' : ''}M${(pos.pnl ?? 0).toFixed(2)}
                        <span className="text-gray-500 ml-1">
                          ({(pos.pnlPercent ?? 0) >= 0 ? '+' : ''}{(pos.pnlPercent ?? 0).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Stop Loss Controls */}
                  <div className="flex items-center gap-2">
                    {activeStopLoss ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="outline" className="text-xs border-yellow-700 text-yellow-400">
                          Stop @ -M${activeStopLoss.lossThreshold}
                        </Badge>
                        <button
                          onClick={() => removeStopLoss(activeStopLoss.id)}
                          className="text-gray-500 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : selectedPosition === posKey ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          value={newStopLossAmount}
                          onChange={(e) => setNewStopLossAmount(e.target.value)}
                          placeholder="Loss M$"
                          className="h-6 text-xs bg-gray-700 border-gray-600 w-20"
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
                          className="text-gray-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPosition(posKey)}
                        className="h-6 text-xs text-gray-500 hover:text-yellow-400"
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Add Stop-Loss
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
