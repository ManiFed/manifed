import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, BarChart3, Bot, Lock, Loader2, Sparkles, Target, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HeaderWallet } from "@/components/HeaderWallet";
import { useUserBalance } from "@/hooks/useUserBalance";
import Footer from "@/components/layout/Footer";
import manifedLogo from "@/assets/manifed-logo.png";

interface FintechSubscription {
  plan_type: string;
  expires_at: string | null;
  is_active: boolean;
  is_gifted: boolean;
}

const fintechProducts = [
  {
    id: 'trading-terminal',
    title: 'Trading Terminal',
    description: "Trade with exceptional speed on real-time markets. ManiFed Fintech's flagship product.",
    icon: Target,
    path: '/terminal',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'index-funds',
    title: 'Index Funds',
    description: 'Batch trades on curated market groups. Execute diversified bets with one click.',
    icon: TrendingUp,
    path: '/fintech/index-funds',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'advanced-orders',
    title: 'Advanced Orders',
    description: 'Limit sell orders with automatic profit-taking. Set and forget your exit strategy.',
    icon: Sparkles,
    path: '/fintech/advanced-orders',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'calibration',
    title: 'Calibration Analysis',
    description: 'Analyze your prediction accuracy. Find your edge and improve your forecasting.',
    icon: BarChart3,
    path: '/fintech/calibration',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'bot-builder',
    title: 'Bot Builder',
    description: 'Create and test custom trading strategies. Backtest against historical data.',
    icon: Bot,
    path: '/fintech/bot-builder',
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'arbitrage',
    title: 'AI Arbitrage Scanner',
    description: 'AI-powered detection of mispriced correlated markets. Find guaranteed profits.',
    icon: Target,
    path: '/arbitrage',
    color: 'from-rose-500 to-red-500',
  },
];

export default function FintechMenu() {
  const navigate = useNavigate();
  const { balance, fetchBalance } = useUserBalance();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [subscription, setSubscription] = useState<FintechSubscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

      // Check API key
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      setHasApiKey(!!settings?.manifold_api_key);

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
        const isActive = subData.is_active && 
          (!subData.expires_at || new Date(subData.expires_at) > new Date());
        setHasAccess(isActive);
        
        if (!isActive) {
          navigate('/fintech');
        }
      } else {
        navigate('/fintech');
      }
    } catch (error) {
      console.error('Access check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="glass max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="font-display">Subscription Required</CardTitle>
            <CardDescription className="font-serif">
              Subscribe to ManiFed Fintech to access these tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/fintech">
              <Button className="w-full font-serif">View Plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img src={manifedLogo} alt="ManiFed" className="w-10 h-10 rounded-lg" />
              <span className="font-display text-lg font-bold text-foreground">ManiFed Fintech</span>
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </Link>
            <div className="flex items-center gap-3">
              <HeaderWallet balance={balance} hasApiKey={hasApiKey} onBalanceChange={fetchBalance} />
              <Link to="/hub">
                <Button variant="ghost" size="sm" className="gap-2 font-serif">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Fintech Tools</h1>
          <p className="font-serif text-muted-foreground">Advanced prediction market analysis and trading tools</p>
          {subscription?.expires_at && (
            <Badge variant="outline" className="mt-2 font-serif">
              {subscription.is_gifted ? 'Gifted • ' : ''}
              Expires: {new Date(subscription.expires_at).toLocaleDateString()}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {fintechProducts.map((product) => (
            <Link key={product.id} to={product.path} className="group">
              <Card className="glass h-full hover:border-accent/50 transition-all hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-3`}>
                    <product.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="font-display text-xl">{product.title}</CardTitle>
                  <CardDescription className="font-serif">{product.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full gap-2 group-hover:border-accent group-hover:text-accent">
                    Open Tool
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}