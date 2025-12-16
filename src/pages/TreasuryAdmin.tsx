import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Landmark, Shield, TrendingUp, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BondRate {
  id: string;
  term_weeks: number;
  annual_yield: number;
  monthly_yield: number;
  effective_date: string;
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

const TERM_LABELS: Record<number, string> = {
  4: '4 Week T-Bill',
  13: '3 Month T-Bill',
  26: '6 Month T-Bill',
  52: '1 Year T-Bill',
};

export default function TreasuryAdmin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rates, setRates] = useState<BondRate[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  
  // New rate form
  const [newRate, setNewRate] = useState({ term_weeks: 4, annual_yield: 6, monthly_yield: 0.5 });
  const [isSavingRate, setIsSavingRate] = useState(false);
  
  // New news form
  const [newNews, setNewNews] = useState({ title: '', content: '' });
  const [isSavingNews, setIsSavingNews] = useState(false);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin using the has_role function
      const { data: isAdminResult, error: roleError } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError) {
        console.error('Error checking admin role:', roleError);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setIsAdmin(isAdminResult);

      if (isAdminResult) {
        // Fetch current rates
        const { data: ratesData } = await supabase
          .from('bond_rates')
          .select('*')
          .order('effective_date', { ascending: false });
        if (ratesData) setRates(ratesData);

        // Fetch news
        const { data: newsData } = await supabase
          .from('treasury_news')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(10);
        if (newsData) setNews(newsData);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRate = async () => {
    if (!newRate.annual_yield || newRate.annual_yield <= 0) {
      toast({ title: 'Invalid rate', description: 'Please enter a valid annual yield', variant: 'destructive' });
      return;
    }

    setIsSavingRate(true);
    try {
      const { error } = await supabase.from('bond_rates').insert({
        term_weeks: newRate.term_weeks,
        annual_yield: newRate.annual_yield,
        monthly_yield: newRate.annual_yield / 12,
      });

      if (error) throw error;

      toast({ title: 'Rate saved', description: `New rate for ${TERM_LABELS[newRate.term_weeks]} set to ${newRate.annual_yield}% APY` });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error saving rate:', error);
      toast({ title: 'Error', description: 'Failed to save rate', variant: 'destructive' });
    } finally {
      setIsSavingRate(false);
    }
  };

  const handlePublishNews = async () => {
    if (!newNews.title.trim() || !newNews.content.trim()) {
      toast({ title: 'Invalid news', description: 'Please enter title and content', variant: 'destructive' });
      return;
    }

    setIsSavingNews(true);
    try {
      const { error } = await supabase.from('treasury_news').insert({
        title: newNews.title,
        content: newNews.content,
      });

      if (error) throw error;

      toast({ title: 'News published', description: 'Treasury announcement has been published' });
      setNewNews({ title: '', content: '' });
      await checkAdminAndFetchData();
    } catch (error) {
      console.error('Error publishing news:', error);
      toast({ title: 'Error', description: 'Failed to publish news', variant: 'destructive' });
    } finally {
      setIsSavingNews(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    try {
      const { error } = await supabase.from('treasury_news').delete().eq('id', newsId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'News item deleted' });
      await checkAdminAndFetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="glass max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have admin privileges to access this page.</p>
            <Link to="/hub">
              <Button>Return to Hub</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <div>
                <h1 className="text-lg font-bold text-gradient">Treasury Admin</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Rate & Policy Management</p>
              </div>
            </Link>
            <Badge variant="outline" className="gap-2">
              <Shield className="w-3 h-3" />
              Admin
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-8">
          {/* Set New Rates */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Set Bond Rates
              </CardTitle>
              <CardDescription>
                Update interest rates for Treasury Bills. New rates apply to future purchases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Term</Label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newRate.term_weeks}
                    onChange={(e) => setNewRate({ ...newRate, term_weeks: parseInt(e.target.value) })}
                  >
                    <option value={4}>4 Week T-Bill</option>
                    <option value={13}>3 Month T-Bill</option>
                    <option value={26}>6 Month T-Bill</option>
                    <option value={52}>1 Year T-Bill</option>
                  </select>
                </div>
                <div>
                  <Label>Annual Yield (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={newRate.annual_yield}
                    onChange={(e) => setNewRate({ ...newRate, annual_yield: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSaveRate} disabled={isSavingRate} className="w-full gap-2">
                    {isSavingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Set Rate
                  </Button>
                </div>
              </div>

              {/* Current Rates */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Current Rates</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[4, 13, 26, 52].map(term => {
                    const rate = rates.find(r => r.term_weeks === term);
                    return (
                      <div key={term} className="p-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                        <span className="text-sm">{TERM_LABELS[term]}</span>
                        <Badge variant="secondary">{rate?.annual_yield || 6}% APY</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Publish News */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Publish Treasury News
              </CardTitle>
              <CardDescription>
                Post official announcements about rate changes, policies, or treasury updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input 
                  placeholder="Announcement title..."
                  value={newNews.title}
                  onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea 
                  placeholder="Announcement content..."
                  value={newNews.content}
                  onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                  rows={4}
                />
              </div>
              <Button onClick={handlePublishNews} disabled={isSavingNews} className="gap-2">
                {isSavingNews ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Publish Announcement
              </Button>

              {/* Recent News */}
              {news.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Recent Announcements</p>
                  <div className="space-y-2">
                    {news.map(item => (
                      <div key={item.id} className="p-3 rounded-lg bg-secondary/30 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.published_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="shrink-0"
                          onClick={() => handleDeleteNews(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
