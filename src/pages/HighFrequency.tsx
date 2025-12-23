import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { ActiveMarket } from './components/ActiveMarket';
import { CommandBar } from './components/CommandBar';
import { HotkeyPanel } from './components/HotkeyPanel';
import { HotkeyVisualizer } from './components/HotkeyVisualizer';
import { ExecutionLog } from './components/ExecutionLog';
import { ApiKeyInput } from './components/ApiKeyInput';
import { YouTubeEmbed } from './components/YouTubeEmbed';
import { Activity } from 'lucide-react';

export interface Market {
  id: string;
  question: string;
  probability: number;
  url: string;
}

export interface HotkeyConfig {
  key: string;
  side: 'YES' | 'NO';
  amount: number;
  orderType: 'market' | 'limit-fixed' | 'limit-relative';
  limitPrice?: number; // for limit-fixed
  priceOffset?: number; // for limit-relative (can be negative)
  expirationHours?: number;
}

export interface LogEntry {
  timestamp: Date;
  message: string;
  success: boolean;
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [activeMarket, setActiveMarket] = useState<Market | null>(null);
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>([]);
  const [executionLog, setExecutionLog] = useState<LogEntry[]>([]);
  const [autoExecute, setAutoExecute] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [showYouTube, setShowYouTube] = useState(false);
  const [remappingIndex, setRemappingIndex] = useState<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('manifold_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedHotkeys = localStorage.getItem('manifold_hotkeys');
    if (savedHotkeys) {
      try {
        setHotkeys(JSON.parse(savedHotkeys));
      } catch (e) {
        console.error('Failed to load hotkeys', e);
      }
    }
  }, []);

  // Save hotkeys to localStorage
  useEffect(() => {
    localStorage.setItem('manifold_hotkeys', JSON.stringify(hotkeys));
  }, [hotkeys]);

  const addLogEntry = useCallback((message: string, success: boolean) => {
    setExecutionLog(prev => [{
      timestamp: new Date(),
      message,
      success
    }, ...prev].slice(0, 100)); // Keep last 100 entries
  }, []);

  const executeOrder = useCallback(async (order: {
    side: 'YES' | 'NO';
    amount: number;
    orderType: 'market' | 'limit';
    limitPrice?: number;
    expirationHours?: number;
  }) => {
    if (!activeMarket) {
      addLogEntry('No active market selected', false);
      return;
    }

    if (!apiKey) {
      addLogEntry('API key not set', false);
      return;
    }

    const orderDesc = order.orderType === 'market'
      ? `${order.side} market order: ${order.amount} mana`
      : `${order.side} limit order: ${order.amount} mana @ ${order.limitPrice}%${order.expirationHours ? ` (expires in ${order.expirationHours}h)` : ''}`;

    try {
      // Mock API call - in production, this would call Manifold Markets API
      // POST to https://api.manifold.markets/v0/bet
      const response = await fetch('https://api.manifold.markets/v0/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${apiKey}`
        },
        body: JSON.stringify({
          contractId: activeMarket.id,
          outcome: order.side,
          amount: order.amount,
          limitProb: order.limitPrice ? order.limitPrice / 100 : undefined,
          expiresAt: order.expirationHours 
            ? new Date(Date.now() + order.expirationHours * 60 * 60 * 1000).toISOString()
            : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        addLogEntry(`✓ ${orderDesc} - Filled`, true);
      } else {
        const error = await response.text();
        addLogEntry(`✗ ${orderDesc} - ${error}`, false);
      }
    } catch (error) {
      addLogEntry(`✗ ${orderDesc} - ${error instanceof Error ? error.message : 'Network error'}`, false);
    }
  }, [activeMarket, apiKey, addLogEntry]);

  const sellAllPositions = useCallback(async () => {
    if (!activeMarket) {
      addLogEntry('No active market selected', false);
      return;
    }

    if (!apiKey) {
      addLogEntry('API key not set', false);
      return;
    }

    try {
      // Mock API call - in production, this would call Manifold Markets API
      // POST to sell endpoint or calculate positions and place offsetting orders
      addLogEntry(`Selling all positions in: ${activeMarket.question}`, true);
      
      // This is a placeholder - actual implementation would:
      // 1. Fetch current positions
      // 2. Place market orders to close them
      addLogEntry(`✓ All positions sold`, true);
    } catch (error) {
      addLogEntry(`✗ Failed to sell positions - ${error instanceof Error ? error.message : 'Error'}`, false);
    }
  }, [activeMarket, apiKey, addLogEntry]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we're in remapping mode, capture the new key
      if (remappingIndex !== null) {
        e.preventDefault();
        if (e.key.length === 1 && e.key.match(/[a-z0-9]/i)) {
          const updated = [...hotkeys];
          updated[remappingIndex].key = e.key.toUpperCase();
          setHotkeys(updated);
          setRemappingIndex(null);
        } else if (e.key === 'Escape') {
          setRemappingIndex(null);
        }
        return;
      }

      // Cmd/Ctrl + X to sell all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        sellAllPositions();
        return;
      }

      // Don't trigger hotkeys if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check for hotkey matches
      const matchingHotkey = hotkeys.find(h => h.key.toLowerCase() === e.key.toLowerCase());
      if (matchingHotkey && activeMarket) {
        e.preventDefault();
        
        let limitPrice: number | undefined;
        if (matchingHotkey.orderType === 'limit-fixed') {
          limitPrice = matchingHotkey.limitPrice;
        } else if (matchingHotkey.orderType === 'limit-relative') {
          limitPrice = activeMarket.probability + (matchingHotkey.priceOffset || 0);
        }

        executeOrder({
          side: matchingHotkey.side,
          amount: matchingHotkey.amount,
          orderType: matchingHotkey.orderType === 'market' ? 'market' : 'limit',
          limitPrice,
          expirationHours: matchingHotkey.expirationHours
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hotkeys, activeMarket, executeOrder, sellAllPositions, remappingIndex]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-emerald-500" />
            <h1 className="text-xl text-gray-100">Manifold Markets Terminal</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowYouTube(!showYouTube)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm"
            >
              {showYouTube ? 'Hide' : 'Show'} YouTube
            </button>
            <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
          </div>
        </div>

        {/* Hotkey Visualizer */}
        <HotkeyVisualizer
          hotkeys={hotkeys}
          activeMarket={activeMarket}
          remappingIndex={remappingIndex}
          setRemappingIndex={setRemappingIndex}
          executeOrder={executeOrder}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Trading */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <SearchBar 
              apiKey={apiKey} 
              onSelectMarket={setActiveMarket}
            />

            {/* Active Market */}
            <ActiveMarket 
              market={activeMarket} 
              apiKey={apiKey}
            />

            {/* Command Bar */}
            <CommandBar
              apiKey={apiKey}
              activeMarket={activeMarket}
              autoExecute={autoExecute}
              setAutoExecute={setAutoExecute}
              executeOrder={executeOrder}
            />

            {/* YouTube Embed */}
            {showYouTube && (
              <YouTubeEmbed 
                url={youtubeUrl}
                setUrl={setYoutubeUrl}
              />
            )}

            {/* Execution Log */}
            <ExecutionLog entries={executionLog} />
          </div>

          {/* Right Column - Hotkeys */}
          <div>
            <HotkeyPanel
              hotkeys={hotkeys}
              setHotkeys={setHotkeys}
              activeMarket={activeMarket}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
