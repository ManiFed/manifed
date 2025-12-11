import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import {
  Landmark,
  TrendingUp,
  FileText,
  Coins,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  LogOut,
  Trophy,
  Activity,
  Settings,
  BarChart3,
  Loader2,
  Search,
  Sparkles,
  Store,
  CheckCircle,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

interface Bond {
  id: string;
  amount: number;
  maturity_date: string;
  total_return: number;
}

interface Profile {
  equipped_badge: string | null;
}

export default function Hub() {
  const { balance, totalInvested, isLoading: balanceLoading, fetchBalance } = useUserBalance();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loanCount, setLoanCount] = useState(0);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>('');
  const [hasVerifiedBadge, setHasVerifiedBadge] = useState(false);

  useEffect(() => {
    fetchHubData();
  }, []);

  const fetchHubData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch manifold settings
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_username, manifold_api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setHasApiKey(!!settings?.manifold_api_key);
      if (settings?.manifold_username) {
        setUsername(settings.manifold_username);
      }

      // Fetch profile for verified badge
      const { data: profile } = await supabase
        .from('profiles')
        .select('equipped_badge')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.equipped_badge) {
        // Check if user has a badge item
        const { data: badgeItem } = await supabase
          .from('market_items')
          .select('category')
          .eq('id', profile.equipped_badge)
          .maybeSingle();
        
        setHasVerifiedBadge(badgeItem?.category === 'badge');
      }

      // Fetch recent transactions
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setTransactions(transactionData || []);

      // Fetch active bonds
      const { data: bondData } = await supabase
        .from('bonds')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      setBonds(bondData || []);

      // Fetch investment count
      const { count } = await supabase
        .from('investments')
        .select('*', { count: 'exact', head: true })
        .eq('investor_user_id', user.id);

      setLoanCount(count || 0);

      // Generate notifications
      const notifs: string[] = [];
      if (bondData?.some(b => new Date(b.maturity_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))) {
        notifs.push('You have bonds maturing soon!');
      }
      if (!settings?.manifold_username) {
        notifs.push('Connect your Manifold account to start trading');
      }
      setNotifications(notifs);

      await fetchBalance();
    } catch (error) {
      console.error('Error fetching hub data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const totalValue = balance + totalInvested;
  const bondValue = bonds.reduce((sum, b) => sum + b.amount, 0);

  if (isLoading || balanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Manifold's Central Bank</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <NotificationsDropdown />
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            Welcome back{username ? `, @${username}` : ''}
            {hasVerifiedBadge && (
              <CheckCircle className="w-6 h-6 text-primary" />
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Your ManiFed dashboard
          </p>
        </div>

        {/* Portfolio Overview */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Portfolio Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-xl font-bold text-foreground">M${balance.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold text-foreground">M${(totalValue + bondValue).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">In Loans</p>
                    <p className="text-xl font-bold text-foreground">M${totalInvested.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Coins className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">In Bonds</p>
                    <p className="text-xl font-bold text-foreground">M${bondValue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Products Grid */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Products</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Loans */}
            <Link to="/marketplace" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <Badge variant="active">{loanCount} investments</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">P2P Loans</CardTitle>
                  <CardDescription>
                    Invest in peer-to-peer loans backed by Manifold Markets predictions. Earn interest on your M$.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    Go to Marketplace
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Bonds */}
            <Link to="/bonds" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary">{bonds.length} active</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Treasury Bills</CardTitle>
                  <CardDescription>
                    Fixed-income instruments with guaranteed yields. Earn 6% APY on your M$ deposits.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    Buy Bonds
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Bond Market - Now more prominent */}
            <Link to="/bond-market" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50 border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Trade
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Bond Market</CardTitle>
                  <CardDescription>
                    Buy and sell Treasury Bills from other users. Trade bonds before maturity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    Trade Bonds
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Memecoins */}
            <Link to="/memecoins" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline">AMM</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Memecoins</CardTitle>
                  <CardDescription>
                    Trade memecoins using M$. Create your own or trade in AMM-style liquidity pools.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    Trade Memecoins
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Credit Search */}
            <Link to="/credit-search" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary">Tool</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Credit Search</CardTitle>
                  <CardDescription>
                    Check creditworthiness of any Manifold user before investing in their loans.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    Search Credits
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Shop */}
            <Link to="/market" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline">
                      <Sparkles className="w-3 h-3 mr-1" />
                      New!
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">ManiFed Shop</CardTitle>
                  <CardDescription>
                    Buy verified badges, site themes, and visual effects to customize your experience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    Browse Shop
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Leaderboard */}
            <Link to="/leaderboard" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary">Rankings</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Leaderboard</CardTitle>
                  <CardDescription>
                    See who the top lenders, traders, and earners are on ManiFed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    View Rankings
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activity
              </h2>
              <Link to="/portfolio">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <Card className="glass">
              <CardContent className="p-0">
                {transactions.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {transactions.map((tx) => {
                      const isPositive = tx.type === 'deposit' || tx.type === 'repayment' || tx.type === 'loan_received' || tx.type === 'bond_maturity';
                      const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isPositive ? 'bg-success/10' : 'bg-muted'}`}>
                              <Icon className={`w-4 h-4 ${isPositive ? 'text-success' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{tx.description || tx.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className={`font-semibold ${tx.amount >= 0 ? 'text-success' : 'text-foreground'}`}>
                            {tx.amount >= 0 ? '+' : ''}M${Math.abs(tx.amount).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h2>
            <Card className="glass">
              <CardContent className="p-4">
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notif, i) => (
                      <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm text-foreground">{notif}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No new notifications</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
