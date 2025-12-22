import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import { WalletPopover } from '@/components/WalletPopover';
import { DonationButton } from '@/components/DonationButton';
import trumpPortrait from '@/assets/trump-portrait.png';
import { Landmark, TrendingUp, FileText, Coins, Wallet, ArrowUpRight, ArrowDownRight, Bell, LogOut, Trophy, Activity, Settings, BarChart3, Loader2, Search, Sparkles, Store, CheckCircle, MoreHorizontal, ChevronDown, MessageSquare, Target } from 'lucide-react';

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
  const {
    balance,
    totalInvested,
    isLoading: balanceLoading,
    fetchBalance
  } = useUserBalance();
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
      
      // Fetch profile for verified badge - continued
      if (profile?.equipped_badge) {
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Ultra Trump Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img src={trumpPortrait} alt="" className="absolute -right-16 top-40 w-[550px] h-auto opacity-[0.06] rotate-6" />
        <img src={trumpPortrait} alt="" className="absolute -left-24 bottom-10 w-[400px] h-auto opacity-[0.04] -rotate-12 scale-x-[-1]" />
        <img src={trumpPortrait} alt="" className="absolute right-1/4 top-3/4 w-[200px] h-auto opacity-[0.025] rotate-45" />
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img alt="ManiFed" className="w-10 h-10 rounded-xl object-cover border-2 border-primary/50" src="/lovable-uploads/aba42d1d-db26-419d-8f65-dc8e5c6d2339.png" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Making Manifold Great Again</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <div className="relative">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                </div>
              )}
              <DonationButton />
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

      <main className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Welcome */}
        <div className="mb-8 animate-slide-up relative">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              Welcome back{username ? `, @${username}` : ''}
              {hasVerifiedBadge}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Your ManiFed dashboard - The deep state doesn't want you to see these gains! 📈
          </p>
          <p className="text-xs text-primary/70 mt-1 italic">"Many people are saying this is the best financial dashboard. Tremendous!" — DJT</p>
          <img alt="Signature" className="h-10 mt-2 opacity-70" src="/lovable-uploads/d5dd0dd7-cef1-46ac-8a1e-e2f260144ec8.png" />
        </div>

        {/* Portfolio Overview */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Portfolio Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            {/* P2P Loans */}
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
                    Invest in peer-to-peer loans backed by Manifold Markets predictions.
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

            {/* Treasury Bonds */}
            <Link to="/bonds" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="active">{bonds.length} active</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Treasury Bonds</CardTitle>
                  <CardDescription>
                    Fixed-income instruments with guaranteed yields. Earn 6% APY on your M$ deposits.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    View Bonds
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            {/* Arbitrage Scanner */}
            <Link to="/public-arbitrage" className="group">
              <Card className="glass h-full hover:bg-card/90 transition-all hover:-translate-y-1 group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="active">Free</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Arbitrage Scanner</CardTitle>
                  <CardDescription>
                    Admin-verified arbitrage opportunities. Execute with your own API key.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:border-primary group-hover:text-primary">
                    View Opportunities
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>


            {/* Miscellaneous */}
            <Collapsible>
              <Card className="glass h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center">
                      <MoreHorizontal className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary">More</Badge>
                  </div>
                  <CardTitle className="text-xl mt-4">Miscellaneous</CardTitle>
                  <CardDescription>
                    Additional tools and features.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      View Options
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-3">
                    <Link to="/credit-search" className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Search className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm">Credit Search</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Check creditworthiness of any Manifold user.</p>
                    </Link>
                    
                    <Link to="/leaderboard" className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm">Leaderboard</span>
                      </div>
                      <p className="text-xs text-muted-foreground">See top lenders, traders, and earners.</p>
                    </Link>

                    <Link to="/treasury" className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Landmark className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm">Treasury News</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Official announcements and treasury updates.</p>
                    </Link>

                    <Link to="/about" className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm">About ManiFed</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Learn about our platform and mission.</p>
                    </Link>

                    <div className="p-3 rounded-lg bg-secondary/30 opacity-60">
                      <div className="flex items-center gap-2 mb-1">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground text-sm">ManiFed Shop</span>
                        <Badge variant="secondary" className="text-xs">Soon</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Buy verified badges and site themes.</p>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
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
                    {transactions.map(tx => {
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
