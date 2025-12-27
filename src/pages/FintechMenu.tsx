import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserBalance } from "@/hooks/useUserBalance";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import Footer from "@/components/layout/Footer";
import { 
  Lock, Loader2, ArrowRight, Terminal, BarChart3, 
  Sliders, Activity, Bot, Target, Sparkles, Clock, Gift
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FintechSubscription {
  plan_type: string;
  expires_at: string | null;
  is_active: boolean;
  is_gifted: boolean;
  is_trial?: boolean;
  trial_ends_at?: string | null;
}

const fintechProducts = [
  {
    id: 'trading-terminal',
    title: 'Trading Terminal',
    description: "Trade with exceptional speed on real-time markets. ManiFed Fintech's flagship product.",
    path: '/terminal',
    icon: Terminal,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'index-funds',
    title: 'Index Funds',
    description: 'Batch trades on curated market groups. Execute diversified bets with one click.',
    path: '/fintech/index-funds',
    icon: BarChart3,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'advanced-orders',
    title: 'Advanced Orders',
    description: 'Limit sell orders with automatic profit-taking. Set and forget your exit strategy.',
    path: '/fintech/advanced-orders',
    icon: Sliders,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'calibration',
    title: 'Calibration Analysis',
    description: 'Analyze your prediction accuracy. Find your edge and improve your forecasting.',
    path: '/fintech/calibration',
    icon: Activity,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    id: 'bot-builder',
    title: 'Bot Builder',
    description: 'Create and test custom trading strategies. Backtest against historical data.',
    path: '/fintech/bot-builder',
    icon: Bot,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'arbitrage',
    title: 'Arbitrage Opportunities',
    description: 'View admin-verified arbitrage opportunities on correlated markets.',
    path: '/fintech/arbitrage',
    icon: Target,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

export default function FintechMenu() {
  const navigate = useNavigate();
  const { balance, fetchBalance } = useUserBalance();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasWithdrawalUsername, setHasWithdrawalUsername] = useState(false);
  const [subscription, setSubscription] = useState<FintechSubscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth?redirect=/fintech');
        return;
      }

      // Check API key + withdrawal username (used by wallet)
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key, withdrawal_username')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasApiKey(!!settings?.manifold_api_key);
      setHasWithdrawalUsername(!!settings?.withdrawal_username);

      // Check if admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setIsAdmin(true);
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Check subscription
      const { data: subData } = await supabase
        .from('fintech_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData);
        setHasUsedTrial(!!subData.trial_ends_at);
        
        // Check if trial is active
        if (subData.is_trial && subData.trial_ends_at) {
          const trialActive = new Date(subData.trial_ends_at) > new Date();
          if (trialActive) {
            setHasAccess(true);
            setIsLoading(false);
            return;
          }
        }
        
        const isActive = subData.is_active && 
          (!subData.expires_at || new Date(subData.expires_at) > new Date());
        setHasAccess(isActive);
        
        if (!isActive) {
          // Don't redirect, show subscription required view
        }
      } else {
        // No subscription at all - show subscription required
      }
    } catch (error) {
      console.error('Access check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startFreeTrial = async () => {
    setIsStartingTrial(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-fintech-trial');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: 'Trial Started!',
        description: 'Enjoy 7 days of free access to ManiFed Fintech.',
      });
      
      setHasAccess(true);
      setHasUsedTrial(true);
      checkAccess();
    } catch (error) {
      console.error('Trial start error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start trial',
        variant: 'destructive',
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <UniversalHeader />
        
        <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center mb-12 animate-slide-up">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              ManiFed Fintech
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Premium trading tools for prediction market professionals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Free Trial Card */}
            {!hasUsedTrial && (
              <Card className="border-primary/50 bg-primary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-primary" />
                    <Badge variant="secondary">New User Offer</Badge>
                  </div>
                  <CardTitle className="text-2xl">7-Day Free Trial</CardTitle>
                  <CardDescription>
                    Get full access to all Fintech tools. No payment required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      Trading Terminal with hotkeys
                    </li>
                    <li className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Index Funds & batch trading
                    </li>
                    <li className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      AI-verified arbitrage opportunities
                    </li>
                  </ul>
                  <Button 
                    onClick={startFreeTrial} 
                    disabled={isStartingTrial}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isStartingTrial ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Gift className="w-4 h-4" />
                    )}
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Subscribe Card */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <Badge variant="outline">Monthly</Badge>
                </div>
                <CardTitle className="text-2xl">Subscribe</CardTitle>
                <CardDescription>
                  Full access with Manifold mana payment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-4">
                  M$2,500<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <Link to="/fintech">
                  <Button variant="outline" className="w-full gap-2" size="lg">
                    View Plans
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {fintechProducts.slice(0, 6).map((product) => (
              <Card key={product.id} className="border-border/30 bg-card/50">
                <CardContent className="p-4 text-center">
                  <div className={`w-10 h-10 rounded-lg ${product.bgColor} flex items-center justify-center mx-auto mb-3`}>
                    <product.icon className={`w-5 h-5 ${product.color}`} />
                  </div>
                  <p className="text-sm font-medium text-foreground">{product.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero */}
        <div className="mb-16 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
              Fintech Tools
            </h1>
            {isAdmin && <Badge variant="secondary">Admin</Badge>}
          </div>
          <p className="text-xl text-muted-foreground max-w-xl">
            Advanced prediction market analysis and trading tools.
          </p>
          {subscription?.is_trial && subscription?.trial_ends_at && (
            <Badge variant="outline" className="mt-3 gap-2">
              <Gift className="w-3 h-3" />
              Trial expires: {new Date(subscription.trial_ends_at).toLocaleDateString()}
            </Badge>
          )}
          {subscription?.expires_at && !subscription?.is_trial && (
            <Badge variant="outline" className="mt-3">
              {subscription.is_gifted ? 'Gifted • ' : ''}
              Expires: {new Date(subscription.expires_at).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Products Grid */}
        <section className="animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-lg font-semibold text-muted-foreground mb-6 uppercase tracking-widest">
            Tools
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fintechProducts.map((product, index) => (
              <Link 
                key={product.id} 
                to={product.path} 
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="h-full border-border/50 hover:border-primary/50 transition-all duration-300 group-hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${product.bgColor} flex items-center justify-center`}>
                        <product.icon className={`w-6 h-6 ${product.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">{product.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">
                      {product.description}
                    </p>
                    <div className={`flex items-center gap-2 ${product.color} font-medium`}>
                      Open Tool
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
