import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Landmark, ArrowLeft, Newspaper, Info, Lightbulb, Send, Loader2, CheckCircle,
  TrendingUp, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import trumpPortrait from '@/assets/trump-portrait.png';

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

export default function About() {
  const [news, setNews] = useState<TreasuryNewsItem[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Suggestion form
  const [suggestion, setSuggestion] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);

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

  const handleSubmitSuggestion = async () => {
    if (!suggestion.title.trim() || !suggestion.description.trim()) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (!userId) {
      toast({ title: 'Error', description: 'Please sign in to submit a suggestion', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('product_suggestions').insert({
        user_id: userId,
        title: suggestion.title,
        description: suggestion.description,
      });

      if (error) throw error;

      toast({ title: 'Suggestion Submitted!', description: 'Thank you for your feedback!' });
      setSuggestion({ title: '', description: '' });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast({ title: 'Error', description: 'Failed to submit suggestion', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group rate history by date (latest only)
  const currentRates = [4, 13, 26, 52].map(term => {
    return rateHistory.find(r => r.term_weeks === term);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">About & News</p>
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

      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Hero */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Info className="w-4 h-4" />
            About ManiFed
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Making Manifold <span className="text-gradient">Great Again</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            ManiFed is a comprehensive suite of financial tools built on top of Manifold Markets.
            P2P Loans, Treasury Bonds, AI Trading Tools, and more.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - About & News */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <Card className="glass animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    What is ManiFed?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    ManiFed is a decentralized financial ecosystem built on Manifold Markets, the world's largest 
                    play-money prediction market platform. We provide tools that extend Manifold's capabilities:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong className="text-foreground">P2P Loans:</strong> Peer-to-peer lending backed by Manifold positions</li>
                    <li><strong className="text-foreground">Treasury Bonds:</strong> Fixed-income instruments with guaranteed yields</li>
                    <li><strong className="text-foreground">Arbitrage Scanner:</strong> Find mispriced markets and profit</li>
                    <li><strong className="text-foreground">Memecoins:</strong> Create and trade tokens on our AMM</li>
                  </ul>
                  <p>
                    Our mission is to make prediction markets more accessible, profitable, and fun for everyone.
                    "Many people are saying this is the best DeFi platform. Tremendous financial instruments!"
                  </p>
                </CardContent>
              </Card>

              {/* News Section */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '50ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-primary" />
                    Treasury News
                  </CardTitle>
                  <CardDescription>Official announcements from the Treasury</CardDescription>
                </CardHeader>
                <CardContent>
                  {news.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No announcements yet</p>
                  ) : (
                    <div className="space-y-4">
                      {news.map((item, index) => (
                        <div 
                          key={item.id} 
                          className="p-4 rounded-lg bg-secondary/30 border border-border/50 animate-slide-up"
                          style={{ animationDelay: `${100 + index * 50}ms` }}
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(item.published_at), 'MMMM d, yyyy')}
                          </div>
                          <h3 className="font-medium text-foreground mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Rates & Suggestions */}
            <div className="space-y-6">
              {/* Current Rates */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Current Bond Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[4, 13, 26, 52].map((term) => {
                      const rate = rateHistory.find(r => r.term_weeks === term);
                      return (
                        <div key={term} className="p-3 rounded-lg bg-primary/10 text-center">
                          <p className="text-xs text-muted-foreground mb-1">{TERM_LABELS[term]}</p>
                          <p className="text-lg font-bold text-primary">
                            {rate?.annual_yield || 6}%
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Suggestion Form */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '150ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Suggest a Product
                  </CardTitle>
                  <CardDescription>
                    Have an idea for a new feature? Let us know!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
                      <h3 className="font-medium text-foreground mb-2">Thank You!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your suggestion has been submitted. We'll review it soon!
                      </p>
                      <Button variant="outline" onClick={() => setSubmitted(false)}>
                        Submit Another
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Product Title</Label>
                        <Input 
                          placeholder="e.g., Options Trading"
                          value={suggestion.title}
                          onChange={(e) => setSuggestion({ ...suggestion, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea 
                          placeholder="Describe your idea and how it would help traders..."
                          value={suggestion.description}
                          onChange={(e) => setSuggestion({ ...suggestion, description: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <Button 
                        className="w-full gap-2" 
                        onClick={handleSubmitSuggestion}
                        disabled={isSubmitting || !isAuthenticated}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Submit Suggestion
                      </Button>
                      {!isAuthenticated && (
                        <p className="text-xs text-muted-foreground text-center">
                          <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to submit a suggestion
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>For support or inquiries, reach out on Manifold Markets or Discord.</p>
                  <p className="text-xs italic text-primary/70">
                    "We have the best customer service. Everyone says so!"
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
