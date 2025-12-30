import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
}

interface ManualLoan {
  id: string;
  description: string;
  amount: number;
  is_liability: boolean;
  created_at: string;
}

export default function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Financial data
  const [balance, setBalance] = useState(0);
  const [bondValue, setBondValue] = useState(0);
  const [loanInvestments, setLoanInvestments] = useState(0);
  const [liabilities, setLiabilities] = useState(0);
  const [manualLoans, setManualLoans] = useState<ManualLoan[]>([]);
  const [newLoanDesc, setNewLoanDesc] = useState('');
  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [newLoanIsLiability, setNewLoanIsLiability] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        setIsLoading(false);
        return;
      }

      setIsOwner(user?.id === targetUserId);

      // Fetch profile
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (!profileData && user?.id === targetUserId) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({ user_id: targetUserId })
          .select()
          .single();
        profileData = newProfile;
      }

      if (profileData) {
        setProfile(profileData as Profile);
        setNewUsername(profileData.username || '');
      }

      // Fetch financial data
      const { data: balanceData } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', targetUserId)
        .maybeSingle();
      setBalance(balanceData?.balance || 0);

      // Fetch bonds
      const { data: bonds } = await supabase
        .from('bonds')
        .select('amount')
        .eq('user_id', targetUserId)
        .eq('status', 'active');
      const totalBonds = bonds?.reduce((sum, b) => sum + b.amount, 0) || 0;
      setBondValue(totalBonds);

      // Fetch loan investments
      const { data: investments } = await supabase
        .from('investments')
        .select('amount')
        .eq('investor_user_id', targetUserId);
      const totalInvested = investments?.reduce((sum, i) => sum + i.amount, 0) || 0;
      setLoanInvestments(totalInvested);

      // Fetch loans where user is borrower (liabilities)
      const { data: userLoans } = await supabase
        .from('loans')
        .select('funded_amount')
        .eq('borrower_user_id', targetUserId)
        .in('status', ['active', 'funding']);
      const totalLiabilities = userLoans?.reduce((sum, l) => sum + l.funded_amount, 0) || 0;
      setLiabilities(totalLiabilities);

      // Manual loans stored in localStorage
      const stored = localStorage.getItem(`manual_loans_${targetUserId}`);
      if (stored) {
        setManualLoans(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      setProfile({ ...profile, username: newUsername });
      setIsEditing(false);
      toast({ title: 'Username updated!' });
    } catch (error) {
      toast({ title: 'Failed to update username', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const addManualLoan = () => {
    if (!newLoanDesc || !newLoanAmount || !profile) return;
    const loan: ManualLoan = {
      id: crypto.randomUUID(),
      description: newLoanDesc,
      amount: parseFloat(newLoanAmount),
      is_liability: newLoanIsLiability,
      created_at: new Date().toISOString(),
    };
    const updated = [...manualLoans, loan];
    setManualLoans(updated);
    localStorage.setItem(`manual_loans_${profile.user_id}`, JSON.stringify(updated));
    setNewLoanDesc('');
    setNewLoanAmount('');
    toast({ title: 'Loan added' });
  };

  const removeManualLoan = (id: string) => {
    if (!profile) return;
    const updated = manualLoans.filter(l => l.id !== id);
    setManualLoans(updated);
    localStorage.setItem(`manual_loans_${profile.user_id}`, JSON.stringify(updated));
  };

  // Calculate net worth
  const manualAssets = manualLoans.filter(l => !l.is_liability).reduce((sum, l) => sum + l.amount, 0);
  const manualLiabilities = manualLoans.filter(l => l.is_liability).reduce((sum, l) => sum + l.amount, 0);
  const netWorth = balance + bondValue + loanInvestments + manualAssets - liabilities - manualLiabilities;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <span className="text-lg font-bold text-gradient">ManiFed</span>
            </Link>
            {isOwner && (
              <div className="flex items-center gap-3">
                <Link to="/market"><Button variant="outline" size="sm">Shop</Button></Link>
                <Link to="/settings"><Button variant="ghost" size="sm">Settings</Button></Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Profile Header */}
        <Card className="glass">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-primary-foreground">
              {profile?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            {isEditing ? (
              <div className="flex items-center justify-center gap-2">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="max-w-[200px] text-center"
                  placeholder="Enter username"
                />
                <Button size="sm" onClick={handleSaveUsername} disabled={isSaving}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-2xl">{profile?.username || 'Anonymous User'}</CardTitle>
                {isOwner && <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Net Worth Card */}
        <Card className="glass border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-lg">Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              M${netWorth.toLocaleString()}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 text-sm">
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-muted-foreground mb-1">Balance</div>
                <div className="font-mono text-foreground">M${balance.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-muted-foreground mb-1">Bonds</div>
                <div className="font-mono text-foreground">M${bondValue.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-muted-foreground mb-1">Loan Investments</div>
                <div className="font-mono text-foreground">M${loanInvestments.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-muted-foreground mb-1">Liabilities</div>
                <div className="font-mono text-red-400">-M${liabilities.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-muted-foreground mb-1">Manual Assets</div>
                <div className="font-mono text-emerald-400">+M${manualAssets.toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-muted-foreground mb-1">Manual Debts</div>
                <div className="font-mono text-red-400">-M${manualLiabilities.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Loans Tracker */}
        {isOwner && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">Manual Loan Tracker</CardTitle>
              <p className="text-sm text-muted-foreground">Track loans made outside this platform</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Description (e.g., Loaned to @user)"
                  value={newLoanDesc}
                  onChange={(e) => setNewLoanDesc(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newLoanAmount}
                  onChange={(e) => setNewLoanAmount(e.target.value)}
                  className="w-28"
                />
                <Button
                  variant={newLoanIsLiability ? "destructive" : "default"}
                  onClick={() => setNewLoanIsLiability(!newLoanIsLiability)}
                  className="w-24"
                >
                  {newLoanIsLiability ? 'Debt' : 'Asset'}
                </Button>
                <Button onClick={addManualLoan}>Add</Button>
              </div>

              <ScrollArea className="h-48">
                {manualLoans.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No manual loans tracked</div>
                ) : (
                  <div className="space-y-2">
                    {manualLoans.map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div>
                          <div className="font-medium">{loan.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(loan.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={loan.is_liability ? "destructive" : "default"}>
                            {loan.is_liability ? '-' : '+'}M${loan.amount.toLocaleString()}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => removeManualLoan(loan.id)}>×</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}