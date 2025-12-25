import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import { toast } from '@/hooks/use-toast';
import trumpPortrait from '@/assets/trump-portrait.png';
import { ArrowLeft, Settings, LogOut, Loader2, MessageSquare, ExternalLink, Send, Sparkles, RefreshCw, Check, AlertTriangle } from 'lucide-react';

interface CommentOption {
  id: string;
  content: string;
  tone: string;
}

interface MarketData {
  id: string;
  question: string;
  probability: number;
  url: string;
}

export default function CommentMaker() {
  const { balance, fetchBalance } = useUserBalance();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasWithdrawalUsername, setHasWithdrawalUsername] = useState(false);
  const [marketUrl, setMarketUrl] = useState('');
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [commentOptions, setCommentOptions] = useState<CommentOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState({ current: 0, limit: 3 });

  useEffect(() => {
    checkApiKey();
    fetchUsage();
  }, []);

  const checkApiKey = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_manifold_settings')
      .select('manifold_api_key, withdrawal_username')
      .eq('user_id', user.id)
      .maybeSingle();
    setHasApiKey(!!data?.manifold_api_key);
    setHasWithdrawalUsername(!!data?.withdrawal_username);
  };

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setUsageInfo({
          current: data.usage?.commentPosts || 0,
          limit: data.limits?.commentPosts || 3,
        });
      }
    } catch (e) {
      console.error('Error fetching usage:', e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const extractMarketSlug = (url: string): string | null => {
    const patterns = [
      /manifold\.markets\/([^\/]+)\/([^\/\?]+)/,
      /manifold\.markets\/embed\/([^\/]+)\/([^\/\?]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return `${match[1]}/${match[2]}`;
    }
    return null;
  };

  const fetchMarket = async () => {
    const slug = extractMarketSlug(marketUrl);
    if (!slug) {
      toast({ title: 'Invalid URL', description: 'Please paste a valid Manifold Markets URL', variant: 'destructive' });
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
        url: `https://manifold.markets/${slug}`,
      });
      setCommentOptions([]);
      setSelectedComment(null);
    } catch (error) {
      toast({ title: 'Failed to Load Market', description: 'Could not fetch market data.', variant: 'destructive' });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const generateComments = async () => {
    if (!marketData || !instructions.trim()) {
      toast({ title: 'Missing Info', description: 'Please load a market and provide instructions', variant: 'destructive' });
      return;
    }

    if (usageInfo.current >= usageInfo.limit) {
      toast({ 
        title: 'Limit Reached', 
        description: `You've used all ${usageInfo.limit} AI comment posts this month. Upgrade your plan for more!`, 
        variant: 'destructive' 
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('comment-maker', {
        body: { marketData, instructions, action: 'generate' },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setCommentOptions(data.options || []);
      setSelectedComment(null);
    } catch (error: any) {
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const postComment = async (commentContent: string) => {
    if (!marketData || !hasApiKey) {
      toast({ title: 'Cannot Post', description: 'Connect your Manifold API key in Settings first', variant: 'destructive' });
      return;
    }

    setIsPosting(true);
    try {
      // Increment usage first
      const { data: usageData, error: usageError } = await supabase.functions.invoke('increment-usage', {
        body: { type: 'comment_post' },
      });
      if (usageError || !usageData?.success) {
        throw new Error(usageData?.message || 'Failed to track usage');
      }

      const { data, error } = await supabase.functions.invoke('comment-maker', {
        body: { marketData, comment: commentContent, action: 'post' },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: 'Comment Posted! 🎉', description: 'The deep state has been notified of your opinions.' });
      setCommentOptions([]);
      setSelectedComment(null);
      setUsageInfo(prev => ({ ...prev, current: prev.current + 1 }));
    } catch (error: any) {
      toast({ title: 'Posting Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Trump Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-24 top-1/4 w-[600px] h-auto opacity-[0.05] rotate-6" />
        <img src={trumpPortrait} alt="" className="absolute -left-32 bottom-20 w-[400px] h-auto opacity-[0.04] -rotate-12 scale-x-[-1]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img alt="ManiFed" src="/lovable-uploads/aba42d1d-db26-419d-8f65-dc8e5c6d2339.png" className="w-10 h-10 rounded-xl object-cover" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">AI Comment Maker</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="w-3 h-3" />
                {usageInfo.current}/{usageInfo.limit} posts
              </Badge>
              <WalletPopover
                balance={balance}
                hasApiKey={hasApiKey}
                hasWithdrawalUsername={hasWithdrawalUsername}
                onBalanceChange={fetchBalance}
              />
              <Link to="/settings"><Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button></Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <Link to="/hub" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Hub
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Comment Maker
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate witty, insightful comments for any Manifold market. The deep state won't know what hit them. 🇺🇸
          </p>
        </div>

        {/* Market Input */}
        <Card className="glass mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Load a Market</CardTitle>
            <CardDescription>Paste a Manifold Markets URL to comment on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="https://manifold.markets/username/market-slug"
                value={marketUrl}
                onChange={(e) => setMarketUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMarket()}
                className="flex-1"
              />
              <Button onClick={fetchMarket} disabled={isLoadingMarket || !marketUrl.trim()}>
                {isLoadingMarket ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
              </Button>
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
                  <span className="text-primary font-semibold">{(marketData.probability * 100).toFixed(1)}% YES</span>
                </div>
                <a href={marketData.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {marketData && (
          <Card className="glass mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Comment Instructions</CardTitle>
              <CardDescription>Tell the AI what kind of comment you want</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Instructions (tone, content, style)</Label>
                <Textarea
                  placeholder="e.g., 'Bullish and confident', 'Skeptical with data-driven reasoning', 'Funny and sarcastic like Trump would say it'"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <Button onClick={generateComments} disabled={isGenerating || !instructions.trim()} className="w-full gap-2">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate 3 Comment Options
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Comment Options */}
        {commentOptions.length > 0 && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Choose Your Comment
              </CardTitle>
              <CardDescription>Pick one to post - choose wisely, patriot!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {commentOptions.map((option) => (
                <div
                  key={option.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedComment === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border/50 hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedComment(option.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-2">{option.tone}</Badge>
                      <p className="text-foreground">{option.content}</p>
                    </div>
                    {selectedComment === option.id && (
                      <Check className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              ))}
              
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={generateComments} disabled={isGenerating} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  variant="glow"
                  className="flex-1 gap-2"
                  disabled={!selectedComment || isPosting}
                  onClick={() => {
                    const selected = commentOptions.find(o => o.id === selectedComment);
                    if (selected) postComment(selected.content);
                  }}
                >
                  {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post Selected Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Warning */}
        {usageInfo.current >= usageInfo.limit && (
          <Card className="glass mt-6 border-warning/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">Monthly Limit Reached</p>
                <p className="text-sm text-muted-foreground">
                  Upgrade your subscription for more AI comment posts. The deep state is trying to silence you!
                </p>
              </div>
              <Link to="/subscription" className="shrink-0">
                <Button variant="outline" size="sm">Upgrade</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}