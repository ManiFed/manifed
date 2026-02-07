import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { SUPER_BOWL_MARKETS, SuperBowlMarket, SUPER_BOWL_THEME } from "@/data/superBowlMarkets";

interface LiveMarket extends SuperBowlMarket {
  probability: number;
  volume24Hours?: number;
  outcomeType?: string;
  isLive: boolean;
}

interface SuperBowlTrendingProps {
  onSelectMarket: (market: {
    id: string;
    question: string;
    probability: number;
    url: string;
    outcomeType?: string;
  }) => void;
  activeMarketId?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  game: { label: "Game", emoji: "🏟️", color: "text-green-400" },
  props: { label: "Props", emoji: "🎯", color: "text-yellow-400" },
  halftime: { label: "Halftime", emoji: "🎵", color: "text-purple-400" },
  culture: { label: "Culture", emoji: "🎭", color: "text-orange-400" },
};

export function SuperBowlTrending({ onSelectMarket, activeMarketId }: SuperBowlTrendingProps) {
  const [markets, setMarkets] = useState<LiveMarket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Try to fetch live data for each curated market
      const results = await Promise.allSettled(
        SUPER_BOWL_MARKETS.map(async (m) => {
          try {
            const response = await fetch(`https://api.manifold.markets/v0/market/${m.id}`);
            if (response.ok) {
              const data = await response.json();
              return {
                ...m,
                probability: data.probability ?? 0.5,
                volume24Hours: data.volume24Hours ?? 0,
                outcomeType: data.outcomeType,
                isLive: true,
              } as LiveMarket;
            }
          } catch {}
          // Fallback with placeholder data if API fails
          return {
            ...m,
            probability: 0.5,
            volume24Hours: 0,
            outcomeType: "BINARY",
            isLive: false,
          } as LiveMarket;
        })
      );

      const liveMarkets = results
        .filter((r): r is PromiseFulfilledResult<LiveMarket> => r.status === "fulfilled")
        .map((r) => r.value);

      setMarkets(liveMarkets);
    } catch (err) {
      console.error("Failed to fetch Super Bowl markets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 3 * 60 * 1000); // Refresh every 3 min
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-green-800/60 bg-gradient-to-b from-green-950/40 to-green-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏈</span>
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
            Super Bowl Markets
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchMarketData}
          disabled={loading}
          className="h-5 w-5 p-0 text-green-500 hover:text-green-300"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && markets.length === 0 ? (
        <div className="text-green-500/50 text-xs text-center py-4">Loading markets...</div>
      ) : markets.length === 0 ? (
        <div className="text-green-500/50 text-xs text-center py-4">No markets configured</div>
      ) : (
        <ScrollArea className="h-[350px]">
          <div className="space-y-1 pr-2">
            {markets.map((market, index) => {
              const cat = CATEGORY_LABELS[market.category || "game"];
              return (
                <button
                  key={market.id}
                  onClick={() =>
                    onSelectMarket({
                      id: market.id,
                      question: market.question,
                      probability: market.probability,
                      url: market.url,
                      outcomeType: market.outcomeType,
                    })
                  }
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    activeMarketId === market.id
                      ? "bg-green-900/50 border border-green-600"
                      : "hover:bg-green-900/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-green-700 font-mono w-4 shrink-0 mt-0.5">
                      #{index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-green-100 line-clamp-2 leading-tight">
                        {market.question}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-400 font-mono font-bold">
                          {(market.probability * 100).toFixed(0)}%
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-4 border-green-800 ${cat.color}`}
                        >
                          {cat.emoji} {cat.label}
                        </Badge>
                        {!market.isLive && (
                          <span className="text-green-700 text-[9px]">offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
