import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import {
  Landmark,
  Trophy,
  TrendingUp,
  Coins,
  Medal,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  value: number;
  metric: string;
}

export default function Leaderboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [lenders, setLenders] = useState<LeaderboardEntry[]>([]);
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [earners, setEarners] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch top lenders (by total invested in loans)
      const { data: investmentsData } = await supabase
        .from('investments')
        .select('investor_username, amount')
        .order('amount', { ascending: false });

      if (investmentsData) {
        const lenderMap = new Map<string, number>();
        investmentsData.forEach(inv => {
          const current = lenderMap.get(inv.investor_username) || 0;
          lenderMap.set(inv.investor_username, current + Number(inv.amount));
        });
        
        const sortedLenders = Array.from(lenderMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map((entry, index) => ({
            rank: index + 1,
            username: entry[0],
            value: entry[1],
            metric: 'M$ invested',
          }));
        setLenders(sortedLenders);
      }

      // Fetch top traders (by memecoin trading volume)
      const { data: tradesData } = await supabase
        .from('memecoin_trades')
        .select('user_id, mana_amount, trade_type');

      if (tradesData) {
        const traderMap = new Map<string, number>();
        tradesData.forEach(trade => {
          const current = traderMap.get(trade.user_id) || 0;
          // Calculate profit: sells add, buys subtract
          const amount = trade.trade_type === 'sell' ? Number(trade.mana_amount) : -Number(trade.mana_amount);
          traderMap.set(trade.user_id, current + amount);
        });
        
        // Get usernames for traders
        const userIds = Array.from(traderMap.keys());
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);
        
        const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username || 'Anonymous']) || []);
        
        const sortedTraders = Array.from(traderMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map((entry, index) => ({
            rank: index + 1,
            username: usernameMap.get(entry[0]) || 'Anonymous',
            value: entry[1],
            metric: 'M$ profit',
          }));
        setTraders(sortedTraders);
      }

      // Fetch top earners (by bond returns)
      const { data: bondsData } = await supabase
        .from('bonds')
        .select('user_id, total_return, amount')
        .eq('status', 'matured');

      if (bondsData) {
        const earnerMap = new Map<string, number>();
        bondsData.forEach(bond => {
          const current = earnerMap.get(bond.user_id) || 0;
          earnerMap.set(bond.user_id, current + (Number(bond.total_return) - Number(bond.amount)));
        });
        
        // Get usernames
        const userIds = Array.from(earnerMap.keys());
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds);
        
        const usernameMap = new Map(profiles?.map(p => [p.user_id, p.username || 'Anonymous']) || []);
        
        const sortedEarners = Array.from(earnerMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map((entry, index) => ({
            rank: index + 1,
            username: usernameMap.get(entry[0]) || 'Anonymous',
            value: entry[1],
            metric: 'M$ earned',
          }));
        setEarners(sortedEarners);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-yellow-500">🥇</span>;
      case 2:
        return <span className="text-gray-400">🥈</span>;
      case 3:
        return <span className="text-amber-700">🥉</span>;
      default:
        return <span className="text-muted-foreground font-medium">{rank}</span>;
    }
  };

  const LeaderboardList = ({ entries }: { entries: LeaderboardEntry[] }) => (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No data yet. Be the first!
        </div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
              entry.rank <= 3 ? 'bg-primary/10' : 'bg-secondary/30'
            } hover:bg-secondary/50`}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-lg">
                {getRankIcon(entry.rank)}
              </div>
              <div>
                <p className="font-medium text-foreground">@{entry.username}</p>
                <p className="text-xs text-muted-foreground">{entry.metric}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">M${entry.value.toLocaleString()}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
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
                <p className="text-xs text-muted-foreground -mt-0.5">Leaderboard</p>
              </div>
            </Link>

            <Link to="/hub">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            Community Rankings
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            <span className="text-gradient">Leaderboard</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Top performers across ManiFed products
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Tabs defaultValue="lenders">
              <CardHeader>
                <TabsList className="w-full">
                  <TabsTrigger value="lenders" className="flex-1 gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Lenders
                  </TabsTrigger>
                  <TabsTrigger value="traders" className="flex-1 gap-2">
                    <Coins className="w-4 h-4" />
                    Top Traders
                  </TabsTrigger>
                  <TabsTrigger value="earners" className="flex-1 gap-2">
                    <Medal className="w-4 h-4" />
                    Top Earners
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="lenders" className="mt-0">
                  <LeaderboardList entries={lenders} />
                </TabsContent>
                <TabsContent value="traders" className="mt-0">
                  <LeaderboardList entries={traders} />
                </TabsContent>
                <TabsContent value="earners" className="mt-0">
                  <LeaderboardList entries={earners} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
          Leaderboard updates in real-time based on platform activity.
        </p>
      </main>
    </div>
  );
}