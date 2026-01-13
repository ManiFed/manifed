import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

interface PolymarketChartProps {
  marketId: string;
  currentProbability: number;
}

const TIME_PRESETS = [
  { label: "1H", minutes: 60 },
  { label: "6H", minutes: 360 },
  { label: "1D", minutes: 1440 },
  { label: "1W", minutes: 10080 },
  { label: "1M", minutes: 43200 },
  { label: "ALL", minutes: 0 },
];

export function PolymarketChart({ marketId, currentProbability }: PolymarketChartProps) {
  const [chartData, setChartData] = useState<{ time: string; prob: number; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState(1440); // Default to 1D
  const [priceChange, setPriceChange] = useState<{ value: number; percent: number } | null>(null);

  useEffect(() => {
    if (marketId) {
      fetchBetHistory();
    }
  }, [marketId, selectedMinutes]);

  const fetchBetHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=1000`);
      if (response.ok) {
        const bets = await response.json();

        if (bets.length === 0) {
          setChartData([]);
          setPriceChange(null);
          return;
        }

        const cutoffTime = selectedMinutes > 0 ? Date.now() - selectedMinutes * 60 * 1000 : 0;
        const points: { time: string; prob: number; timestamp: number }[] = [];
        const sortedBets = [...bets].sort((a, b) => a.createdTime - b.createdTime);

        // For "ALL" time, we want to show the market creation too
        const filteredBets = selectedMinutes === 0 
          ? sortedBets 
          : sortedBets.filter(bet => bet.createdTime >= cutoffTime);

        for (const bet of filteredBets) {
          const timeFormat = selectedMinutes <= 360 
            ? { hour: "2-digit" as const, minute: "2-digit" as const }
            : selectedMinutes <= 1440
            ? { hour: "2-digit" as const, minute: "2-digit" as const }
            : { month: "short" as const, day: "numeric" as const };

          points.push({
            time: new Date(bet.createdTime).toLocaleString("en-US", timeFormat),
            prob: Math.round((bet.probAfter || bet.probability) * 100),
            timestamp: bet.createdTime,
          });
        }

        // Add current probability
        const timeFormat = selectedMinutes <= 360 
          ? { hour: "2-digit" as const, minute: "2-digit" as const }
          : selectedMinutes <= 1440
          ? { hour: "2-digit" as const, minute: "2-digit" as const }
          : { month: "short" as const, day: "numeric" as const };
        
        points.push({
          time: new Date().toLocaleString("en-US", timeFormat),
          prob: Math.round(currentProbability * 100),
          timestamp: Date.now(),
        });

        // Calculate price change
        if (points.length >= 2) {
          const firstProb = points[0].prob;
          const lastProb = points[points.length - 1].prob;
          const change = lastProb - firstProb;
          const percentChange = firstProb > 0 ? ((change / firstProb) * 100) : 0;
          setPriceChange({ value: change, percent: percentChange });
        } else {
          setPriceChange(null);
        }

        // Sample to avoid too many points
        const maxPoints = 100;
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
    } finally {
      setLoading(false);
    }
  };

  const isPositive = priceChange && priceChange.value >= 0;
  const chartColor = isPositive ? "#10b981" : "#ef4444";

  return (
    <Card className="bg-[#1a1b23] border-gray-800 p-4">
      {/* Price Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {Math.round(currentProbability * 100)}%
            </span>
            <span className="text-lg text-gray-400">chance</span>
          </div>
          {priceChange && (
            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPositive ? '+' : ''}{priceChange.value}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] mb-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">Loading...</div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={{ stroke: "#374151" }}
                tickLine={false}
                interval="preserveStartEnd"
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
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={{ stroke: "#374151" }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value: number) => [`${value}%`, "Probability"]}
              />
              <Area 
                type="monotone" 
                dataKey="prob" 
                stroke={chartColor} 
                strokeWidth={2} 
                fill="url(#chartGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Time Presets - Polymarket style */}
      <div className="flex items-center gap-1">
        {TIME_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedMinutes(preset.minutes)}
            className={`h-7 px-3 text-xs font-medium rounded-md ${
              selectedMinutes === preset.minutes
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-white hover:bg-gray-800"
            }`}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
