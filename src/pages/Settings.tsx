import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Key, CheckCircle, AlertCircle, Loader2, ExternalLink, User, Landmark, LogOut, ArrowLeft, Sun, Moon, Flag } from 'lucide-react';
import trumpPortrait from '@/assets/trump-portrait.png';

const TRUMP_LEVEL_DESCRIPTIONS: Record<number, string> = {
  0: 'No Trump. Sad!',
  1: 'Minimal Trump presence',
  2: 'Slight Trump vibes',
  3: 'Some Trump flavor',
  4: 'Moderate Trump energy',
  5: 'Balanced Trump',
  6: 'Strong Trump presence',
  7: 'Very Trump (Default)',
  8: 'Maximum Trump energy',
  9: 'Ultra MAGA Mode',
  10: 'BIGLY TRUMP - TOTAL DOMINATION!',
};

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [manifoldUsername, setManifoldUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Theme and Trump settings
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [trumpLevel, setTrumpLevel] = useState(7);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Apply theme
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch manifold settings
      const { data: manifoldData, error: manifoldError } = await supabase
        .from('user_manifold_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (manifoldError) throw manifoldError;

      if (manifoldData) {
        setSavedApiKey(manifoldData.manifold_api_key);
        setManifoldUsername(manifoldData.manifold_username);
      }

      // Fetch profile settings (theme, trump level)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('theme, trump_level')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setTheme(profileData.theme as 'dark' | 'light');
        setTrumpLevel(profileData.trump_level);
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
      const { data, error } = await supabase.functions.invoke('save-api-key', {
        body: { apiKey: apiKey.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSavedApiKey('encrypted');
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

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          theme,
          trump_level: trumpLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Preferences Saved',
        description: `Trump Level set to ${trumpLevel}. ${TRUMP_LEVEL_DESCRIPTIONS[trumpLevel]}`,
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Failed to Save',
        description: error instanceof Error ? error.message : 'Could not save preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Trump background based on trump level */}
      {trumpLevel >= 5 && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <img 
            src={trumpPortrait} 
            alt="" 
            className="absolute -right-16 top-40 w-[550px] h-auto rotate-6" 
            style={{ opacity: 0.02 + (trumpLevel * 0.01) }}
          />
          {trumpLevel >= 8 && (
            <img 
              src={trumpPortrait} 
              alt="" 
              className="absolute -left-24 bottom-10 w-[400px] h-auto -rotate-12 scale-x-[-1]" 
              style={{ opacity: 0.01 + (trumpLevel * 0.005) }}
            />
          )}
        </div>
      )}

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
              <Link to="/hub">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Hub
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

      <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your ManiFed account, appearance, and Manifold Markets integration
          </p>
        </div>

        <div className="space-y-6">
          {/* Theme and Trump Level */}
          <Card className="glass animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-primary" />
                Appearance & Trump Level
              </CardTitle>
              <CardDescription>
                Customize your ManiFed experience. More Trump = More winning!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              {/* Trump Level Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    🇺🇸 Trump Level
                  </Label>
                  <Badge variant={trumpLevel >= 7 ? 'active' : 'secondary'} className="font-bold">
                    {trumpLevel}/10
                  </Badge>
                </div>
                <Slider
                  value={[trumpLevel]}
                  onValueChange={(value) => setTrumpLevel(value[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground text-center italic">
                  {TRUMP_LEVEL_DESCRIPTIONS[trumpLevel]}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Level 0-4: Minimal Trump references and imagery</p>
                  <p>• Level 5-7: Moderate Trump flavor with quotes and backgrounds</p>
                  <p>• Level 8-10: Full MAGA mode with maximum Trump content</p>
                </div>
              </div>

              <Button 
                onClick={handleSavePreferences} 
                disabled={isSaving}
                className="w-full gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Manifold API Key */}
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

                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Why can't I disconnect?</p>
                        <p>
                          To prevent exploits where users could receive loan funds and then disconnect their account 
                          to avoid repayment, ManiFed accounts cannot be disconnected once linked.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground mb-1">Fraud Prevention Agreement</p>
                        <p className="text-muted-foreground">
                          There is an agreement between ManiFed and the Manifold Markets administrators that ensures 
                          the destruction and liquidation of the creator's personal accounts if fraud is committed.
                        </p>
                      </div>
                    </div>
                  </div>
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
        </div>
      </main>
    </div>
  );
}
