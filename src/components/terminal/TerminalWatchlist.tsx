import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Plus, X, Star } from "lucide-react";

interface WatchlistMarket {
  id: string;
  question: string;
  probability: number;
  url: string;
}

interface TerminalWatchlistProps {
  onSelectMarket: (market: WatchlistMarket) => void;
  activeMarketId?: string;
  currentMarket?: WatchlistMarket | null;
}

const WATCHLIST_KEY = "manifold_terminal_watchlist";

export default function TerminalWatchlist({ onSelectMarket, activeMarketId, currentMarket }: TerminalWatchlistProps) {
  const [watchlist, setWatchlist] = useState<WatchlistMarket[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(WATCHLIST_KEY);
    if (saved) {
      setWatchlist(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addToWatchlist = () => {
    if (currentMarket && !watchlist.find(m => m.id === currentMarket.id)) {
      setWatchlist([...watchlist, currentMarket]);
    }
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist(watchlist.filter(m => m.id !== id));
  };

  const isCurrentInWatchlist = currentMarket && watchlist.find(m => m.id === currentMarket.id);

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-gray-300">Watchlist</span>
        </div>
        {currentMarket && !isCurrentInWatchlist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addToWatchlist}
            className="text-xs text-gray-400 hover:text-emerald-400 h-7 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {watchlist.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No markets saved yet
          </div>
        ) : (
          <div className="space-y-1">
            {watchlist.map((market) => (
              <div
                key={market.id}
                className={`group relative p-2 rounded text-xs cursor-pointer transition-colors ${
                  market.id === activeMarketId
                    ? "bg-emerald-900/40 border border-emerald-700"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => onSelectMarket(market)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`line-clamp-2 ${market.id === activeMarketId ? "text-emerald-400" : "text-gray-300"}`}>
                    {market.question.slice(0, 60)}{market.question.length > 60 ? "..." : ""}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWatchlist(market.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className={`mt-1 font-mono ${market.id === activeMarketId ? "text-emerald-400" : "text-gray-500"}`}>
                  {(market.probability * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
