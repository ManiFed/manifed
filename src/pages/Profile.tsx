import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Trash2, ArrowUpDown } from 'lucide-react';

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

interface NetWorthHistory {
  date: string;
  basicNetWorth: number;
  trueNetWorth: number;
  totalNetWorth: number;
}

interface NAVLOCData {
  current_balance: number;
  credit_limit: number;
  is_active: boolean;
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
  const [navlocBalance, setNavlocBalance] = useState(0);
  const [marketPositionsValue, setMarketPositionsValue] = useState(0); // Liquidity locked in markets
  const [manualLoans, setManualLoans] = useState<ManualLoan[]>([]);
  const [newLoanDesc, setNewLoanDesc] = useState('');
  const [newLoanAmount, setNewLoanAmount] = useState('');
  const [newLoanIsLiability, setNewLoanIsLiability] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistory[]>([]);

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

      // Fetch NAVLOC balance (liability)
      const { data: navlocData } = await supabase
        .from('navloc_credit_lines')
        .select('current_balance, is_active')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .maybeSingle();
      setNavlocBalance(navlocData?.current_balance || 0);

      // Fetch net worth history
      const { data: historyData } = await supabase
        .from('net_worth_history')
        .select('*')
        .eq('user_id', targetUserId)
        .order('recorded_at', { ascending: true })
        .limit(30);
      
      if (historyData && historyData.length > 0) {
        setNetWorthHistory(historyData.map(h => ({
          date: new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          basicNetWorth: h.basic_net_worth,
          trueNetWorth: h.liquidity_adjusted_net_worth,
          totalNetWorth: h.total_net_worth
        })));
      }

      // Manual loans stored in localStorage
      const stored = localStorage.getItem(`manual_loans_${targetUserId}`);
      if (stored) {
        setManualLoans(JSON.parse(stored));
      }

      // Placeholder for market positions (would need API call to Manifold)
      setMarketPositionsValue(0);
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
    toast({ title: 'Entry added' });
  };

  const removeManualLoan = (id: string) => {
    if (!profile) return;
    const updated = manualLoans.filter(l => l.id !== id);
    setManualLoans(updated);
    localStorage.setItem(`manual_loans_${profile.user_id}`, JSON.stringify(updated));
  };

  // Sort manual loans
  const sortedManualLoans = [...manualLoans].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return b.amount - a.amount;
  });

  // Calculate net worth layers
  const manualAssets = manualLoans.filter(l => !l.is_liability).reduce((sum, l) => sum + l.amount, 0);
  const manualLiabilities = manualLoans.filter(l => l.is_liability).reduce((sum, l) => sum + l.amount, 0);
  
  // Basic net worth: balance + bonds + loan investments - loans owed
  const basicNetWorth = balance + bondValue + loanInvestments - liabilities - navlocBalance;
  
  // True net worth: basic + market positions (liquidity locked)
  const trueNetWorth = basicNetWorth + marketPositionsValue;
  
  // Total net worth: true + manual assets - manual liabilities
  const totalNetWorth = trueNetWorth + manualAssets - manualLiabilities;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Profile Header */}
        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-primary-foreground">
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

        {/* Net Worth Layers */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Basic Net Worth</p>
              <p className="text-3xl font-bold text-foreground">
                M${basicNetWorth.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Balance + Bonds + Loans Given - Loans Owed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">True Net Worth</p>
              <p className={`text-3xl font-bold ${trueNetWorth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                M${trueNetWorth.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Basic + Market Positions</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Net Worth</p>
              <p className={`text-3xl font-bold ${totalNetWorth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                M${totalNetWorth.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">True + Manual Entries</p>
            </CardContent>
          </Card>
        </div>

        {/* Net Worth History Chart */}
        {netWorthHistory.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Net Worth History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netWorthHistory}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(val) => `M$${val.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`M$${value.toLocaleString()}`, '']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalNetWorth" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assets & Liabilities Breakdown */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Assets & Liabilities</CardTitle>
            <CardDescription>ManiFed products auto-import. Add external entries below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Assets */}
              <div className="space-y-3">
                <h3 className="font-semibold text-emerald-500 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Assets
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground">ManiFed Balance</span>
                    <span className="font-mono text-emerald-500">+M${balance.toLocaleString()}</span>
                  </div>
                  {bondValue > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Treasury Bonds</span>
                      <span className="font-mono text-emerald-500">+M${bondValue.toLocaleString()}</span>
                    </div>
                  )}
                  {loanInvestments > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">P2P Loans Given</span>
                      <span className="font-mono text-emerald-500">+M${loanInvestments.toLocaleString()}</span>
                    </div>
                  )}
                  {manualLoans.filter(l => !l.is_liability).map(loan => (
                    <div key={loan.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[150px]">{loan.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-emerald-500">+M${loan.amount.toLocaleString()}</span>
                        {isOwner && (
                          <Button variant="ghost" size="sm" onClick={() => removeManualLoan(loan.id)}>
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities */}
              <div className="space-y-3">
                <h3 className="font-semibold text-red-500 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Liabilities
                </h3>
                <div className="space-y-2">
                  {liabilities > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">P2P Loans Owed</span>
                      <span className="font-mono text-red-500">-M${liabilities.toLocaleString()}</span>
                    </div>
                  )}
                  {navlocBalance > 0 && (
                    <div className="flex justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">NAVLOC Balance</span>
                      <span className="font-mono text-red-500">-M${navlocBalance.toLocaleString()}</span>
                    </div>
                  )}
                  {manualLoans.filter(l => l.is_liability).map(loan => (
                    <div key={loan.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground truncate max-w-[150px]">{loan.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-red-500">-M${loan.amount.toLocaleString()}</span>
                        {isOwner && (
                          <Button variant="ghost" size="sm" onClick={() => removeManualLoan(loan.id)}>
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {liabilities === 0 && navlocBalance === 0 && manualLoans.filter(l => l.is_liability).length === 0 && (
                    <div className="p-3 text-center text-muted-foreground text-sm">No liabilities</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Form - Owner Only */}
        {isOwner && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Add Manual Entry</CardTitle>
              <CardDescription>Track external loans or assets not on ManiFed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="Description (e.g., Loaned to @user)"
                  value={newLoanDesc}
                  onChange={(e) => setNewLoanDesc(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newLoanAmount}
                  onChange={(e) => setNewLoanAmount(e.target.value)}
                  className="w-32"
                />
                <Button
                  variant={newLoanIsLiability ? "destructive" : "default"}
                  onClick={() => setNewLoanIsLiability(!newLoanIsLiability)}
                  className="w-24"
                >
                  {newLoanIsLiability ? 'Debt' : 'Asset'}
                </Button>
                <Button onClick={addManualLoan} className="gap-2">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>

              {manualLoans.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}