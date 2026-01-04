import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-white">Watchlist</span>
        {currentMarket && !isCurrentInWatchlist && (
          <Button
            variant="ghost"
            size="sm"
            onClick={addToWatchlist}
            className="text-[10px] text-gray-400 hover:text-emerald-400 h-5 px-1.5"
          >
            + Add
          </Button>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="text-[10px] text-gray-500 text-center py-3">
          No markets saved
        </div>
      ) : (
        <div className="h-[120px] overflow-y-auto space-y-1">
          {watchlist.map((market) => (
            <div
              key={market.id}
              className={`group relative p-1.5 rounded text-[10px] cursor-pointer transition-colors ${
                market.id === activeMarketId
                  ? "bg-emerald-900/30 border border-emerald-700/50"
                  : "hover:bg-[#1a2332]"
              }`}
              onClick={() => onSelectMarket(market)}
            >
              <div className="flex items-start justify-between gap-1">
                <span className={`line-clamp-2 ${market.id === activeMarketId ? "text-emerald-400" : "text-gray-300"}`}>
                  {market.question.slice(0, 50)}{market.question.length > 50 ? "..." : ""}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(market.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className={`mt-0.5 font-mono ${market.id === activeMarketId ? "text-emerald-400" : "text-gray-500"}`}>
                {(market.probability * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
