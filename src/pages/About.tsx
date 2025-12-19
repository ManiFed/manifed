import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Landmark, ArrowLeft, Newspaper, Info, Lightbulb, Send, Loader2, CheckCircle
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

export default function About() {
  const [news, setNews] = useState<TreasuryNewsItem[]>([]);
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

      const { data: newsData } = await supabase
        .from('treasury_news')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5);

      if (newsData) {
        setNews(newsData as TreasuryNewsItem[]);
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

      <main className="container mx-auto px-4 py-8 max-w-5xl relative z-10">
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* About Section */}
          <div className="lg:col-span-2 space-y-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <Card className="glass">
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
                  <li><strong className="text-foreground">AI Trading Tools:</strong> Arbitrage scanner, market analysis, and automated trading</li>
                  <li><strong className="text-foreground">Quester:</strong> Automated daily quest completion for passive income</li>
                  <li><strong className="text-foreground">Memecoins:</strong> Create and trade tokens on our AMM</li>
                </ul>
                <p>
                  Our mission is to make prediction markets more accessible, profitable, and fun for everyone.
                  "Many people are saying this is the best DeFi platform. Tremendous financial instruments!"
                </p>
              </CardContent>
            </Card>

            {/* News Section */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-primary" />
                  Latest News
                </CardTitle>
                <CardDescription>Official announcements from the Treasury</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : news.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No announcements yet</p>
                ) : (
                  <div className="space-y-4">
                    {news.map(item => (
                      <div key={item.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Badge variant="secondary">{format(new Date(item.published_at), 'MMM d, yyyy')}</Badge>
                        </div>
                        <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                      </div>
                    ))}
                    <Link to="/treasury" className="block">
                      <Button variant="outline" className="w-full">View All News</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Suggestion Form */}
          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Card className="glass">
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

            <Card className="glass">
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
      </main>
    </div>
  );
}