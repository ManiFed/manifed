import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface BetPoint {
  time: number;
  probability: number;
  probAfter: number;
}

interface TerminalPriceChartProps {
  marketId: string;
  currentProbability: number;
}

export default function TerminalPriceChart({ marketId, currentProbability }: TerminalPriceChartProps) {
  const [chartData, setChartData] = useState<{ time: string; prob: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 1 hour, 0.5 = 30min, 2 = 2 hours
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (marketId) {
      fetchBetHistory();
    }
  }, [marketId]);

  const fetchBetHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch recent bets to build price history
      const response = await fetch(`https://api.manifold.markets/v0/bets?contractId=${marketId}&limit=500`);
      if (response.ok) {
        const bets = await response.json();
        
        if (bets.length === 0) {
          setChartData([]);
          return;
        }

        // Convert bets to time-series data
        const oneHourAgo = Date.now() - (60 * 60 * 1000 * zoomLevel);
        const points: { time: string; prob: number; timestamp: number }[] = [];
        
        // Process bets in reverse chronological order
        const sortedBets = [...bets].sort((a, b) => a.createdTime - b.createdTime);
        
        for (const bet of sortedBets) {
          if (bet.createdTime >= oneHourAgo) {
            points.push({
              time: new Date(bet.createdTime).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              prob: Math.round((bet.probAfter || bet.probability) * 100),
              timestamp: bet.createdTime,
            });
          }
        }

        // Add current probability as the latest point
        points.push({
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          prob: Math.round(currentProbability * 100),
          timestamp: Date.now(),
        });

        // Sample to avoid too many points
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
      console.error('Failed to fetch bet history:', err);
      setError('Failed to load chart');
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.max(0.25, prev / 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.min(4, prev * 2));
  };

  const handleReset = () => {
    setZoomLevel(1);
    fetchBetHistory();
  };

  useEffect(() => {
    if (marketId) {
      fetchBetHistory();
    }
  }, [zoomLevel]);

  const zoomLabel = zoomLevel < 1 
    ? `${Math.round(60 * zoomLevel)}min` 
    : `${zoomLevel}hr`;

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">Price Chart ({zoomLabel})</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="h-6 w-6 p-0 text-gray-500 hover:text-white"
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="h-6 w-6 p-0 text-gray-500 hover:text-white"
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 w-6 p-0 text-gray-500 hover:text-white"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="h-[120px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">
            Loading...
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-xs">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">
            No data available
          </div>
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
                tick={{ fontSize: 9, fill: '#6b7280' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: '#6b7280' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  fontSize: '11px',
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [`${value}%`, 'Probability']}
              />
              <ReferenceLine y={50} stroke="#374151" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="prob"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#probGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
