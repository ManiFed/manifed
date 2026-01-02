import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw } from "lucide-react";

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
      // Fetch markets sorted by 24h volume (most active)
      const response = await fetch(
        "https://api.manifold.markets/v0/search-markets?sort=last-bet-time&limit=10&filter=open",
      );
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
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Top 10 Markets</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTrending}
          disabled={loading}
          className="h-5 w-5 p-0 text-gray-500 hover:text-white"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && markets.length === 0 ? (
        <div className="text-gray-500 text-xs text-center py-4">Loading...</div>
      ) : markets.length === 0 ? (
        <div className="text-gray-500 text-xs text-center py-4">No markets found</div>
      ) : (
        <ScrollArea className="h-[180px]">
          <div className="space-y-1 pr-2">
            {markets.map((market, index) => (
              <button
                key={market.id}
                onClick={() => onSelectMarket(market)}
                className={`w-full text-left p-2 rounded text-xs transition-colors ${
                  activeMarketId === market.id ? "bg-emerald-900/40 border border-emerald-700" : "hover:bg-gray-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 font-mono w-4 shrink-0">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-300 line-clamp-2 leading-tight">{market.question}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-emerald-400 font-mono">{(market.probability * 100).toFixed(0)}%</span>
                      {market.volume24Hours !== undefined && market.volume24Hours > 0 && (
                        <span className="text-gray-600">M${Math.round(market.volume24Hours).toLocaleString()}/24h</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
