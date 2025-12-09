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

// Mock data for demo - in production, aggregate from database
const MOCK_LENDERS: LeaderboardEntry[] = [
  { rank: 1, username: 'TopLender', value: 50000, metric: 'M$ invested' },
  { rank: 2, username: 'ManaKing', value: 35000, metric: 'M$ invested' },
  { rank: 3, username: 'PredictPro', value: 28000, metric: 'M$ invested' },
  { rank: 4, username: 'BetMaster', value: 22000, metric: 'M$ invested' },
  { rank: 5, username: 'YieldFarmer', value: 18000, metric: 'M$ invested' },
];

const MOCK_TRADERS: LeaderboardEntry[] = [
  { rank: 1, username: 'MemeLord', value: 15000, metric: 'M$ profit' },
  { rank: 2, username: 'CoinHunter', value: 8500, metric: 'M$ profit' },
  { rank: 3, username: 'DiamondHands', value: 6200, metric: 'M$ profit' },
  { rank: 4, username: 'SwingTrader', value: 4100, metric: 'M$ profit' },
  { rank: 5, username: 'Mooner', value: 2800, metric: 'M$ profit' },
];

const MOCK_EARNERS: LeaderboardEntry[] = [
  { rank: 1, username: 'SafeYield', value: 12000, metric: 'M$ earned' },
  { rank: 2, username: 'BondMaster', value: 9500, metric: 'M$ earned' },
  { rank: 3, username: 'InterestPro', value: 7800, metric: 'M$ earned' },
  { rank: 4, username: 'CompoundFan', value: 5200, metric: 'M$ earned' },
  { rank: 5, username: 'YieldSeeker', value: 3600, metric: 'M$ earned' },
];

export default function Leaderboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [lenders, setLenders] = useState(MOCK_LENDERS);
  const [traders, setTraders] = useState(MOCK_TRADERS);
  const [earners, setEarners] = useState(MOCK_EARNERS);

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
      {entries.map((entry) => (
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
      ))}
    </div>
  );

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
          Leaderboard updates daily. Rankings based on all-time performance.
        </p>
      </main>
    </div>
  );
}
