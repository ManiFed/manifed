import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import trumpPortrait from '@/assets/trump-portrait.png';
import { 
  Sparkles, MessageSquare, Search, TrendingDown, TrendingUp, 
  ArrowLeft, Settings, LogOut, Loader2, Zap, Brain, Target,
  CreditCard, ArrowRight
} from 'lucide-react';

interface AIProduct {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  creditCost: number;
  route: string;
  trumpQuote: string;
}

const AI_PRODUCTS: AIProduct[] = [
  {
    id: 'arbitrage',
    name: 'Arbitrage Scanner',
    description: 'Find opposing markets with profit potential using AI semantic matching.',
    icon: <Target className="w-6 h-6 text-white" />,
    gradient: 'from-violet-500 to-purple-600',
    creditCost: 5,
    route: '/arbitrage',
    trumpQuote: '"Many people say this finds the best deals. Tremendous arbitrage opportunities!"',
  },
  {
    id: 'mispriced',
    name: 'Mispriced Markets',
    description: 'AI-powered scanner to find underpriced or overpriced prediction markets.',
    icon: <TrendingDown className="w-6 h-6 text-white" />,
    gradient: 'from-amber-500 to-orange-600',
    creditCost: 5,
    route: '/mispriced-scanner',
    trumpQuote: '"The fake news media gets probabilities wrong all the time. We find those mistakes!"',
  },
  {
    id: 'market-agent',
    name: 'Market Agent',
    description: 'Ask AI questions about any Manifold market. Get analysis and insights.',
    icon: <MessageSquare className="w-6 h-6 text-white" />,
    gradient: 'from-blue-500 to-cyan-600',
    creditCost: 1,
    route: '/market-agent',
    trumpQuote: '"Very smart AI. Knows all the markets. The best market intelligence!"',
  },
  {
    id: 'comments',
    name: 'AI Comment Maker',
    description: 'Generate and post AI-written comments on prediction markets.',
    icon: <Sparkles className="w-6 h-6 text-white" />,
    gradient: 'from-pink-500 to-rose-600',
    creditCost: 1,
    route: '/comment-maker',
    trumpQuote: '"Nobody writes comments like our AI. The best words, believe me!"',
  },
];

const CREDIT_LIMITS = {
  free: 15,
  basic: 50,
  pro: 100,
  premium: 200,
};

export default function ManiFedAI() {
  const navigate = useNavigate();
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(15);
  const [tier, setTier] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check admin status
      const { data: adminResult } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      setIsAdmin(adminResult || false);

      // Fetch subscription
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('status, mfai_credits_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (sub) {
        const userTier = sub.status || 'free';
        setTier(userTier);
        setCreditsUsed(sub.mfai_credits_used || 0);
        setCreditsLimit(CREDIT_LIMITS[userTier as keyof typeof CREDIT_LIMITS] || 15);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const creditsRemaining = isAdmin ? Infinity : creditsLimit - creditsUsed;
  const creditPercentage = isAdmin ? 0 : (creditsUsed / creditsLimit) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Trump Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-16 top-40 w-[500px] h-auto opacity-[0.05] rotate-6" />
        <img src={trumpPortrait} alt="" className="absolute -left-24 bottom-10 w-[350px] h-auto opacity-[0.03] -rotate-12 scale-x-[-1]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed AI</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">The Best AI. Tremendous!</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/hub">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Hub</span>
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Trading Tools</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            ManiFed <span className="text-gradient">AI</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The most powerful AI tools for prediction market trading. 
            The deep state doesn't want you to have this technology!
          </p>
        </div>

        {/* Credits Card */}
        <Card className="glass mb-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MFAI Credits Remaining</p>
                  <p className="text-3xl font-bold text-foreground">
                    {isAdmin ? '∞' : creditsRemaining.toLocaleString()}
                    <span className="text-lg text-muted-foreground ml-1">/ {creditsLimit}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={tier === 'premium' ? 'default' : 'secondary'} className="capitalize">
                  {isAdmin ? 'Admin (Unlimited)' : `${tier} Tier`}
                </Badge>
                {!isAdmin && tier === 'free' && (
                  <Link to="/subscription">
                    <Button variant="glow" size="sm" className="gap-2">
                      Upgrade <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            {!isAdmin && (
              <Progress value={creditPercentage} className="mt-4 h-2" />
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Credits reset monthly. Arb Scanner & Mispriced Markets cost 5 credits each. 
              Market Agent & Comment Maker cost 1 credit each.
            </p>
          </CardContent>
        </Card>

        {/* AI Products Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {AI_PRODUCTS.map((product, index) => (
            <Link key={product.id} to={product.route} className="group">
              <Card 
                className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50 animate-slide-up"
                style={{ animationDelay: `${100 + index * 50}ms` }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.gradient} flex items-center justify-center`}>
                      {product.icon}
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="w-3 h-3" />
                      {product.creditCost} credit{product.creditCost > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-primary/70 italic mb-4">{product.trumpQuote}</p>
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:border-primary group-hover:text-primary"
                    disabled={!isAdmin && creditsRemaining < product.creditCost}
                  >
                    {!isAdmin && creditsRemaining < product.creditCost ? 'Insufficient Credits' : 'Launch'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Credit Costs Table */}
        <Card className="glass mt-8 animate-slide-up" style={{ animationDelay: '350ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Credit Costs & Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Tool Costs</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Arbitrage Scanner</span>
                    <span className="text-primary font-medium">5 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Mispriced Markets</span>
                    <span className="text-primary font-medium">5 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Market Agent</span>
                    <span className="text-primary font-medium">1 credit</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Comment Maker</span>
                    <span className="text-primary font-medium">1 credit</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Monthly Limits</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Free</span>
                    <span className="font-medium">15 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Basic</span>
                    <span className="font-medium">50 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Pro</span>
                    <span className="font-medium">100 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-secondary/30">
                    <span>Premium</span>
                    <span className="font-medium">200 credits</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}