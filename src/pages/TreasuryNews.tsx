import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Landmark, 
  Newspaper, 
  ArrowLeft,
  TrendingUp,
  Calendar,
  Loader2,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TreasuryNewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

interface RateHistoryItem {
  id: string;
  term_weeks: number;
  annual_yield: number;
  monthly_yield: number;
  effective_date: string;
}

const TERM_LABELS: Record<number, string> = {
  4: '4 Week',
  13: '13 Week',
  26: '26 Week',
  52: '52 Week',
};

export default function TreasuryNews() {
  const [news, setNews] = useState<TreasuryNewsItem[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Fetch news
      const { data: newsData } = await supabase
        .from('treasury_news')
        .select('*')
        .order('published_at', { ascending: false });

      if (newsData) {
        setNews(newsData as TreasuryNewsItem[]);
      }

      // Fetch rate history
      const { data: ratesData } = await supabase
        .from('bond_rates')
        .select('*')
        .order('effective_date', { ascending: false });

      if (ratesData) {
        setRateHistory(ratesData as RateHistoryItem[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group rate history by date
  const groupedRates = rateHistory.reduce((acc, rate) => {
    const date = format(new Date(rate.effective_date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(rate);
    return acc;
  }, {} as Record<string, RateHistoryItem[]>);

  return (
    <div className="min-h-screen">
      {/* Header - Links to hub if authenticated, landing otherwise */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed Treasury</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">News & Rates</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to={isAuthenticated ? "/hub" : "/"}>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  {isAuthenticated ? 'Back to Hub' : 'Back to Home'}
                </Button>
              </Link>
              {!isAuthenticated && (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button variant="glow" size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Newspaper className="w-4 h-4" />
            Official Communications
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            News from the <span className="text-gradient">Treasury</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Official announcements, rate changes, and updates from ManiFed's Treasury department.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* News Column */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                Announcements
              </h2>

              {news.length === 0 ? (
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No announcements yet</p>
                  </CardContent>
                </Card>
              ) : (
                news.map((item, index) => (
                  <Card 
                    key={item.id} 
                    className="glass animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(item.published_at), 'MMMM d, yyyy')}
                      </div>
                      <CardTitle>{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Rate History Column */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Rate History
              </h2>

              <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Historical Rates</CardTitle>
                  <CardDescription>
                    Treasury Bill rate changes over time
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(groupedRates).length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No rate history available</p>
                  ) : (
                    Object.entries(groupedRates).map(([date, rates]) => (
                      <div key={date} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(date), 'MMM d, yyyy')}
                        </p>
                        <div className="space-y-1">
                          {rates.map((rate) => (
                            <div 
                              key={rate.id} 
                              className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30"
                            >
                              <span className="text-muted-foreground">
                                {TERM_LABELS[rate.term_weeks]} T-Bill
                              </span>
                              <Badge variant="outline">{rate.annual_yield}% APY</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Current Rates Summary */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Current Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[4, 13, 26, 52].map((term) => {
                      const currentRate = rateHistory.find(r => r.term_weeks === term);
                      return (
                        <div key={term} className="p-3 rounded-lg bg-primary/10 text-center">
                          <p className="text-xs text-muted-foreground mb-1">{TERM_LABELS[term]}</p>
                          <p className="text-lg font-bold text-primary">
                            {currentRate?.annual_yield || 6}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}