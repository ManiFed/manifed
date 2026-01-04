import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TrendingMarket {
  id: string;
  question: string;
  probability: number;
  url: string;
  volume24Hours?: number;
  outcomeType?: string;
}

interface TerminalTrendingProps {
  onSelectMarket: (market: TrendingMarket) => void;
  activeMarketId?: string;
}

export function TerminalTrending({ onSelectMarket, activeMarketId }: TerminalTrendingProps) {
  const [markets, setMarkets] = useState<TrendingMarket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.manifold.markets/v0/search-markets?limit=10&filter=open");
      if (response.ok) {
        const data = await response.json();
        const mapped = data.map((m: any) => ({
          id: m.id,
          question: m.question,
          probability: m.probability ?? 0.5,
          url: m.url,
          volume24Hours: m.volume24Hours ?? 0,
          outcomeType: m.outcomeType,
        }));
        setMarkets(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch trending:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending();
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Trending</h3>
          <p className="text-[10px] text-gray-500">Top 10 active markets</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTrending}
          disabled={loading}
          className="h-6 px-2 text-[10px] text-gray-500 hover:text-white"
        >
          {loading ? "..." : "↻"}
        </Button>
      </div>

      {loading && markets.length === 0 ? (
        <div className="text-gray-500 text-xs text-center py-4">Loading...</div>
      ) : markets.length === 0 ? (
        <div className="text-gray-500 text-xs text-center py-4">No markets found</div>
      ) : (
        <div className="h-[200px] overflow-y-auto space-y-1">
          {markets.map((market, index) => (
            <button
              key={market.id}
              onClick={() => onSelectMarket(market)}
              className={`w-full text-left p-2 rounded text-xs transition-colors ${
                activeMarketId === market.id 
                  ? "bg-emerald-900/30 border border-emerald-700/50" 
                  : "hover:bg-[#1a2332]"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-600 font-mono w-4 shrink-0 text-[10px]">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 line-clamp-2 leading-tight text-[11px]">{market.question}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-400 font-mono text-[10px]">{(market.probability * 100).toFixed(0)}%</span>
                    {market.volume24Hours !== undefined && market.volume24Hours > 0 && (
                      <span className="text-gray-600 text-[10px]">M${Math.round(market.volume24Hours).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
