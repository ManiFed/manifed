import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Sun, Moon, Landmark, LogOut, ArrowLeft, Palette } from 'lucide-react';

export default function Settings() {
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Theme settings
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

      // Fetch profile settings (theme)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('theme')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setTheme(profileData.theme as 'dark' | 'light');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsFetching(false);
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
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Preferences Saved',
        description: 'Your settings have been updated.',
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
                <p className="text-xs text-muted-foreground -mt-0.5">Settings</p>
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your ManiFed account and appearance preferences
          </p>
        </div>

        <div className="space-y-6">
          {isFetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Appearance Settings */}
              <Card className="glass animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize how ManiFed looks
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

              {/* How Transactions Work */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '50ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">How Transactions Work</CardTitle>
                  <CardDescription>
                    ManiFed uses a secure transaction code system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Instead of storing your API key, ManiFed generates unique transaction codes for each operation.
                    Here's how it works:
                  </p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>When you want to invest in a loan or buy a bond, you'll receive a unique code (e.g., <span className="font-mono text-primary">mfab12cd34</span>)</li>
                    <li>Go to Manifold Markets and send the exact amount to <span className="font-bold text-primary">@ManiFed</span></li>
                    <li>Include the transaction code in your message</li>
                    <li>ManiFed verifies and processes your transaction within 10 minutes</li>
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    This system ensures your API key is never stored on our servers while still enabling seamless transactions.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
