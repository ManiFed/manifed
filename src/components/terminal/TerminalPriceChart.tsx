import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface TerminalPriceChartProps {
  marketId: string;
  currentProbability: number;
}

const TIME_PRESETS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "4h", minutes: 240 },
];

export default function TerminalPriceChart({ marketId, currentProbability }: TerminalPriceChartProps) {
  const [chartData, setChartData] = useState<{ time: string; prob: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (marketId) {
      fetchBetHistory();
    }
  }, [marketId, selectedMinutes]);

  const fetchBetHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=500`);
      if (response.ok) {
        const bets = await response.json();

        if (bets.length === 0) {
          setChartData([]);
          return;
        }

        const cutoffTime = selectedMinutes > 0 ? Date.now() - selectedMinutes * 60 * 1000 : 0;
        const points: { time: string; prob: number; timestamp: number }[] = [];
        const sortedBets = [...bets].sort((a, b) => a.createdTime - b.createdTime);

        for (const bet of sortedBets) {
          if (bet.createdTime >= cutoffTime) {
            points.push({
              time: new Date(bet.createdTime).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              prob: Math.round((bet.probAfter || bet.probability) * 100),
              timestamp: bet.createdTime,
            });
          }
        }

        points.push({
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          prob: Math.round(currentProbability * 100),
          timestamp: Date.now(),
        });

        const maxPoints = 50;
        if (points.length > maxPoints) {
          const step = Math.ceil(points.length / maxPoints);
          const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);
          setChartData(sampled);
        } else {
          setChartData(points);
        }
      }
    } catch (err) {
      console.error("Failed to fetch bet history:", err);
      setError("Failed to load chart");
    } finally {
      setLoading(false);
    }
  };

  const getTimeLabel = () => {
    const preset = TIME_PRESETS.find((p) => p.minutes === selectedMinutes);
    return preset?.label || `${selectedMinutes}m`;
  };

  return (
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">PnL Chart</h3>
          <p className="text-[10px] text-gray-500">Price history ({getTimeLabel()})</p>
        </div>
        <div className="flex items-center gap-0.5">
          {TIME_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMinutes(preset.minutes)}
              className={`h-5 px-1.5 text-[10px] ${
                selectedMinutes === preset.minutes
                  ? "bg-emerald-600/30 text-emerald-400"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[120px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">Loading...</div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-xs">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "#6b7280" }}
                axisLine={{ stroke: "#1e2736" }}
                tickLine={false}
              />
              <YAxis
                domain={(() => {
                  if (chartData.length === 0) return [0, 100];
                  const probs = chartData.map((d) => d.prob);
                  const minProb = Math.min(...probs);
                  const maxProb = Math.max(...probs);
                  const padding = Math.max(5, (maxProb - minProb) * 0.2);
                  return [
                    Math.max(0, Math.floor((minProb - padding) / 5) * 5),
                    Math.min(100, Math.ceil((maxProb + padding) / 5) * 5),
                  ];
                })()}
                tick={{ fontSize: 9, fill: "#6b7280" }}
                axisLine={{ stroke: "#1e2736" }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0d1117",
                  border: "1px solid #1e2736",
                  borderRadius: "6px",
                  fontSize: "11px",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value: number) => [`${value}%`, "Probability"]}
              />
              <Area type="monotone" dataKey="prob" stroke="#10b981" strokeWidth={1.5} fill="url(#probGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Current Value */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e2736] text-xs">
        <span className="text-gray-500">Current</span>
        <span className="text-emerald-400 font-mono font-bold">{(currentProbability * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
