import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TerminalWatchlist from "@/components/terminal/TerminalWatchlist";
import TerminalPriceChart from "@/components/terminal/TerminalPriceChart";
import TerminalOrderBook from "@/components/terminal/TerminalOrderBook";
import TerminalPositions from "@/components/terminal/TerminalPositions";
import TerminalLiveTrades from "@/components/terminal/TerminalLiveTrades";
import { HotkeyDisplayPanel } from "@/components/terminal/HotkeyDisplayPanel";
import { TerminalTrending } from "@/components/terminal/TerminalTrending";
import { TerminalEditMode, useTerminalLayout } from "@/components/terminal/TerminalEditMode";
import { ResizableTerminalLayout } from "@/components/terminal/ResizableTerminalLayout";
import { useIsMobile } from "@/hooks/use-mobile";
interface Market {
  id: string;
  question: string;
  probability: number;
  url: string;
  outcomeType?: string;
  isResolved?: boolean;
  answers?: {
    id: string;
    text: string;
    probability: number;
  }[];
}
interface ExecutionLog {
  id: string;
  timestamp: Date;
  action: string;
  success: boolean;
  details: string;
}
interface Hotkey {
  id: string;
  key: string;
  side: "YES" | "NO" | "STRADDLE";
  amount: number;
  orderType: "market" | "limit-fixed" | "limit-relative" | "straddle";
  limitPrice?: number;
  straddleDelta?: number; // For straddle orders: how far from current price to place limits
  relativeOffset?: number;
  expirationMinutes?: number;
  mcOptionIndex?: number; // For MC markets: specific option index (1-based), 0 or undefined = use selected
}
interface Position {
  outcome: string;
  shares: number;
  answerId?: string;
}
interface MultipleChoiceOption {
  index: number;
  id: string;
  text: string;
  probability: number;
}
const STORAGE_KEYS = {
  API_KEY: "manifold_terminal_api_key",
  HOTKEYS: "manifold_terminal_hotkeys",
  YOUTUBE_URL: "manifold_terminal_youtube"
};

// Landing page component
function TerminalLanding({
  onEnter
}: {
  onEnter: () => void;
}) {
  return <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-emerald-500 font-mono text-xl">{">_"}</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">ManiFed Terminal</span>
          </div>
          <Link to="/client">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-2">
              ← Back to Client
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-white font-mono">Fast Keyboard-Driven Trading</h1>
            <p className="text-gray-400 text-lg">
              Execute trades on Manifold Markets with lightning speed using keyboard shortcuts and command syntax.
            </p>
          </div>

          <Card className="bg-gray-900/50 border-gray-800 p-6 space-y-6">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 font-mono mt-1">[K]</span>
              <div>
                <h3 className="font-semibold text-white mb-1">API Key Required</h3>
                <p className="text-sm text-gray-400">
                  You'll need your Manifold API key to trade. Get it from your Manifold account settings.
                </p>
                <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                  ⚠ Your key is never stored in our servers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-mono mt-1">[⌨]</span>
              <div>
                <h3 className="font-semibold text-white mb-2">Basic Orders</h3>
                <div className="space-y-2 text-sm font-mono mb-4">
                  <div className="flex gap-4">
                    <code className="text-emerald-400 w-28">100B</code>
                    <span className="text-gray-400">Buy 100 mana of YES at market price</span>
                  </div>
                  <div className="flex gap-4">
                    <code className="text-red-400 w-28">100S</code>
                    <span className="text-gray-400">Buy 100 mana of NO at market price</span>
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-2">Advanced Orders</h3>
                <p className="text-xs text-gray-500 mb-2">
                  All advanced orders use <code className="text-yellow-400">/</code> syntax. Add a number before the
                  first <code className="text-yellow-400">/</code> for expiry in minutes. Without it, orders are{" "}
                  <strong className="text-white">indefinite</strong>.
                </p>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex gap-4">
                    <code className="text-yellow-400 w-28">/100B@45/</code>
                    <span className="text-gray-400">Indefinite limit for 100 YES @45%</span>
                  </div>
                  <div className="flex gap-4">
                    <code className="text-yellow-400 w-28">30/100B@45/</code>
                    <span className="text-gray-400">30-min expiry limit for 100 YES @45%</span>
                  </div>
                  <div className="flex gap-4">
                    <code className="text-orange-400 w-28">/LS@55/</code>
                    <span className="text-gray-400">Take Profit at 55% (uses full position)</span>
                  </div>
                  <div className="flex gap-4">
                    <code className="text-orange-400 w-28">10/LS@55/</code>
                    <span className="text-gray-400">Take Profit at 55% with 10-min expiry</span>
                  </div>
                  <div className="flex gap-4">
                    <code className="text-purple-400 w-28">ST2.5/200/</code>
                    <span className="text-gray-400">Straddle with M$200 at ±2.5% from current</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-yellow-500 font-mono mt-1">[⚡]</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Auto-Execute Mode</h3>
                <p className="text-sm text-gray-400">
                  When enabled, market orders execute instantly. Limit orders require{" "}
                  <code className="text-yellow-400">/</code> suffix or Enter key to confirm.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-purple-500 font-mono mt-1">[⚙]</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Custom Hotkeys</h3>
                <p className="text-sm text-gray-400">
                  Bind keyboard keys to preset orders. Press a single key to execute trades instantly when not in an
                  input field.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-orange-500 font-mono mt-1">[?]</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Keyboard Shortcuts</h3>
                <div className="text-sm font-mono mt-2">
                  <div className="flex gap-4">
                    <code className="text-gray-300 w-28">Cmd/Ctrl+X</code>
                    <span className="text-gray-400">Sell all positions and close all limits in active market</span>
                    <code className="text-gray-300 w-28">Cmd/Ctrl+L</code>
                    <span className="text-gray-400">Cancel all limit orders in active market</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <Button onClick={onEnter} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8">
              Enter Terminal →
            </Button>
          </div>
        </div>
      </main>
    </div>;
}

// Market description dropdown component
function MarketDescriptionDropdown({
  marketId,
  marketUrl
}: {
  marketId: string;
  marketUrl: string;
}) {
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchDescription = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://api.manifold.markets/v0/market/${marketId}`);
        if (response.ok) {
          const data = await response.json();
          setDescription(data.textDescription || data.description || "No description available.");
        }
      } catch {
        setDescription("Failed to load description.");
      } finally {
        setLoading(false);
      }
    };
    fetchDescription();
  }, [marketId]);
  return <Card className="bg-gray-900/80 border-gray-800 p-3 text-xs">
      <div className="text-gray-300 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
        {loading ? <span className="text-gray-500">Loading description...</span> : description}
        <p className="text-gray-500 mt-2">
          <a href={marketUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
            View on Manifold →
          </a>
        </p>
      </div>
    </Card>;
}

// Media panel component for YouTube/RSS
function MediaPanel({
  youtubeUrl,
  youtubeInput,
  setYoutubeInput,
  saveYoutube,
  embedUrl
}: {
  youtubeUrl: string;
  youtubeInput: string;
  setYoutubeInput: (v: string) => void;
  saveYoutube: () => void;
  embedUrl: string | null;
}) {
  const [showPanel, setShowPanel] = useState(true);
  const [mediaType, setMediaType] = useState<"youtube" | "rss">("youtube");
  const [rssUrl, setRssUrl] = useState("");
  if (!showPanel) {
    return <Card className="bg-gray-900/50 border-gray-800 p-2">
        <Button variant="ghost" size="sm" onClick={() => setShowPanel(true)} className="w-full text-gray-500 hover:text-white text-xs">
          Show Media Panel
        </Button>
      </Card>;
  }
  return <Card className="bg-gray-900/50 border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={mediaType === "youtube" ? "text-red-500" : "text-orange-500"}>
            {mediaType === "youtube" ? "▶" : "📡"}
          </span>
          <span className="text-sm text-gray-400">{mediaType === "youtube" ? "Video" : "RSS Feed"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMediaType(mediaType === "youtube" ? "rss" : "youtube")} className="text-[10px] h-6 px-2 text-gray-500 hover:text-white">
            {mediaType === "youtube" ? "Use RSS" : "Use YouTube"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowPanel(false)} className="text-[10px] h-6 px-2 text-gray-500 hover:text-white">
            Hide
          </Button>
        </div>
      </div>

      {mediaType === "youtube" ? <>
          <div className="flex gap-2 mb-3">
            <Input value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} placeholder="YouTube URL..." className="bg-gray-800 border-gray-700 text-white" />
            <Button onClick={saveYoutube} size="sm" className="bg-red-600 hover:bg-red-700">
              Embed
            </Button>
          </div>
          {embedUrl ? <div className="aspect-video rounded-lg overflow-hidden">
              <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div> : <div className="aspect-video rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
              Paste a YouTube URL above
            </div>}
        </> : <>
          <div className="flex gap-2 mb-3">
            <Input value={rssUrl} onChange={e => setRssUrl(e.target.value)} placeholder="RSS Feed URL..." className="bg-gray-800 border-gray-700 text-white" />
          </div>
          <div className="aspect-video rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 text-sm text-center p-4">
            RSS feeds can be added here for market news updates. Coming soon.
          </div>
        </>}
    </Card>;
}

// Main terminal component

// Main terminal component
function TerminalMain({ initialMarketSlug, initialMarketId }: { initialMarketSlug?: string; initialMarketId?: string } = {}) {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Market[]>([]);
  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [mcOptions, setMcOptions] = useState<MultipleChoiceOption[]>([]);
  const [selectedMcIndex, setSelectedMcIndex] = useState<number>(0);
  const [showEditMode, setShowEditMode] = useState(false);
  const [conditionalOrders, setConditionalOrders] = useState<any[]>([]);
  const [hotkeyMode, setHotkeyMode] = useState(false); // When true, command line not focused, hotkeys work globally
  const [quickLimitAmount, setQuickLimitAmount] = useState<number>(100); // Preset amount for CMD+F and SHIFT+F shortcuts
  const {
    panels,
    saveLayout,
    isPanelVisible
  } = useTerminalLayout();
  const commandInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const savedHotkeys = localStorage.getItem(STORAGE_KEYS.HOTKEYS);
    const savedYoutube = localStorage.getItem(STORAGE_KEYS.YOUTUBE_URL);
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setApiKeyInput(savedApiKey);
    }
    if (savedHotkeys) {
      setHotkeys(JSON.parse(savedHotkeys));
    }
    if (savedYoutube) {
      setYoutubeUrl(savedYoutube);
      setYoutubeInput(savedYoutube);
    }
  }, []);

  // Load market from URL (slug or ID) if provided
  useEffect(() => {
    const loadMarket = async () => {
      if (!apiKey) return;
      
      let marketData = null;
      
      // Try to load by ID first
      if (initialMarketId) {
        try {
          const response = await fetch(`https://api.manifold.markets/v0/market/${initialMarketId}`);
          if (response.ok) {
            marketData = await response.json();
          }
        } catch (err) {
          console.error("Failed to load market by ID:", err);
        }
      }
      
      // Fall back to slug if no ID or ID failed
      if (!marketData && initialMarketSlug) {
        try {
          const response = await fetch(`https://api.manifold.markets/v0/slug/${initialMarketSlug}`);
          if (response.ok) {
            marketData = await response.json();
          }
        } catch (err) {
          console.error("Failed to load market from slug:", err);
        }
      }
      
      if (marketData && !marketData.isResolved) {
        setActiveMarket({
          id: marketData.id,
          question: marketData.question,
          probability: marketData.probability,
          url: marketData.url,
          outcomeType: marketData.outcomeType,
          isResolved: marketData.isResolved,
          answers: marketData.answers
        });
        
        // Set up MC options if applicable - filter out resolved options
        if (marketData.outcomeType === "MULTIPLE_CHOICE" && marketData.answers) {
          const options = marketData.answers
            .filter((a: any) => a.resolution === undefined || a.resolution === null)
            .map((a: any, i: number) => ({
              index: i + 1,
              id: a.id,
              text: a.text,
              probability: a.probability ?? 0
            }));
          setMcOptions(options);
          setSelectedMcIndex(options.length > 0 ? 1 : 0);
        }
      }
    };
    
    if (initialMarketId || initialMarketSlug) {
      loadMarket();
    }
  }, [initialMarketSlug, apiKey]);

  // Save hotkeys to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOTKEYS, JSON.stringify(hotkeys));
  }, [hotkeys]);

  // Poll active market probability AND MC options in real-time
  useEffect(() => {
    if (activeMarket && apiKey) {
      const pollMarket = async () => {
        try {
          const response = await fetch(`https://api.manifold.markets/v0/market/${activeMarket.id}`);
          if (response.ok) {
            const data = await response.json();
            setActiveMarket(prev => prev ? {
              ...prev,
              probability: data.probability,
              answers: data.answers
            } : null);

            // Update MC options with live probabilities - filter out resolved options
            if (data.outcomeType === "MULTIPLE_CHOICE" && data.answers && data.answers.length > 0) {
              const updatedOptions = data.answers
                .filter((a: any) => a.resolution === undefined || a.resolution === null)
                .map((a: any, i: number) => ({
                  index: i + 1,
                  id: a.id,
                  text: a.text,
                  probability: a.probability ?? a.prob ?? 0
                }));
              setMcOptions(updatedOptions);
            }
            setIsConnected(true);
          } else {
            setIsConnected(false);
          }
        } catch {
          setIsConnected(false);
        }
      };
      pollMarket();
      // Poll every 1 second for real-time feel
      pollingRef.current = setInterval(pollMarket, 1000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [activeMarket?.id, apiKey]);

  // Fetch positions for active market
  useEffect(() => {
    if (activeMarket && apiKey) {
      fetchPositions();
    }
  }, [activeMarket?.id, apiKey]);
  const fetchPositions = async () => {
    if (!activeMarket || !apiKey) return;
    try {
      // Fetch user info first to get user id
      const meResponse = await fetch("https://api.manifold.markets/v0/me", {
        headers: {
          Authorization: `Key ${apiKey}`
        }
      });
      if (!meResponse.ok) return;
      const meData = await meResponse.json();
      const userId = meData.id;

      // Fetch positions for this market
      const response = await fetch(`https://api.manifold.markets/v0/market/${activeMarket.id}/positions?userId=${userId}`, {
        headers: {
          Authorization: `Key ${apiKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log("[TT] Positions fetched:", data);
        if (data && Array.isArray(data) && data.length > 0) {
          // For binary markets: data[0].hasYesShares, data[0].hasNoShares, data[0].totalShares
          // For MC markets: check answers
          const pos: Position[] = [];
          for (const p of data) {
            if (p.hasYesShares && p.totalShares?.YES > 0) {
              pos.push({
                outcome: "YES",
                shares: p.totalShares.YES,
                answerId: p.answerId
              });
            }
            if (p.hasNoShares && p.totalShares?.NO > 0) {
              pos.push({
                outcome: "NO",
                shares: p.totalShares.NO,
                answerId: p.answerId
              });
            }
          }
          setPositions(pos);
        } else {
          setPositions([]);
        }
      }
    } catch (err) {
      console.error("[TT] Position fetch error:", err);
    }
  };
  const addLog = useCallback((action: string, success: boolean, details: string) => {
    const log: ExecutionLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      success,
      details
    };
    setExecutionLogs(prev => [log, ...prev].slice(0, 100));
  }, []);
  const saveApiKey = () => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKeyInput);
    setApiKey(apiKeyInput);
    toast.success("API key saved");
    addLog("API Key", true, "API key saved to localStorage");
  };
  const searchMarkets = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/search-markets?term=${encodeURIComponent(query)}&limit=30`);
      if (response.ok) {
        const data = await response.json();
        // Filter out resolved markets, date markets (STONK), numeric markets, and polls
        const filtered = data.filter((m: any) => {
          // Skip resolved markets
          if (m.isResolved) return false;
          // Skip STONK (date-based), NUMBER, POLL, BOUNTIED_QUESTION
          const excludedTypes = ["STONK", "NUMBER", "POLL", "BOUNTIED_QUESTION", "PSEUDO_NUMERIC"];
          if (excludedTypes.includes(m.outcomeType)) return false;
          return true;
        });
        setSearchResults(filtered.slice(0, 10).map((m: any) => ({
          id: m.id,
          question: m.question,
          probability: m.probability,
          url: m.url,
          outcomeType: m.outcomeType,
          isResolved: m.isResolved,
          answers: m.answers
        })));
      }
    } catch (err) {
      addLog("Search", false, "Failed to search markets");
    } finally {
      setIsSearching(false);
    }
  };
  const navigate = useNavigate();
  
  const selectMarket = (market: Market) => {
    setActiveMarket(market);
    setSearchResults([]);
    setSearchQuery("");

    // Update URL to include market ID
    navigate(`/terminal/${market.id}`, { replace: true });

    // Set up multiple choice options if applicable - filter out resolved options
    if (market.outcomeType === "MULTIPLE_CHOICE" && market.answers) {
      const options = market.answers
        .filter((a: any) => a.resolution === undefined || a.resolution === null)
        .map((a, i) => ({
          index: i + 1,
          id: a.id,
          text: a.text,
          probability: a.probability ?? 0
        }));
      setMcOptions(options);
      setSelectedMcIndex(options.length > 0 ? 1 : 0);
    } else {
      setMcOptions([]);
      setSelectedMcIndex(0);
    }
    addLog("Market Selected", true, `${market.question.slice(0, 50)}...`);
    commandInputRef.current?.focus();
  };
  const executeTrade = async (side: "YES" | "NO", amount: number, limitPrice?: number, expirationMinutes?: number, answerId?: string) => {
    if (!activeMarket || !apiKey) {
      addLog("Trade", false, "No market or API key");
      return;
    }

    // Check if this is a conditional order (limit price that's "wrong side" of current price)
    if (limitPrice !== undefined) {
      const currentProb = activeMarket.probability * 100;
      const isYesAboveCurrent = side === "YES" && limitPrice > currentProb;
      const isNoBelowCurrent = side === "NO" && limitPrice < currentProb;

      // YES limit above current = conditional (wait for price to rise)
      // NO limit below current = conditional (wait for price to fall)
      if (isYesAboveCurrent || isNoBelowCurrent) {
        // Create conditional order
        try {
          const {
            data,
            error
          } = await supabase.functions.invoke("conditional-limit-order", {
            body: {
              action: "create-order",
              marketId: activeMarket.id,
              marketUrl: activeMarket.url,
              side,
              amount,
              targetProbability: limitPrice
            }
          });
          if (error) throw error;
          if (data.executeNow) {
            // Normal limit order, continue with regular flow
            addLog("Info", true, "Target at/better than current price, using normal limit order");
          } else if (data.success) {
            addLog(`Conditional ${side}`, true, `${amount}M @ ${limitPrice}% - waiting for trigger`);
            toast.success(`Conditional order created - will execute when price reaches ${limitPrice}%`);
            return;
          } else if (data.error) {
            addLog("Conditional", false, data.error);
            toast.error(data.error);
            return;
          }
        } catch (err) {
          console.error("Conditional order error:", err);
          addLog("Conditional", false, "Failed to create conditional order");
          toast.error("Failed to create conditional order");
          return;
        }
      }
    }
    const body: any = {
      contractId: activeMarket.id,
      outcome: side,
      amount
    };

    // For multiple choice markets, include answerId
    if (answerId) {
      body.answerId = answerId;
    }
    if (limitPrice !== undefined) {
      body.limitProb = limitPrice / 100;
      if (expirationMinutes) {
        body.expiresAt = Date.now() + expirationMinutes * 60 * 1000;
      }
    }
    try {
      const response = await fetch("https://api.manifold.markets/v0/bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${apiKey}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok) {
        const orderType = limitPrice ? `Limit @${limitPrice}%` : "Market";
        const expiry = expirationMinutes ? ` (${expirationMinutes}m)` : "";
        addLog(`${side} ${orderType}${expiry}`, true, `${amount}M → ${data.shares?.toFixed(2) || "?"} shares`);
        toast.success(`${side} order placed`);
        fetchPositions();
      } else {
        addLog(`${side} Order`, false, data.message || "Failed");
        toast.error(data.message || "Trade failed");
      }
    } catch (err) {
      addLog("Trade", false, "Network error");
      toast.error("Network error");
    }
  };
  const sellAllPositions = useCallback(async () => {
    if (!activeMarket || !apiKey) {
      addLog("Sell All", false, "No market or API key");
      toast.error("No active market or API key");
      return;
    }
    if (positions.length === 0) {
      addLog("Sell All", false, "No positions to sell");
      toast.error("No positions to sell");
      return;
    }
    for (const pos of positions) {
      if (pos.shares > 0) {
        try {
          const response = await fetch("https://api.manifold.markets/v0/market/" + activeMarket.id + "/sell", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Key ${apiKey}`
            },
            body: JSON.stringify({
              outcome: pos.outcome,
              shares: pos.shares
            })
          });
          const data = await response.json();
          if (response.ok) {
            addLog(`Sell ${pos.outcome}`, true, `Sold ${pos.shares.toFixed(2)} shares`);
          } else {
            addLog(`Sell ${pos.outcome}`, false, data.message || "Failed");
          }
        } catch {
          addLog(`Sell ${pos.outcome}`, false, "Network error");
        }
      }
    }
    fetchPositions();
    toast.success("Sold all positions");
  }, [activeMarket, apiKey, positions, addLog]);

  // Helper to append to command input from MC option click
  const appendMcOptionToCommand = (option: MultipleChoiceOption) => {
    setSelectedMcIndex(option.index);
    // Add the option prefix to command if not already there
    const prefix = `${option.index}:`;
    if (!commandInput.startsWith(prefix)) {
      setCommandInput(prefix);
    }
    commandInputRef.current?.focus();
  };
  const parseAndExecuteCommand = (input: string, forceExecute = false) => {
    const trimmed = input.trim().toUpperCase();

    // Check for MC option switch with #N
    const mcSwitch = /^#(\d+)$/;
    let match = trimmed.match(mcSwitch);
    if (match) {
      const optionIndex = parseInt(match[1]);
      if (optionIndex > 0 && optionIndex <= mcOptions.length) {
        setSelectedMcIndex(optionIndex);
        addLog("MC Switch", true, `Switched to option #${optionIndex}: ${mcOptions[optionIndex - 1]?.text?.slice(0, 30)}...`);
      }
      setCommandInput("");
      return true;
    }

    // Limit Sell (Take Profit) syntax: /LS@{price}/ or {exp}/LS@{price}/ - uses full position
    // Also support legacy with amount: LS{amount}@{price} or {exp}/LS{amount}@{price}
    const limitSellNewWithExpiry = /^(\d+)\/LS@(\d+)\/$/;
    match = trimmed.match(limitSellNewWithExpiry);
    if (match && (autoExecute || forceExecute)) {
      const [, expiry, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      createLimitSellOrder(parseInt(price), undefined, parseInt(expiry), answerId);
      setCommandInput("");
      return true;
    }
    const limitSellNew = /^\/LS@(\d+)\/$/;
    match = trimmed.match(limitSellNew);
    if (match && (autoExecute || forceExecute)) {
      const [, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      createLimitSellOrder(parseInt(price), undefined, undefined, answerId);
      setCommandInput("");
      return true;
    }
    // Legacy limit sell with explicit amount
    const limitSellWithExpiry = /^(\d+)\/LS(\d+)@(\d+)$/;
    match = trimmed.match(limitSellWithExpiry);
    if (match && (autoExecute || forceExecute)) {
      const [, expiry, amount, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      createLimitSellOrder(parseInt(price), parseInt(amount), parseInt(expiry), answerId);
      setCommandInput("");
      return true;
    }
    const limitSell = /^LS(\d+)@(\d+)$/;
    match = trimmed.match(limitSell);
    if (match && (autoExecute || forceExecute)) {
      const [, amount, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      createLimitSellOrder(parseInt(price), parseInt(amount), undefined, answerId);
      setCommandInput("");
      return true;
    }

    // Straddle syntax: ST{delta}/{amount}/ - places YES limit at (current - delta) and NO limit at (current + delta)
    // Example: ST5/100/ places 100M YES @(current-5%) and 100M NO @(current+5%)
    const straddleOrder = /^ST(\d+)\/(\d+)\/$/;
    match = trimmed.match(straddleOrder);
    if (match) {
      const [, delta, amount] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      executeStraddle(parseInt(delta), parseInt(amount), undefined, answerId);
      setCommandInput("");
      return true;
    }

    // Straddle with expiry: {minutes}/ST{delta}/{amount}/
    const straddleWithExpiry = /^(\d+)\/ST(\d+)\/(\d+)\/$/;
    match = trimmed.match(straddleWithExpiry);
    if (match) {
      const [, minutes, delta, amount] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      executeStraddle(parseInt(delta), parseInt(amount), parseInt(minutes), answerId);
      setCommandInput("");
      return true;
    }

    // Check for MC trading on specific option: N:amountB or N:amountS
    const mcTrade = /^(\d+):(\d+)(B|S)$/;
    match = trimmed.match(mcTrade);
    if (match && mcOptions.length > 0) {
      const [, optionNum, amount, side] = match;
      const optionIndex = parseInt(optionNum);
      if (optionIndex > 0 && optionIndex <= mcOptions.length) {
        const option = mcOptions[optionIndex - 1];
        if (autoExecute || forceExecute) {
          executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), undefined, undefined, option.id);
          setCommandInput("");
        }
        return true;
      }
    }

    // MC trading with limit: N:amountB@price/
    const mcTradeLimit = /^(\d+):(\d+)(B|S)@(\d+)\/$/;
    match = trimmed.match(mcTradeLimit);
    if (match && mcOptions.length > 0) {
      const [, optionNum, amount, side, price] = match;
      const optionIndex = parseInt(optionNum);
      if (optionIndex > 0 && optionIndex <= mcOptions.length) {
        const option = mcOptions[optionIndex - 1];
        executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), parseInt(price), undefined, option.id);
        setCommandInput("");
        return true;
      }
    }

    // Pattern: {minutes}/{amount}{B|S}@{price}/ - limit with expiration (/ required, auto-executes)
    const limitWithExpiry = /^(\d+)\/(\d+)(B|S)@(\d+)\/$/;
    match = trimmed.match(limitWithExpiry);
    if (match) {
      const [, minutes, amount, side, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), parseInt(price), parseInt(minutes), answerId);
      setCommandInput("");
      return true;
    }

    // Pattern: /{amount}{B|S}@{price}/ - limit without expiration (starts with /, / required at end, auto-executes)
    const limitNoExpirySlash = /^\/(\d+)(B|S)@(\d+)\/$/;
    match = trimmed.match(limitNoExpirySlash);
    if (match) {
      const [, amount, side, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), parseInt(price), undefined, answerId);
      setCommandInput("");
      return true;
    }

    // Pattern: /{amount}{B|S}@{price} - limit without expiration (requires / prefix, executes on Enter)
    const limitNoExpiryEnter = /^\/(\d+)(B|S)@(\d+)$/;
    match = trimmed.match(limitNoExpiryEnter);
    if (match && forceExecute) {
      const [, amount, side, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), parseInt(price), undefined, answerId);
      setCommandInput("");
      return true;
    }

    // Legacy pattern with L (keep for backwards compat): {amount}{B|S}@{price}L
    // NOTE: Without slash and without expiry, still support L for backwards compat

    // Pattern: {amount}{B|S} - market order
    const marketOrder = /^(\d+)(B|S)$/;
    match = trimmed.match(marketOrder);
    if (match) {
      const [, amount, side] = match;
      // Only execute if autoExecute is on, OR forceExecute (enter pressed)
      if (forceExecute) {
        const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
        executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), undefined, undefined, answerId);
        setCommandInput("");
      }
      return true;
    }

    // Legacy pattern with expiry (keep for backwards compat): {minutes}/{amount}{B|S}@{price}
    const limitWithExpiryNoL = /^(\d+)\/(\d+)(B|S)@(\d+)$/;
    match = trimmed.match(limitWithExpiryNoL);
    if (match && forceExecute) {
      const [, minutes, amount, side, price] = match;
      const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
      executeTrade(side === "B" ? "YES" : "NO", parseInt(amount), parseInt(price), parseInt(minutes), answerId);
      setCommandInput("");
      return true;
    }
    return false;
  };

  // Create limit sell order using edge function
  // Uses same calculation as AdvancedOrders: places opposite limit order to hedge position
  // cashRequired = sharesHeld * (1 - targetPrice) for YES positions
  const createLimitSellOrder = async (targetPrice: number, amount?: number, expirationMinutes?: number, answerId?: string) => {
    if (!activeMarket || !apiKey) {
      addLog("Take Profit", false, "No market or API key");
      return;
    }

    // Find position to sell - support both YES and NO
    const yesPos = positions.find(p => p.outcome === "YES" && p.shares > 0 && (answerId ? p.answerId === answerId : true));
    const noPos = positions.find(p => p.outcome === "NO" && p.shares > 0 && (answerId ? p.answerId === answerId : true));
    const posToSell = yesPos || noPos;
    if (!posToSell || posToSell.shares <= 0) {
      addLog("Take Profit", false, "No position to sell");
      toast.error("No position to sell in this market");
      return;
    }
    const isYesPosition = posToSell.outcome === "YES";
    const sharesHeld = posToSell.shares;

    // Use specified amount or all shares
    const sharesToSell = amount ? Math.min(amount, sharesHeld) : sharesHeld;

    // Calculate entry price estimate (current prob as fallback)
    const currentProb = activeMarket.probability;
    const targetProbDecimal = targetPrice / 100;

    // Calculate cash required for the hedge using same formula as AdvancedOrders
    // For YES position: place NO limit at (1 - targetPrice), cash = shares * (1 - targetPrice)
    // For NO position: place YES limit at targetPrice, cash = shares * targetPrice
    const cashRequired = isYesPosition ? sharesToSell * (1 - targetProbDecimal) : sharesToSell * targetProbDecimal;
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("limit-sell-order", {
        body: {
          action: "create-order",
          marketId: activeMarket.id,
          marketUrl: activeMarket.url,
          marketQuestion: activeMarket.question,
          targetExitPrice: targetPrice,
          sharesHeld: sharesToSell,
          entryPrice: Math.round(currentProb * 100),
          positionType: isYesPosition ? "YES" : "NO",
          answerId,
          expirationMinutes
        }
      });
      if (error) throw error;
      if (data.success) {
        const hedgeSide = isYesPosition ? "NO" : "YES";
        const hedgePrice = isYesPosition ? 100 - targetPrice : targetPrice;
        addLog("Take Profit", true, `${hedgeSide} limit @${hedgePrice}% for ${sharesToSell.toFixed(0)} shares (M$${cashRequired.toFixed(0)} required)`);
        toast.success(`Take profit set - ${hedgeSide} limit @${hedgePrice}% will lock in gains at ${targetPrice}%`);
      } else {
        addLog("Take Profit", false, data.error || "Failed");
        toast.error(data.error || "Failed to create take profit order");
      }
    } catch (err) {
      console.error("Take profit error:", err);
      addLog("Take Profit", false, "Failed to create order");
      toast.error("Failed to create take profit order");
    }
  };

  // Execute straddle order - places YES limit below current price and NO limit above current price
  // Amount is SPLIT across both orders, not duplicated
  const executeStraddle = async (delta: number, totalAmount: number, expirationMinutes?: number, answerId?: string) => {
    if (!activeMarket || !apiKey) {
      addLog("Straddle", false, "No market or API key");
      return;
    }
    const currentProb = mcOptions.length > 0 && mcOptions[selectedMcIndex - 1] ? Math.round(mcOptions[selectedMcIndex - 1].probability * 100) : Math.round(activeMarket.probability * 100);
    const yesLimitPrice = Math.max(1, currentProb - delta);
    const noLimitPrice = Math.min(99, currentProb + delta);

    // Split the amount across both orders
    const amountPerSide = Math.floor(totalAmount / 2);
    addLog("Straddle", true, `Placing YES @${yesLimitPrice}% & NO @${noLimitPrice}% (M$${amountPerSide} each, delta: ${delta})`);

    // Place YES limit order below current price
    await executeTrade("YES", amountPerSide, yesLimitPrice, expirationMinutes, answerId);

    // Place NO limit order above current price
    await executeTrade("NO", amountPerSide, noLimitPrice, expirationMinutes, answerId);
    toast.success(`Straddle placed: YES @${yesLimitPrice}% / NO @${noLimitPrice}% (M$${amountPerSide} each)`);
  };
  const handleCommandChange = (value: string) => {
    setCommandInput(value);
    parseAndExecuteCommand(value);
  };
  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      parseAndExecuteCommand(commandInput, true);
    }
  };

  // Cancel all limit orders function
  const cancelAllLimitOrders = useCallback(async () => {
    if (!activeMarket || !apiKey) {
      addLog("Cancel All", false, "No market or API key");
      toast.error("No active market or API key");
      return;
    }
    try {
      // Fetch user's bets to find limit orders
      const meResponse = await fetch("https://api.manifold.markets/v0/me", {
        headers: {
          Authorization: `Key ${apiKey}`
        }
      });
      if (!meResponse.ok) return;
      const meData = await meResponse.json();
      const userId = meData.id;

      // Fetch bets for this market
      const betsResponse = await fetch(`https://api.manifold.markets/v0/bets?contractId=${activeMarket.id}&userId=${userId}&limit=100`);
      if (!betsResponse.ok) return;
      const bets = await betsResponse.json();

      // Find active limit orders
      const activeLimitOrders = bets.filter((bet: any) => {
        if (!bet.limitProb) return false;
        if (bet.isCancelled || bet.isFilled) return false;
        const orderAmount = bet.orderAmount || bet.amount || 0;
        const filledAmount = bet.fills?.reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0) || 0;
        return orderAmount - filledAmount > 0;
      });
      if (activeLimitOrders.length === 0) {
        addLog("Cancel All", false, "No active limit orders to cancel");
        toast.info("No active limit orders to cancel");
        return;
      }

      // Cancel each order
      let cancelledCount = 0;
      for (const order of activeLimitOrders) {
        try {
          const response = await fetch(`https://api.manifold.markets/v0/bet/cancel/${order.id}`, {
            method: "POST",
            headers: {
              Authorization: `Key ${apiKey}`
            }
          });
          if (response.ok) {
            cancelledCount++;
          }
        } catch (err) {
          console.error("Failed to cancel order:", order.id);
        }
      }
      addLog("Cancel All", true, `Cancelled ${cancelledCount} limit orders`);
      toast.success(`Cancelled ${cancelledCount} limit orders`);
    } catch (err) {
      console.error("Cancel all error:", err);
      addLog("Cancel All", false, "Failed to cancel orders");
      toast.error("Failed to cancel limit orders");
    }
  }, [activeMarket, apiKey, addLog]);

  // Global hotkey handler (including MC navigation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+L or Ctrl+L to cancel all limit orders
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        e.stopPropagation();
        cancelAllLimitOrders();
        return;
      }

      // Check for Cmd+X or Ctrl+X to sell all AND cancel all limit orders
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x") {
        e.preventDefault();
        e.stopPropagation();
        cancelAllLimitOrders();
        sellAllPositions();
        return;
      }

      // CMD/CTRL+F+[0-9]: Limit order at X% ABOVE current market price
      // SHIFT+F+[0-9]: Limit order at X% BELOW current market price  
      if (e.key >= "0" && e.key <= "9" && activeMarket && apiKey) {
        const digit = parseInt(e.key);
        const currentProb = mcOptions.length > 0 && mcOptions[selectedMcIndex - 1] 
          ? Math.round(mcOptions[selectedMcIndex - 1].probability * 100) 
          : Math.round(activeMarket.probability * 100);
        const answerId = mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined;
        
        // CMD/CTRL+F+digit: limit order above current price (digit = how many % above)
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
          const targetPrice = Math.min(99, currentProb + digit);
          e.preventDefault();
          e.stopPropagation();
          executeTrade("YES", quickLimitAmount, targetPrice, undefined, answerId);
          addLog(`Quick Limit`, true, `YES limit M$${quickLimitAmount} @${targetPrice}% (+${digit}%)`);
          return;
        }
        
        // SHIFT+digit: limit order below current price (digit = how many % below)
        if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
          const target = e.target as HTMLElement;
          if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
          
          const targetPrice = Math.max(1, currentProb - digit);
          e.preventDefault();
          e.stopPropagation();
          executeTrade("YES", quickLimitAmount, targetPrice, undefined, answerId);
          addLog(`Quick Limit`, true, `YES limit M$${quickLimitAmount} @${targetPrice}% (-${digit}%)`);
          return;
        }
      }

      // Ignore if typing in input (except for arrow navigation in command input)
      const target = e.target as HTMLElement;
      const isCommandInput = target === commandInputRef.current;

      // MC option navigation with arrow keys ONLY (removed w/s)
      if (mcOptions.length > 0 && activeMarket) {
        const isNavKey = e.key === "ArrowUp" || e.key === "ArrowDown";

        // Only handle nav in input if command is empty
        if (isNavKey && (!isCommandInput || commandInput.trim() === "")) {
          e.preventDefault();
          const goUp = e.key === "ArrowUp";
          setSelectedMcIndex(prev => {
            if (goUp) {
              return prev > 1 ? prev - 1 : mcOptions.length;
            } else {
              return prev < mcOptions.length ? prev + 1 : 1;
            }
          });
          return;
        }
      }
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (!activeMarket || !apiKey) return;
      const hotkey = hotkeys.find(h => h.key.toUpperCase() === e.key.toUpperCase());
      if (hotkey) {
        e.preventDefault();
        let limitPrice: number | undefined;
        if (hotkey.orderType === "limit-fixed") {
          limitPrice = hotkey.limitPrice;
        } else if (hotkey.orderType === "limit-relative") {
          const currentProb = Math.round(activeMarket.probability * 100);
          limitPrice = currentProb + (hotkey.relativeOffset || 0);
          limitPrice = Math.max(1, Math.min(99, limitPrice));
        }

        // Determine answerId for MC markets
        let answerId: string | undefined;
        if (mcOptions.length > 0) {
          const optionIdx = hotkey.mcOptionIndex && hotkey.mcOptionIndex > 0 && hotkey.mcOptionIndex <= mcOptions.length ? hotkey.mcOptionIndex : selectedMcIndex;
          answerId = mcOptions[optionIdx - 1]?.id;
        }

        // Handle straddle hotkeys
        if (hotkey.orderType === "straddle" && hotkey.straddleDelta) {
          executeStraddle(hotkey.straddleDelta, hotkey.amount, hotkey.expirationMinutes, answerId);
        } else if (hotkey.side !== "STRADDLE") {
          executeTrade(hotkey.side, hotkey.amount, limitPrice, hotkey.expirationMinutes, answerId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [hotkeys, activeMarket, apiKey, sellAllPositions, mcOptions, selectedMcIndex, commandInput, quickLimitAmount, addLog]);
  const addHotkey = () => {
    const newHotkey: Hotkey = {
      id: crypto.randomUUID(),
      key: "",
      side: "YES",
      amount: 10,
      orderType: "market"
    };
    setHotkeys([...hotkeys, newHotkey]);
  };
  const updateHotkey = (id: string, updates: Partial<Hotkey>) => {
    setHotkeys(hotkeys.map(h => h.id === id ? {
      ...h,
      ...updates
    } : h));
  };
  const deleteHotkey = (id: string) => {
    setHotkeys(hotkeys.filter(h => h.id !== id));
  };
  const saveYoutube = () => {
    localStorage.setItem(STORAGE_KEYS.YOUTUBE_URL, youtubeInput);
    setYoutubeUrl(youtubeInput);
    toast.success("Video saved");
  };
  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };
  const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

  // Active dropdown state - only one can be open at a time
  const [activeDropdown, setActiveDropdown] = useState<"syntax" | "description" | "comments" | null>(null);
  const [marketComments, setMarketComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Fetch comments when dropdown opens
  useEffect(() => {
    if (activeDropdown === "comments" && activeMarket) {
      fetchMarketComments();
    }
  }, [activeDropdown, activeMarket?.id]);
  const fetchMarketComments = async () => {
    if (!activeMarket) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/comments?contractId=${activeMarket.id}&limit=20`);
      if (response.ok) {
        const comments = await response.json();
        setMarketComments(comments);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Liquidity state for price impact calculation - must be declared before getPriceImpactPreview
  const [liquidity, setLiquidity] = useState(1000);

  // Fetch liquidity for price impact calculation
  useEffect(() => {
    if (activeMarket) {
      fetch(`https://api.manifold.markets/v0/market/${activeMarket.id}`).then(res => res.json()).then(data => setLiquidity(data.totalLiquidity || 1000)).catch(() => {});
    }
  }, [activeMarket?.id]);

  // Calculate price impact preview
  const getPriceImpactPreview = useCallback(() => {
    if (!activeMarket || autoExecute) return null;
    const trimmed = commandInput.trim().toUpperCase();
    const currentProb = mcOptions.length > 0 && mcOptions[selectedMcIndex - 1] ? mcOptions[selectedMcIndex - 1].probability * 100 : activeMarket.probability * 100;

    // Market order pattern: {amount}{B|S}
    const marketOrder = /^(\d+)(B|S)$/;
    let match = trimmed.match(marketOrder);
    if (match) {
      const [, amountStr, side] = match;
      const amount = parseInt(amountStr);
      // Rough estimate: each M$10 moves the market ~0.5-1% depending on liquidity
      // Using a simple approximation based on typical liquidity
      const liquidityFactor = Math.max(100, liquidity || 1000);
      const impact = amount / liquidityFactor * 50; // rough estimate
      const newProb = side === "B" ? Math.min(99, currentProb + impact) : Math.max(1, currentProb - impact);
      return {
        type: "market",
        side: side === "B" ? "YES" : "NO",
        currentProb: currentProb.toFixed(1),
        newProb: newProb.toFixed(1),
        change: (newProb - currentProb).toFixed(1)
      };
    }

    // Limit order patterns
    const limitNoExpirySlash = /^\/(\d+)(B|S)@(\d+)\/$/;
    match = trimmed.match(limitNoExpirySlash);
    if (match) {
      const [,, side, price] = match;
      return {
        type: "limit",
        side: side === "B" ? "YES" : "NO",
        limitPrice: price,
        currentProb: currentProb.toFixed(1)
      };
    }
    const limitNoExpiryEnter = /^\/(\d+)(B|S)@(\d+)$/;
    match = trimmed.match(limitNoExpiryEnter);
    if (match) {
      const [,, side, price] = match;
      return {
        type: "limit",
        side: side === "B" ? "YES" : "NO",
        limitPrice: price,
        currentProb: currentProb.toFixed(1)
      };
    }
    const limitWithExpiry = /^(\d+)\/(\d+)(B|S)@(\d+)\/$/;
    match = trimmed.match(limitWithExpiry);
    if (match) {
      const [,,, side, price] = match;
      return {
        type: "limit",
        side: side === "B" ? "YES" : "NO",
        limitPrice: price,
        currentProb: currentProb.toFixed(1)
      };
    }
    return null;
  }, [commandInput, activeMarket, autoExecute, mcOptions, selectedMcIndex, liquidity]);
  const priceImpact = getPriceImpactPreview();
  return <div className="min-h-screen bg-[#0a0a0f] text-gray-100 p-4 pb-16 font-mono overflow-y-auto">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-emerald-500 font-mono text-xl">{">_"}</span>
            <h1 className="text-xl font-bold text-emerald-400">ManiFed Terminal</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant={hotkeyMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setHotkeyMode(!hotkeyMode);
                if (!hotkeyMode) {
                  // Blur command input when entering hotkey mode
                  commandInputRef.current?.blur();
                }
              }}
              className={`gap-2 ${hotkeyMode ? 'bg-purple-600 hover:bg-purple-700' : 'border-gray-700'}`}
            >
              ⌨ {hotkeyMode ? "Hotkey Mode" : "Hotkeys"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch checked={autoExecute} onCheckedChange={setAutoExecute} className="data-[state=checked]:bg-emerald-600" />
              <Label className="text-sm text-gray-400">{autoExecute ? "⚡ Auto" : "Auto"}</Label>
            </div>
            <Link to="/client">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white gap-2">
                ← Exit
              </Button>
            </Link>
          </div>
        </div>

        {/* Edit Mode Modal */}
        {showEditMode && <TerminalEditMode panels={panels} onSave={newPanels => {
        saveLayout(newPanels);
        setShowEditMode(false);
        toast.success("Layout saved");
      }} onCancel={() => setShowEditMode(false)} />}

        {/* API Key Warning */}
        {!apiKey && <Card className="bg-yellow-900/20 border-yellow-800/50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 font-mono">⚠</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-500 font-mono">[K]</span>
                  <span className="font-semibold text-yellow-400">API Key Required</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Enter your Manifold API key to enable trading. Your key is stored{" "}
                  <span className="text-emerald-400">locally in your browser only</span> — we never send it to our
                  servers.
                </p>
                <div className="flex gap-2">
                  <Input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Enter API key..." className="bg-gray-800 border-gray-700 text-white font-mono max-w-md" />
                  <Button onClick={saveApiKey} className="bg-emerald-600 hover:bg-emerald-700">
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </Card>}

        <ResizableTerminalLayout
          leftSidebar={
            <>
              <TerminalTrending onSelectMarket={selectMarket} activeMarketId={activeMarket?.id} />
              <HotkeyDisplayPanel hotkeys={hotkeys} onUpdateHotkey={updateHotkey} />
              <TerminalWatchlist onSelectMarket={selectMarket} activeMarketId={activeMarket?.id} currentMarket={activeMarket} />
            </>
          }
          mainContent={
            <>
              {/* Market Search - Minimizes when market selected */}
              {activeMarket ? <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveMarket(null)} className="border-gray-700 text-gray-400 hover:text-white gap-2">
                    🔍 Change Market
                  </Button>
                </div> : <div className="relative">
                  <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg px-3">
                    <span className="text-gray-500 font-mono">🔍</span>
                    <Input ref={searchInputRef} value={searchQuery} onChange={e => {
                  setSearchQuery(e.target.value);
                  searchMarkets(e.target.value);
                }} placeholder="Search markets..." className="border-0 bg-transparent text-white focus-visible:ring-0 focus-visible:ring-offset-0" />
                  </div>
                  {searchResults.length > 0 && <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden z-50">
                      {searchResults.map(market => <button key={market.id} onClick={() => selectMarket(market)} className="w-full p-3 text-left hover:bg-gray-800 border-b border-gray-800 last:border-0">
                          <div className="text-sm text-white line-clamp-2">{market.question}</div>
                          <div className="text-xs text-emerald-400 mt-1">{(market.probability * 100).toFixed(1)}%</div>
                        </button>)}
                    </div>}
                </div>}

              {/* Active Market */}
              {activeMarket ? <Card className="bg-gray-900/50 border-gray-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-mono ${isConnected ? "text-emerald-500" : "text-red-500"}`}>
                          {isConnected ? "◉" : "○"}
                        </span>
                        <Badge variant="outline" className="text-xs border-gray-700">
                          {isConnected ? "LIVE" : "DISCONNECTED"}
                        </Badge>
                        {mcOptions.length > 0 && <Badge variant="outline" className="text-xs border-purple-700 text-purple-400">
                            MC ({mcOptions.length} options)
                          </Badge>}
                      </div>

                      {/* Show selected MC option name at top if applicable */}
                      {mcOptions.length > 0 && mcOptions[selectedMcIndex - 1] && <div className="text-sm text-purple-400 mb-1 font-mono">
                          Trading: #{selectedMcIndex} {mcOptions[selectedMcIndex - 1].text.slice(0, 50)}
                          {mcOptions[selectedMcIndex - 1].text.length > 50 ? "..." : ""}
                        </div>}

                      <h2 className="text-lg text-white mb-2">{activeMarket.question}</h2>

                      {/* Multiple Choice Options - Clickable to add to command */}
                      {mcOptions.length > 0 ? <div className="space-y-1 mb-3">
                          <div className="text-xs text-gray-500 mb-2">
                            Click option to add to command • ↑↓ or W/S to navigate
                          </div>
                          <ScrollArea className="h-[120px]">
                            {mcOptions.map(opt => <div key={opt.id} className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${opt.index === selectedMcIndex ? "bg-emerald-900/40 border border-emerald-700" : "hover:bg-gray-800"}`} onClick={() => appendMcOptionToCommand(opt)}>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 w-5 text-right">#{opt.index}</span>
                                  <span className={opt.index === selectedMcIndex ? "text-emerald-400" : "text-gray-300"}>
                                    {opt.text.slice(0, 40)}
                                    {opt.text.length > 40 ? "..." : ""}
                                  </span>
                                </div>
                                <span className={`font-mono font-bold ${opt.index === selectedMcIndex ? "text-emerald-400" : "text-gray-400"}`}>
                                  {typeof opt.probability === "number" && !isNaN(opt.probability) ? `${(opt.probability * 100).toFixed(1)}%` : "—"}
                                </span>
                              </div>)}
                          </ScrollArea>
                        </div> : <div className="flex items-center gap-3">
                          <div className="text-4xl font-bold text-emerald-400">
                            {typeof activeMarket.probability === "number" && !isNaN(activeMarket.probability) ? `${(activeMarket.probability * 100).toFixed(1)}%` : "—"}
                          </div>
                          {/* Price impact preview when auto mode is off */}
                          {!autoExecute && priceImpact && <div className="text-sm">
                              {priceImpact.type === "market" ? <span className={priceImpact.side === "YES" ? "text-emerald-400" : "text-red-400"}>
                                  → {priceImpact.newProb}%
                                  <span className="text-gray-500 ml-1">
                                    ({parseFloat(priceImpact.change) >= 0 ? "+" : ""}
                                    {priceImpact.change}%)
                                  </span>
                                </span> : <span className="text-yellow-400">
                                  Limit @{priceImpact.limitPrice}%<span className="text-gray-500 ml-1">(if filled)</span>
                                </span>}
                            </div>}
                        </div>}
                    </div>
                  </div>
                </Card> : <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
                  <div className="text-gray-500">Search and select a market to start trading</div>
                </Card>}

              {/* Command Bar */}
              <div className="relative">
                <Input ref={commandInputRef} value={commandInput} onChange={e => handleCommandChange(e.target.value)} onKeyDown={handleCommandKeyDown} placeholder={activeMarket && apiKey ? "Enter command here" : "Select a market first..."} disabled={!activeMarket || !apiKey} className="bg-gray-900 border-gray-800 text-white font-mono text-lg h-14 px-4" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {autoExecute ? "⚡ AUTO" : "↵ ENTER"}
                </div>
              </div>

              {/* Dropdowns Row - Syntax, Description, Comments */}
              <div className="flex items-center gap-2 text-xs">
                {/* Syntax Guide Dropdown */}
                <Button variant="ghost" size="sm" onClick={() => setActiveDropdown(activeDropdown === "syntax" ? null : "syntax")} className={`h-6 px-2 text-[10px] ${activeDropdown === "syntax" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}>
                  Syntax Guide {activeDropdown === "syntax" ? "▲" : "▼"}
                </Button>

                {/* Market Description Dropdown */}
                {activeMarket && <Button variant="ghost" size="sm" onClick={() => setActiveDropdown(activeDropdown === "description" ? null : "description")} className={`h-6 px-2 text-[10px] ${activeDropdown === "description" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}>
                    Description {activeDropdown === "description" ? "▲" : "▼"}
                  </Button>}

                {/* Recent Comments Dropdown */}
                {activeMarket && <Button variant="ghost" size="sm" onClick={() => setActiveDropdown(activeDropdown === "comments" ? null : "comments")} className={`h-6 px-2 text-[10px] ${activeDropdown === "comments" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-white"}`}>
                    Comments {activeDropdown === "comments" ? "▲" : "▼"}
                  </Button>}
              </div>

              {/* Dropdown Content */}
              {activeDropdown === "syntax" && <Card className="bg-gray-900/80 border-gray-800 p-3 text-xs text-gray-500">
                  <div className="space-y-1">
                    <div>
                      <span className="text-gray-400">100B</span> Buy YES • <span className="text-gray-400">100S</span>{" "}
                      Buy NO
                    </div>
                    <div>
                      <span className="text-gray-400">/100B@45/</span> Limit YES @45% •{" "}
                      <span className="text-gray-400">30/100B@45/</span> With 30min cancel
                    </div>
                    <div>
                      <span className="text-yellow-400">LS100@55</span> Limit sell 100 @55% •{" "}
                      <span className="text-yellow-400">30/LS100@55</span> With expiry
                    </div>
                    <div>
                      <span className="text-purple-400">ST5/100/</span> Straddle ±5% with M$100 split •{" "}
                      <span className="text-purple-400">30/ST5/100/</span> With expiry
                    </div>
                    <div>
                      <span className="text-gray-400">Cmd+X</span> Sell all + cancel limits •{" "}
                      <span className="text-gray-400">Cmd+L</span> Cancel all limits
                    </div>
                  </div>
                </Card>}

              {activeDropdown === "description" && activeMarket && <MarketDescriptionDropdown marketId={activeMarket.id} marketUrl={activeMarket.url} />}

              {activeDropdown === "comments" && activeMarket && <Card className="bg-gray-900/80 border-gray-800 p-3 text-xs">
                  {loadingComments ? <div className="text-gray-500 text-center py-4">Loading comments...</div> : marketComments.length === 0 ? <div className="text-gray-500 text-center py-4">No recent comments</div> : <ScrollArea className="max-h-[200px]">
                      <div className="space-y-3">
                        {marketComments.slice(0, 10).map((comment: any) => {
                    // Extract plain text from TipTap JSON content
                    const extractText = (content: any): string => {
                      if (!content) return "";
                      if (typeof content === "string") return content;
                      if (content.text) return content.text;
                      if (content.content && Array.isArray(content.content)) {
                        return content.content.map((node: any) => {
                          if (node.type === "text") return node.text || "";
                          if (node.type === "paragraph" && node.content) {
                            return node.content.map((c: any) => c.text || "").join("");
                          }
                          if (node.content) return extractText(node);
                          return "";
                        }).join(" ");
                      }
                      return "";
                    };
                    const commentText = comment.text || extractText(comment.content) || "";
                    return <div key={comment.id} className="border-b border-gray-800 pb-2 last:border-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-emerald-400 font-medium">@{comment.userName || "Anonymous"}</span>
                                <span className="text-gray-600">{new Date(comment.createdTime).toLocaleDateString()}</span>
                              </div>
                              <div className="text-gray-400 whitespace-pre-wrap">
                                {commentText}
                              </div>
                            </div>;
                  })}
                      </div>
                    </ScrollArea>}
                </Card>}

              {/* Logs & Config Tabs */}
              <Tabs defaultValue="logs" className="w-full">
                <TabsList className="w-full bg-gray-900 border border-gray-800">
                  <TabsTrigger value="logs" className="flex-1 data-[state=active]:bg-gray-800">
                    Logs
                  </TabsTrigger>
                  <TabsTrigger value="hotkeys" className="flex-1 data-[state=active]:bg-gray-800">
                    Hotkeys
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-gray-800">
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="mt-2">
                  <Card className="bg-gray-900/50 border-gray-800">
                    <ScrollArea className="h-[300px] p-3">
                      {executionLogs.length === 0 ? <div className="text-gray-500 text-sm text-center py-8">No executions yet</div> : <div className="space-y-2">
                          {executionLogs.map(log => <div key={log.id} className={`text-xs p-2 rounded border ${log.success ? "border-emerald-900/50 bg-emerald-950/20" : "border-red-900/50 bg-red-950/20"}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className={log.success ? "text-emerald-400" : "text-red-400"}>{log.action}</span>
                                <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
                              </div>
                              <div className="text-gray-400">{log.details}</div>
                            </div>)}
                        </div>}
                    </ScrollArea>
                  </Card>
                </TabsContent>

                <TabsContent value="hotkeys" className="mt-2">
                  <Card className="bg-gray-900/50 border-gray-800 p-3">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {/* Syntax-based hotkey creation */}
                        <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                          <div className="text-xs text-gray-500 mb-2">
                            Add hotkey using syntax: <span className="text-emerald-400">[key]:[syntax]</span>
                          </div>
                          <div className="text-[10px] text-gray-600 space-y-0.5">
                            <div>
                              • <span className="text-gray-400">Q:100B</span> → Q key = 100 YES market
                            </div>
                            <div>
                              • <span className="text-gray-400">W:50S</span> → W key = 50 NO market
                            </div>
                            <div>
                              • <span className="text-gray-400">E:/100B@45/</span> → E key = limit YES @45%
                            </div>
                            <div>
                              • <span className="text-gray-400">R:ST5/100/</span> → R key = straddle ±5%
                            </div>
                          </div>
                          <Input placeholder="e.g. Q:100B or W:ST5/200/" className="bg-gray-700 border-gray-600 font-mono text-sm" onKeyDown={e => {
                          if (e.key === "Enter") {
                            const input = e.currentTarget.value.trim().toUpperCase();
                            const colonIndex = input.indexOf(":");
                            if (colonIndex === -1 || colonIndex === 0) {
                              toast.error("Invalid format. Use KEY:SYNTAX (e.g., Q:100B)");
                              return;
                            }
                            const key = input.slice(0, colonIndex).slice(0, 1);
                            const syntax = input.slice(colonIndex + 1);

                            // Parse the syntax to create hotkey
                            const newHotkey: Hotkey = {
                              id: crypto.randomUUID(),
                              key,
                              side: "YES",
                              amount: 10,
                              orderType: "market"
                            };

                            // Market order: 100B or 100S
                            const marketMatch = syntax.match(/^(\d+)(B|S)$/);
                            if (marketMatch) {
                              newHotkey.side = marketMatch[2] === "B" ? "YES" : "NO";
                              newHotkey.amount = parseInt(marketMatch[1]);
                              newHotkey.orderType = "market";
                              setHotkeys([...hotkeys, newHotkey]);
                              e.currentTarget.value = "";
                              toast.success(`Hotkey ${key} added: ${newHotkey.amount}M ${newHotkey.side}`);
                              return;
                            }

                            // Limit order: /100B@45/ or 30/100B@45/
                            const limitMatch = syntax.match(/^(\d+)?\/(\d+)(B|S)@(\d+)\/$/);
                            if (limitMatch) {
                              newHotkey.side = limitMatch[3] === "B" ? "YES" : "NO";
                              newHotkey.amount = parseInt(limitMatch[2]);
                              newHotkey.orderType = "limit-fixed";
                              newHotkey.limitPrice = parseInt(limitMatch[4]);
                              if (limitMatch[1]) newHotkey.expirationMinutes = parseInt(limitMatch[1]);
                              setHotkeys([...hotkeys, newHotkey]);
                              e.currentTarget.value = "";
                              toast.success(`Hotkey ${key} added: Limit ${newHotkey.side} @${newHotkey.limitPrice}%`);
                              return;
                            }

                            // Straddle: ST5/100/ or 30/ST5/100/
                            const straddleMatch = syntax.match(/^(\d+)?\/ST(\d+(?:\.\d+)?)\/(\d+)\/$/);
                            if (straddleMatch) {
                              newHotkey.orderType = "straddle";
                              newHotkey.straddleDelta = parseFloat(straddleMatch[2]);
                              newHotkey.amount = parseInt(straddleMatch[3]);
                              if (straddleMatch[1]) newHotkey.expirationMinutes = parseInt(straddleMatch[1]);
                              setHotkeys([...hotkeys, newHotkey]);
                              e.currentTarget.value = "";
                              toast.success(`Hotkey ${key} added: Straddle ±${newHotkey.straddleDelta}%`);
                              return;
                            }
                            toast.error("Invalid syntax. Examples: 100B, /100B@45/, ST5/100/");
                          }
                        }} />
                        </div>

                        {/* Existing hotkeys */}
                        {hotkeys.map(hotkey => <div key={hotkey.id} className="flex items-center justify-between p-2 bg-gray-800/30 rounded text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 flex items-center justify-center bg-emerald-900/50 rounded font-bold text-emerald-400">
                                {hotkey.key}
                              </span>
                              <div>
                                <div className="text-gray-300">
                                  {hotkey.orderType === "straddle" ? <span className="text-purple-400">Straddle ±{hotkey.straddleDelta}% • M${hotkey.amount}</span> : hotkey.orderType === "limit-fixed" ? <span className="text-yellow-400">
                                        Limit {hotkey.side} @{hotkey.limitPrice}% • M${hotkey.amount}
                                      </span> : <span className={hotkey.side === "YES" ? "text-emerald-400" : "text-red-400"}>
                                        {hotkey.side} Market • M${hotkey.amount}
                                      </span>}
                                </div>
                                {hotkey.expirationMinutes && <div className="text-gray-500 text-[10px]">
                                    Expires: {hotkey.expirationMinutes}m
                                  </div>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => deleteHotkey(hotkey.id)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                              ✕
                            </Button>
                          </div>)}

                        {hotkeys.length === 0 && <div className="text-center text-gray-500 text-xs py-4">
                            No hotkeys configured. Add one above using syntax.
                          </div>}
                      </div>
                    </ScrollArea>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-2">
                  <Card className="bg-gray-900/50 border-gray-800 p-4 space-y-4">
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">API Key</Label>
                      <div className="flex gap-2">
                        <Input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} className="bg-gray-800 border-gray-700" />
                        <Button onClick={saveApiKey} size="sm" className="bg-emerald-600">
                          Save
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Stored locally in your browser only.</p>
                    </div>
                    {apiKey && <Button variant="destructive" size="sm" onClick={() => {
                    localStorage.removeItem(STORAGE_KEYS.API_KEY);
                    setApiKey("");
                    setApiKeyInput("");
                    toast.success("API key removed");
                  }}>
                        Clear API Key
                      </Button>}
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          }
          rightSidebar={
            <>
              {/* YouTube/RSS Panel - AT TOP */}
              <MediaPanel youtubeUrl={youtubeUrl} youtubeInput={youtubeInput} setYoutubeInput={setYoutubeInput} saveYoutube={saveYoutube} embedUrl={embedUrl} />

              {/* Price Chart */}
              {activeMarket && <TerminalPriceChart marketId={activeMarket.id} currentProbability={mcOptions.length > 0 && mcOptions[selectedMcIndex - 1] ? mcOptions[selectedMcIndex - 1].probability : activeMarket.probability} />}

              {/* Order Book */}
              {activeMarket && <TerminalOrderBook marketId={activeMarket.id} currentProbability={mcOptions.length > 0 && mcOptions[selectedMcIndex - 1] ? mcOptions[selectedMcIndex - 1].probability : activeMarket.probability} answerId={mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined} />}

              {/* Live Trades Log */}
              {activeMarket && <TerminalLiveTrades marketId={activeMarket.id} answers={activeMarket.answers?.map(a => ({
              id: a.id,
              text: a.text
            }))} selectedAnswerId={mcOptions.length > 0 ? mcOptions[selectedMcIndex - 1]?.id : undefined} soundEnabled={true} />}

              {/* Positions & P&L */}
              {activeMarket && apiKey && <TerminalPositions positions={positions} marketId={activeMarket.id} currentProbability={activeMarket.probability} apiKey={apiKey} onRefresh={fetchPositions} />}
            </>
          }
          leftDefaultSize={15}
          rightDefaultSize={25}
        />
      </div>
    </div>;
}

// Mobile block component
function MobileBlockScreen() {
  return <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <span className="text-6xl">📱</span>
        <h1 className="text-2xl font-bold text-white">Desktop Only</h1>
        <p className="text-gray-400">
          The Trading Terminal requires a keyboard and larger screen for the best experience. Please access this page
          from a desktop or laptop computer.
        </p>
        <Link to="/client">
          <Button variant="outline" className="mt-4 border-gray-700">
            ← Back to Client Menu
          </Button>
        </Link>
      </div>
    </div>;
}

// Main export with landing page
export default function TradingTerminal() {
  const [showTerminal, setShowTerminal] = useState(false);
  const isMobile = useIsMobile();
  const { creatorUsername, marketSlug, marketId } = useParams<{ creatorUsername?: string; marketSlug?: string; marketId?: string }>();

  // Block mobile users
  if (isMobile) {
    return <MobileBlockScreen />;
  }
  
  // If URL has market ID (/terminal/:marketId), go directly to terminal with that market
  if (marketId) {
    return <TerminalMain initialMarketId={marketId} />;
  }
  
  // If URL has market slug (/:creatorUsername/:marketSlug), skip landing page
  if (creatorUsername && marketSlug) {
    return <TerminalMain initialMarketSlug={`${creatorUsername}/${marketSlug}`} />;
  }
  
  if (!showTerminal) {
    return <TerminalLanding onEnter={() => setShowTerminal(true)} />;
  }
  return <TerminalMain />;
}