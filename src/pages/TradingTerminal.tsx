import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Zap, Key, Settings, Terminal, Youtube, Wifi, WifiOff, Trash2, Plus } from 'lucide-react';

interface Market {
  id: string;
  question: string;
  probability: number;
  url: string;
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
  side: 'YES' | 'NO';
  amount: number;
  orderType: 'market' | 'limit-fixed' | 'limit-relative';
  limitPrice?: number;
  relativeOffset?: number;
  expirationHours?: number;
}

interface Position {
  outcome: string;
  shares: number;
}

const STORAGE_KEYS = {
  API_KEY: 'manifold_terminal_api_key',
  HOTKEYS: 'manifold_terminal_hotkeys',
  YOUTUBE_URL: 'manifold_terminal_youtube',
};

export default function TradingTerminal() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Market[]>([]);
  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [hotkeys, setHotkeys] = useState<Hotkey[]>([]);
  const [showHotkeyPanel, setShowHotkeyPanel] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  
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

  // Save hotkeys to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HOTKEYS, JSON.stringify(hotkeys));
  }, [hotkeys]);

  // Poll active market probability
  useEffect(() => {
    if (activeMarket && apiKey) {
      const pollMarket = async () => {
        try {
          const response = await fetch(`https://api.manifold.markets/v0/market/${activeMarket.id}`);
          if (response.ok) {
            const data = await response.json();
            setActiveMarket(prev => prev ? { ...prev, probability: data.probability } : null);
            setIsConnected(true);
          } else {
            setIsConnected(false);
          }
        } catch {
          setIsConnected(false);
        }
      };

      pollMarket();
      pollingRef.current = setInterval(pollMarket, 3000);

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
      const response = await fetch(`https://api.manifold.markets/v0/market/${activeMarket.id}/positions?userId=me`, {
        headers: { 'Authorization': `Key ${apiKey}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setPositions(data.map((p: any) => ({ outcome: p.outcome, shares: p.shares })));
        } else {
          setPositions([]);
        }
      }
    } catch {
      // Ignore errors
    }
  };

  const addLog = useCallback((action: string, success: boolean, details: string) => {
    const log: ExecutionLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      success,
      details,
    };
    setExecutionLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  const saveApiKey = () => {
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKeyInput);
    setApiKey(apiKeyInput);
    toast.success('API key saved');
    addLog('API Key', true, 'API key saved to localStorage');
  };

  const searchMarkets = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/search-markets?term=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.map((m: any) => ({
          id: m.id,
          question: m.question,
          probability: m.probability,
          url: m.url,
        })));
      }
    } catch (err) {
      addLog('Search', false, 'Failed to search markets');
    } finally {
      setIsSearching(false);
    }
  };

  const selectMarket = (market: Market) => {
    setActiveMarket(market);
    setSearchResults([]);
    setSearchQuery('');
    addLog('Market Selected', true, `${market.question.slice(0, 50)}...`);
    commandInputRef.current?.focus();
  };

  const executeTrade = async (
    side: 'YES' | 'NO',
    amount: number,
    limitPrice?: number,
    expirationHours?: number
  ) => {
    if (!activeMarket || !apiKey) {
      addLog('Trade', false, 'No market or API key');
      return;
    }

    const body: any = {
      contractId: activeMarket.id,
      outcome: side,
      amount,
    };

    if (limitPrice !== undefined) {
      body.limitProb = limitPrice / 100;
      if (expirationHours) {
        body.expiresAt = Date.now() + expirationHours * 60 * 60 * 1000;
      }
    }

    try {
      const response = await fetch('https://api.manifold.markets/v0/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      if (response.ok) {
        const orderType = limitPrice ? `Limit @${limitPrice}%` : 'Market';
        const expiry = expirationHours ? ` (${expirationHours}h)` : '';
        addLog(`${side} ${orderType}${expiry}`, true, `${amount}M → ${data.shares?.toFixed(2) || '?'} shares`);
        toast.success(`${side} order placed`);
        fetchPositions();
      } else {
        addLog(`${side} Order`, false, data.message || 'Failed');
        toast.error(data.message || 'Trade failed');
      }
    } catch (err) {
      addLog('Trade', false, 'Network error');
      toast.error('Network error');
    }
  };

  const sellAllPositions = async () => {
    if (!activeMarket || !apiKey || positions.length === 0) {
      addLog('Sell All', false, 'No positions to sell');
      return;
    }

    for (const pos of positions) {
      if (pos.shares > 0) {
        try {
          const response = await fetch('https://api.manifold.markets/v0/market/' + activeMarket.id + '/sell', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Key ${apiKey}`,
            },
            body: JSON.stringify({
              outcome: pos.outcome,
              shares: pos.shares,
            }),
          });

          const data = await response.json();
          if (response.ok) {
            addLog(`Sell ${pos.outcome}`, true, `Sold ${pos.shares.toFixed(2)} shares`);
          } else {
            addLog(`Sell ${pos.outcome}`, false, data.message || 'Failed');
          }
        } catch {
          addLog(`Sell ${pos.outcome}`, false, 'Network error');
        }
      }
    }
    fetchPositions();
    toast.success('Sold all positions');
  };

  const parseAndExecuteCommand = (input: string, forceExecute = false) => {
    const trimmed = input.trim().toUpperCase();
    
    // Pattern: {hours}/{amount}{B|S}@{price} - limit with expiration
    const limitWithExpiry = /^(\d+)\/(\d+)(B|S)@(\d+)$/;
    // Pattern: {amount}{B|S}@{price} - limit without expiration
    const limitNoExpiry = /^(\d+)(B|S)@(\d+)$/;
    // Pattern: {amount}{B|S} - market order
    const marketOrder = /^(\d+)(B|S)$/;

    let match = trimmed.match(limitWithExpiry);
    if (match) {
      const [, hours, amount, side, price] = match;
      if (autoExecute || forceExecute) {
        executeTrade(side === 'B' ? 'YES' : 'NO', parseInt(amount), parseInt(price), parseInt(hours));
        setCommandInput('');
      }
      return true;
    }

    match = trimmed.match(limitNoExpiry);
    if (match) {
      const [, amount, side, price] = match;
      // In auto-execute mode, plain limit orders require Enter
      if (forceExecute) {
        executeTrade(side === 'B' ? 'YES' : 'NO', parseInt(amount), parseInt(price));
        setCommandInput('');
      }
      return true;
    }

    match = trimmed.match(marketOrder);
    if (match) {
      const [, amount, side] = match;
      if (autoExecute || forceExecute) {
        executeTrade(side === 'B' ? 'YES' : 'NO', parseInt(amount));
        setCommandInput('');
      }
      return true;
    }

    return false;
  };

  const handleCommandChange = (value: string) => {
    setCommandInput(value);
    if (autoExecute) {
      parseAndExecuteCommand(value);
    }
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      parseAndExecuteCommand(commandInput, true);
    }
  };

  // Global hotkey handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+X to sell all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        sellAllPositions();
        return;
      }

      // Ignore if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (!activeMarket || !apiKey) return;

      const hotkey = hotkeys.find(h => h.key.toUpperCase() === e.key.toUpperCase());
      if (hotkey) {
        e.preventDefault();
        let limitPrice: number | undefined;
        
        if (hotkey.orderType === 'limit-fixed') {
          limitPrice = hotkey.limitPrice;
        } else if (hotkey.orderType === 'limit-relative') {
          const currentProb = Math.round(activeMarket.probability * 100);
          limitPrice = currentProb + (hotkey.relativeOffset || 0);
          limitPrice = Math.max(1, Math.min(99, limitPrice));
        }

        executeTrade(hotkey.side, hotkey.amount, limitPrice, hotkey.expirationHours);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, activeMarket, apiKey]);

  const addHotkey = () => {
    const newHotkey: Hotkey = {
      id: crypto.randomUUID(),
      key: '',
      side: 'YES',
      amount: 10,
      orderType: 'market',
    };
    setHotkeys([...hotkeys, newHotkey]);
  };

  const updateHotkey = (id: string, updates: Partial<Hotkey>) => {
    setHotkeys(hotkeys.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const deleteHotkey = (id: string) => {
    setHotkeys(hotkeys.filter(h => h.id !== id));
  };

  const saveYoutube = () => {
    localStorage.setItem(STORAGE_KEYS.YOUTUBE_URL, youtubeInput);
    setYoutubeUrl(youtubeInput);
    toast.success('Video saved');
  };

  const getYoutubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 p-4 font-mono">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl font-bold text-emerald-400">ManiFed Terminal</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoExecute}
                onCheckedChange={setAutoExecute}
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label className="text-sm text-gray-400">
                {autoExecute ? <Zap className="w-4 h-4 text-yellow-500" /> : 'Auto'}
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHotkeyPanel(!showHotkeyPanel)}
              className="text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel - Market & Trading */}
          <div className="lg:col-span-2 space-y-4">
            {/* API Key */}
            {!apiKey && (
              <Card className="bg-gray-900/50 border-gray-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">Manifold API Key</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter API key..."
                    className="bg-gray-800 border-gray-700 text-white font-mono"
                  />
                  <Button onClick={saveApiKey} className="bg-emerald-600 hover:bg-emerald-700">
                    Save
                  </Button>
                </div>
              </Card>
            )}

            {/* Market Search */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-lg px-3">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchMarkets(e.target.value);
                  }}
                  placeholder="Search markets..."
                  className="border-0 bg-transparent text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden z-50">
                  {searchResults.map((market) => (
                    <button
                      key={market.id}
                      onClick={() => selectMarket(market)}
                      className="w-full p-3 text-left hover:bg-gray-800 border-b border-gray-800 last:border-0"
                    >
                      <div className="text-sm text-white line-clamp-2">{market.question}</div>
                      <div className="text-xs text-emerald-400 mt-1">
                        {(market.probability * 100).toFixed(1)}%
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active Market */}
            {activeMarket ? (
              <Card className="bg-gray-900/50 border-gray-800 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isConnected ? (
                        <Wifi className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant="outline" className="text-xs border-gray-700">
                        {isConnected ? 'LIVE' : 'DISCONNECTED'}
                      </Badge>
                    </div>
                    <h2 className="text-lg text-white mb-2">{activeMarket.question}</h2>
                    <div className="text-4xl font-bold text-emerald-400">
                      {(activeMarket.probability * 100).toFixed(1)}%
                    </div>
                    {positions.length > 0 && (
                      <div className="mt-2 text-sm text-gray-400">
                        Positions: {positions.map(p => `${p.outcome}: ${p.shares.toFixed(1)}`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-gray-900/50 border-gray-800 p-8 text-center">
                <div className="text-gray-500">Search and select a market to start trading</div>
              </Card>
            )}

            {/* Command Bar */}
            <div className="relative">
              <Input
                ref={commandInputRef}
                value={commandInput}
                onChange={(e) => handleCommandChange(e.target.value)}
                onKeyDown={handleCommandKeyDown}
                placeholder={activeMarket && apiKey ? "100B = Buy YES, 100S = Buy NO, 1/100B@45 = Limit order..." : "Select a market first..."}
                disabled={!activeMarket || !apiKey}
                className="bg-gray-900 border-gray-800 text-white font-mono text-lg h-14 px-4"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                {autoExecute ? '⚡ AUTO' : '↵ ENTER'}
              </div>
            </div>

            {/* Command Reference */}
            <div className="text-xs text-gray-500 space-y-1">
              <div><span className="text-gray-400">100B</span> Buy 100M YES • <span className="text-gray-400">100S</span> Buy 100M NO</div>
              <div><span className="text-gray-400">100B@45</span> Limit YES @45% • <span className="text-gray-400">1/100B@45</span> Limit with 1h expiry</div>
              <div><span className="text-gray-400">Cmd+X</span> Sell all positions</div>
            </div>

            {/* YouTube Embed */}
            <Card className="bg-gray-900/50 border-gray-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Youtube className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-400">Embed Video</span>
              </div>
              <div className="flex gap-2 mb-3">
                <Input
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="YouTube URL..."
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <Button onClick={saveYoutube} size="sm" className="bg-red-600 hover:bg-red-700">
                  Embed
                </Button>
              </div>
              {embedUrl && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </Card>
          </div>

          {/* Right Panel - Logs & Config */}
          <div className="space-y-4">
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
                  <ScrollArea className="h-[500px] p-3">
                    {executionLogs.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-8">
                        No executions yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {executionLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`text-xs p-2 rounded border ${
                              log.success
                                ? 'border-emerald-900/50 bg-emerald-950/20'
                                : 'border-red-900/50 bg-red-950/20'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={log.success ? 'text-emerald-400' : 'text-red-400'}>
                                {log.action}
                              </span>
                              <span className="text-gray-500">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="text-gray-400">{log.details}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </TabsContent>

              <TabsContent value="hotkeys" className="mt-2">
                <Card className="bg-gray-900/50 border-gray-800 p-3">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {hotkeys.map((hotkey) => (
                        <div key={hotkey.id} className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <Input
                              value={hotkey.key}
                              onChange={(e) => updateHotkey(hotkey.id, { key: e.target.value.slice(0, 1) })}
                              placeholder="Key"
                              className="w-12 bg-gray-700 border-gray-600 text-center uppercase"
                              maxLength={1}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteHotkey(hotkey.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={hotkey.side}
                              onValueChange={(v) => updateHotkey(hotkey.id, { side: v as 'YES' | 'NO' })}
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="YES">YES</SelectItem>
                                <SelectItem value="NO">NO</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Input
                              type="number"
                              value={hotkey.amount}
                              onChange={(e) => updateHotkey(hotkey.id, { amount: parseInt(e.target.value) || 0 })}
                              placeholder="Amount"
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>

                          <Select
                            value={hotkey.orderType}
                            onValueChange={(v) => updateHotkey(hotkey.id, { orderType: v as Hotkey['orderType'] })}
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="market">Market Order</SelectItem>
                              <SelectItem value="limit-fixed">Limit (Fixed %)</SelectItem>
                              <SelectItem value="limit-relative">Limit (Relative %)</SelectItem>
                            </SelectContent>
                          </Select>

                          {hotkey.orderType === 'limit-fixed' && (
                            <Input
                              type="number"
                              value={hotkey.limitPrice || ''}
                              onChange={(e) => updateHotkey(hotkey.id, { limitPrice: parseInt(e.target.value) || undefined })}
                              placeholder="Limit price %"
                              className="bg-gray-700 border-gray-600"
                            />
                          )}

                          {hotkey.orderType === 'limit-relative' && (
                            <Input
                              type="number"
                              value={hotkey.relativeOffset || ''}
                              onChange={(e) => updateHotkey(hotkey.id, { relativeOffset: parseInt(e.target.value) || undefined })}
                              placeholder="Offset (+/- %)"
                              className="bg-gray-700 border-gray-600"
                            />
                          )}

                          {hotkey.orderType !== 'market' && (
                            <Input
                              type="number"
                              value={hotkey.expirationHours || ''}
                              onChange={(e) => updateHotkey(hotkey.id, { expirationHours: parseInt(e.target.value) || undefined })}
                              placeholder="Expiration (hours)"
                              className="bg-gray-700 border-gray-600"
                            />
                          )}
                        </div>
                      ))}
                      
                      <Button
                        onClick={addHotkey}
                        variant="outline"
                        className="w-full border-dashed border-gray-700 text-gray-400"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Hotkey
                      </Button>
                    </div>
                  </ScrollArea>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-2">
                <Card className="bg-gray-900/50 border-gray-800 p-4 space-y-4">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="bg-gray-800 border-gray-700"
                      />
                      <Button onClick={saveApiKey} size="sm" className="bg-emerald-600">
                        Save
                      </Button>
                    </div>
                  </div>
                  {apiKey && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEYS.API_KEY);
                        setApiKey('');
                        setApiKeyInput('');
                        toast.success('API key removed');
                      }}
                    >
                      Clear API Key
                    </Button>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
