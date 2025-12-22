import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Sun, Moon, LogOut, ArrowLeft, Palette, Copy, User, Wallet } from 'lucide-react';
import manifedLogo from '@/assets/manifed-logo.png';

export default function Settings() {
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingDeposit, setIsCheckingDeposit] = useState(false);
  
  // Theme settings
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Account settings
  const [accountCode, setAccountCode] = useState<string>('');
  const [withdrawalUsername, setWithdrawalUsername] = useState<string>('');
  const [manifoldUsername, setManifoldUsername] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
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

      // Fetch user balance with account code
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('account_code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (balanceData?.account_code) {
        setAccountCode(balanceData.account_code);
      } else {
        // Generate account code if doesn't exist
        const newCode = 'MF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const { error } = await supabase
          .from('user_balances')
          .upsert({ user_id: user.id, account_code: newCode }, { onConflict: 'user_id' });
        if (!error) setAccountCode(newCode);
      }

      // Fetch manifold settings
      const { data: manifoldData } = await supabase
        .from('user_manifold_settings')
        .select('manifold_username, withdrawal_username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (manifoldData) {
        setManifoldUsername(manifoldData.manifold_username || '');
        setWithdrawalUsername(manifoldData.withdrawal_username || manifoldData.manifold_username || '');
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

      // Save theme
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          theme,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Save withdrawal username
      await supabase
        .from('user_manifold_settings')
        .upsert({
          user_id: user.id,
          withdrawal_username: withdrawalUsername,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated.',
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

  const copyAccountCode = () => {
    navigator.clipboard.writeText(accountCode);
    toast({
      title: 'Copied!',
      description: 'Account code copied to clipboard.',
    });
  };

  const handleCheckDeposit = async () => {
    setIsCheckingDeposit(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-transactions');
      if (error) throw error;
      
      toast({
        title: 'Deposit Check Complete',
        description: `Verified: ${data.results?.verified || 0}, Pending: Check your balance.`,
      });
    } catch (error) {
      console.error('Check deposit error:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check deposits',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingDeposit(false);
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
              <img src={manifedLogo} alt="ManiFed" className="w-10 h-10 rounded-lg" />
              <div className="hidden sm:block">
                <h1 className="font-display text-lg font-bold text-foreground">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Settings</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/hub">
                <Button variant="outline" size="sm" className="gap-2 font-serif">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Hub
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 font-serif">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="font-serif text-muted-foreground">
            Manage your ManiFed account and preferences
          </p>
        </div>

        <div className="space-y-6">
          {isFetching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Account ID Card */}
              <Card className="glass animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <User className="w-5 h-5 text-accent" />
                    Your Account ID
                  </CardTitle>
                  <CardDescription className="font-serif">
                    Use this code when sending M$ to ManiFed via Managram
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 rounded-lg bg-secondary font-mono text-lg font-bold text-foreground">
                      {accountCode}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyAccountCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="font-serif text-sm text-muted-foreground mb-2">
                      <strong className="text-foreground">To deposit M$:</strong>
                    </p>
                    <ol className="font-serif text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Send a Managram to <span className="font-bold text-accent">@ManiFed</span></li>
                      <li>Include your account code <span className="font-mono text-foreground">{accountCode}</span> in the message</li>
                      <li>Click the button below to verify your deposit</li>
                    </ol>
                  </div>
                  <Button 
                    onClick={handleCheckDeposit} 
                    disabled={isCheckingDeposit}
                    className="w-full gap-2 font-serif"
                  >
                    {isCheckingDeposit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Check for Deposits
                  </Button>
                </CardContent>
              </Card>

              {/* Withdrawal Username */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '50ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Wallet className="w-5 h-5 text-accent" />
                    Withdrawal Settings
                  </CardTitle>
                  <CardDescription className="font-serif">
                    Where should we send your M$ when you withdraw?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-serif">Manifold Username for Withdrawals</Label>
                    <Input
                      value={withdrawalUsername}
                      onChange={(e) => setWithdrawalUsername(e.target.value)}
                      placeholder="YourManifoldUsername"
                      className="mt-1 font-serif"
                    />
                    <p className="text-xs text-muted-foreground mt-1 font-serif">
                      When you withdraw, M$ will be sent to this Manifold account.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Appearance Settings */}
              <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Palette className="w-5 h-5 text-accent" />
                    Appearance
                  </CardTitle>
                  <CardDescription className="font-serif">
                    Customize how ManiFed looks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 font-serif">
                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        Dark Mode
                      </Label>
                      <p className="text-sm text-muted-foreground font-serif">Toggle between light and dark themes</p>
                    </div>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleSavePreferences} 
                disabled={isSaving}
                className="w-full gap-2 font-serif"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save All Settings
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}