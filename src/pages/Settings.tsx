import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Key, CheckCircle, AlertCircle, Loader2, ExternalLink, User } from 'lucide-react';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [manifoldUsername, setManifoldUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_manifold_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSavedApiKey(data.manifold_api_key);
        setManifoldUsername(data.manifold_username);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Manifold API key',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use edge function to validate and encrypt the API key
      const { data, error } = await supabase.functions.invoke('save-api-key', {
        body: { apiKey: apiKey.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSavedApiKey('encrypted'); // Don't store actual key client-side
      setManifoldUsername(data.username);
      setApiKey('');

      toast({
        title: 'API Key Saved',
        description: `Connected to Manifold as @${data.username}`,
      });
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: 'Failed to Save',
        description: error instanceof Error ? error.message : 'Could not verify API key',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_manifold_settings')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedApiKey(null);
      setManifoldUsername(null);

      toast({
        title: 'API Key Removed',
        description: 'Your Manifold connection has been disconnected',
      });
    } catch (error) {
      console.error('Error removing API key:', error);
      toast({
        title: 'Failed to Remove',
        description: 'Could not remove API key',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your ManiFed account and Manifold Markets integration
          </p>
        </div>

        <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Manifold Markets API Key
            </CardTitle>
            <CardDescription>
              Connect your Manifold Markets account to invest in loans with your M$ balance.
              Your API key is stored securely and used only for transactions you authorize.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedApiKey ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-success/20">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Connected to Manifold</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" />
                        @{manifoldUsername}
                      </p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRemoveApiKey}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  )}
                  Disconnect Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">How to get your API key:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to your Manifold profile</li>
                        <li>Click "Edit" on your profile</li>
                        <li>Scroll to "API key" and click refresh to generate</li>
                        <li>Copy and paste the key below</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter your Manifold API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="glow"
                    className="flex-1"
                    onClick={handleSaveApiKey}
                    disabled={isLoading || !apiKey.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Connect Account
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href="https://manifold.markets"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Manifold
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}