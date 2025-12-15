import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import { toast } from '@/hooks/use-toast';
import trumpPortrait from '@/assets/trump-portrait.png';
import { ArrowLeft, Settings, LogOut, Loader2, MessageSquare, ExternalLink, Send, Trash2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MarketData {
  id: string;
  question: string;
  probability: number;
  volume: number;
  liquidity: number;
  createdTime: number;
  closeTime?: number;
  description?: string;
  creatorUsername: string;
  url: string;
}

export default function MarketAgent() {
  const { balance, fetchBalance } = useUserBalance();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [marketUrl, setMarketUrl] = useState('');
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const extractMarketSlug = (url: string): string | null => {
    // Handle various Manifold URL formats
    const patterns = [
      /manifold\.markets\/([^\/]+)\/([^\/\?]+)/,
      /manifold\.markets\/embed\/([^\/]+)\/([^\/\?]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }
    return null;
  };

  const fetchMarket = async () => {
    const slug = extractMarketSlug(marketUrl);
    if (!slug) {
      toast({
        title: 'Invalid URL',
        description: 'Please paste a valid Manifold Markets URL',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingMarket(true);
    try {
      const response = await fetch(`https://api.manifold.markets/v0/slug/${slug.split('/')[1]}`);
      if (!response.ok) throw new Error('Market not found');
      
      const data = await response.json();
      setMarketData({
        id: data.id,
        question: data.question,
        probability: data.probability,
        volume: data.volume || 0,
        liquidity: data.totalLiquidity || 0,
        createdTime: data.createdTime,
        closeTime: data.closeTime,
        description: data.textDescription || data.description,
        creatorUsername: data.creatorUsername,
        url: `https://manifold.markets/${slug}`,
      });
      setMessages([]);
      toast({
        title: 'Market Loaded',
        description: `Now ask questions about: ${data.question.slice(0, 50)}...`,
      });
    } catch (error) {
      console.error('Error fetching market:', error);
      toast({
        title: 'Failed to Load Market',
        description: 'Could not fetch market data. Check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const askQuestion = async () => {
    if (!inputMessage.trim() || !marketData) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsAsking(true);

    try {
      const { data, error } = await supabase.functions.invoke('market-agent', {
        body: {
          marketData,
          question: userMessage,
          conversationHistory: messages,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: 'AI Error',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });
      // Remove the user message if we failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsAsking(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setMarketData(null);
    setMarketUrl('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ultra Trump Background - Portraits only */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-24 top-1/4 w-[600px] h-auto opacity-[0.05] rotate-6" />
        <img src={trumpPortrait} alt="" className="absolute -left-32 bottom-20 w-[400px] h-auto opacity-[0.04] -rotate-12 scale-x-[-1]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img
                alt="ManiFed"
                src="/lovable-uploads/aba42d1d-db26-419d-8f65-dc8e5c6d2339.png"
                className="w-10 h-10 rounded-xl object-cover border-primary/50 border-0"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Market Agent</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <WalletPopover balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <Link to="/hub" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Hub
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Market Agent
          </h1>
          <p className="text-muted-foreground mt-2">
            Paste a Manifold market link and ask AI questions about it.
          </p>
        </div>

        {/* Market Input */}
        <Card className="glass mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Load a Market</CardTitle>
            <CardDescription>Paste a Manifold Markets URL to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="https://manifold.markets/username/market-slug"
                  value={marketUrl}
                  onChange={(e) => setMarketUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMarket()}
                />
              </div>
              <Button onClick={fetchMarket} disabled={isLoadingMarket || !marketUrl.trim()}>
                {isLoadingMarket ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Load'
                )}
              </Button>
              {marketData && (
                <Button variant="outline" onClick={clearConversation}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Info */}
        {marketData && (
          <Card className="glass mb-6 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-2">{marketData.question}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="text-primary font-semibold">
                      {(marketData.probability * 100).toFixed(1)}% YES
                    </span>
                    <span>Vol: M${marketData.volume.toLocaleString()}</span>
                    <span>Liq: M${marketData.liquidity.toFixed(0)}</span>
                    <span>by @{marketData.creatorUsername}</span>
                  </div>
                </div>
                <a
                  href={marketData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline shrink-0"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Interface */}
        {marketData && (
          <Card className="glass">
            <CardContent className="p-4">
              {/* Messages */}
              <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Ask anything about this market!</p>
                    <p className="text-sm mt-1">e.g., "What are the key factors?", "Is this a good bet?"</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/50 text-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <Textarea
                  placeholder="Ask a question about this market..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      askQuestion();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                />
                <Button
                  onClick={askQuestion}
                  disabled={isAsking || !inputMessage.trim()}
                  className="shrink-0"
                >
                  {isAsking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
