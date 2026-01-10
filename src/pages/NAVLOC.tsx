import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, CreditCard, DollarSign, Percent, AlertTriangle, CheckCircle, ChevronDown, Info, Lock, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { useUserBalance } from '@/hooks/useUserBalance';
import { format } from 'date-fns';
import manifedLogo from '@/assets/manifed-logo.png';

interface CreditLine {
  id: string;
  credit_grade: string;
  credit_limit: number;
  interest_rate: number;
  current_balance: number;
  available_credit: number;
  is_active: boolean;
  interest_due: number;
  last_interest_payment: string | null;
}

interface CreditApplication {
  id: string;
  status: string;
  requested_at: string;
  notes: string | null;
}

interface NAVLOCTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const CREDIT_GRADES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C'];

const getGradeColor = (grade: string) => {
  const gradeIndex = CREDIT_GRADES.indexOf(grade);
  if (gradeIndex <= 2) return 'text-emerald-400 bg-emerald-500/20';
  if (gradeIndex <= 4) return 'text-yellow-400 bg-yellow-500/20';
  if (gradeIndex <= 6) return 'text-orange-400 bg-orange-500/20';
  return 'text-red-400 bg-red-500/20';
};

export default function NAVLOC() {
  const [isLoading, setIsLoading] = useState(true);
  const [creditLine, setCreditLine] = useState<CreditLine | null>(null);
  const [application, setApplication] = useState<CreditApplication | null>(null);
  const [transactions, setTransactions] = useState<NAVLOCTransaction[]>([]);
  const [drawdownAmount, setDrawdownAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const { balance, fetchBalance } = useUserBalance();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch credit line
      const { data: creditData } = await supabase
        .from('navloc_credit_lines')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (creditData) {
        setCreditLine(creditData as CreditLine);
        
        // Fetch transactions
        const { data: txData } = await supabase
          .from('navloc_transactions')
          .select('*')
          .eq('credit_line_id', creditData.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (txData) setTransactions(txData);
      }

      // Fetch application status
      const { data: appData } = await supabase
        .from('credit_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (appData) setApplication(appData);
    } catch (error) {
      console.error('Error fetching NAVLOC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get manifold username
      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_username')
        .eq('user_id', user.id)
        .maybeSingle();

      const { error } = await supabase
        .from('credit_applications')
        .insert({
          user_id: user.id,
          manifold_username: settings?.manifold_username || null,
        });

      if (error) throw error;

      toast({ title: 'Application Submitted', description: 'Your credit application is now under review.' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to submit application', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrawdown = async () => {
    if (!creditLine || !drawdownAmount) return;
    const amount = parseFloat(drawdownAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    if (amount > creditLine.available_credit) {
      toast({ title: 'Exceeds available credit', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Add to user balance
      await supabase.rpc('modify_user_balance', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_amount: amount,
        p_operation: 'add'
      });

      // Record transaction and update balance
      const newBalance = creditLine.current_balance + amount;
      await supabase.from('navloc_transactions').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        credit_line_id: creditLine.id,
        type: 'drawdown',
        amount: amount,
        balance_after: newBalance,
        description: `Drawdown of M$${amount.toLocaleString()}`
      });

      await supabase
        .from('navloc_credit_lines')
        .update({ current_balance: newBalance })
        .eq('id', creditLine.id);

      toast({ title: 'Funds Drawn', description: `M$${amount.toLocaleString()} added to your balance` });
      setDrawdownAmount('');
      await Promise.all([fetchData(), fetchBalance()]);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to draw funds', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInterest = async () => {
    if (!creditLine || creditLine.interest_due <= 0) return;
    if (balance < creditLine.interest_due) {
      toast({ title: 'Insufficient Balance', description: `You need M$${creditLine.interest_due.toFixed(2)} to pay interest.`, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      
      // Deduct from balance
      await supabase.rpc('modify_user_balance', {
        p_user_id: userId,
        p_amount: creditLine.interest_due,
        p_operation: 'subtract'
      });

      // Record transaction
      await supabase.from('navloc_transactions').insert({
        user_id: userId,
        credit_line_id: creditLine.id,
        type: 'interest_payment',
        amount: creditLine.interest_due,
        balance_after: creditLine.current_balance,
        description: `Interest payment for ${format(new Date(), 'MMMM yyyy')}`
      });

      // Update credit line
      await supabase
        .from('navloc_credit_lines')
        .update({ 
          interest_due: 0,
          last_interest_payment: new Date().toISOString()
        })
        .eq('id', creditLine.id);

      toast({ title: 'Interest Paid', description: 'Your account is current.' });
      await Promise.all([fetchData(), fetchBalance()]);
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to pay interest', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is locked out
  const isLockedOut = creditLine && creditLine.interest_due > 0 && new Date().getDate() > 3;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Locked out view
  if (isLockedOut) {
    return (
      <div className="min-h-screen bg-background">
        <UniversalHeader />
        <main className="container mx-auto px-4 py-16 max-w-lg text-center">
          <Lock className="w-16 h-16 mx-auto mb-6 text-destructive" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Account Locked</h1>
          <p className="text-muted-foreground mb-6">
            You have outstanding interest of <span className="text-destructive font-bold">M${creditLine!.interest_due.toFixed(2)}</span> that was due on the 1st of the month.
          </p>
          <Card className="glass mb-6">
            <CardContent className="p-6 text-left space-y-4">
              <h3 className="font-semibold">To unlock your account:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Deposit at least M${creditLine!.interest_due.toFixed(2)} to your ManiFed balance</li>
                <li>Return to this page and click "Pay Interest"</li>
                <li>Your account will be unlocked immediately</li>
              </ol>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3">
            <Button onClick={handlePayInterest} disabled={isSubmitting || balance < creditLine!.interest_due} className="gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Pay Interest (M${creditLine!.interest_due.toFixed(2)})
            </Button>
            <p className="text-sm text-muted-foreground">Your balance: M${balance.toLocaleString()}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            ManiFed <span className="text-gradient">NAVLOC</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Net Account Value Line of Credit — Instant credit based on your complete financial profile.
          </p>
        </div>

        {/* Credit Card Display */}
        <div className="flex justify-center mb-12">
          <div 
            className="relative w-full max-w-md aspect-[1.586] rounded-2xl p-6 overflow-hidden"
            style={{
              background: creditLine 
                ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.6) 50%, hsl(var(--primary)/0.3) 100%)'
                : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Animated penguin logo */}
            <div className="absolute top-4 right-4 animate-pulse">
              <img src={manifedLogo} alt="ManiFed" className="w-12 h-12 rounded-lg opacity-80" />
            </div>
            
            {/* Card content */}
            <div className="flex flex-col h-full justify-between text-white">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-70">ManiFed</p>
                <h2 className="text-2xl font-bold tracking-wide">NAVLOC</h2>
              </div>
              
              {creditLine ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs opacity-70">Available Credit</p>
                    <p className="text-3xl font-bold">M${creditLine.available_credit.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getGradeColor(creditLine.credit_grade)}>
                      Grade: {creditLine.credit_grade}
                    </Badge>
                    <span className="text-sm opacity-80">{creditLine.interest_rate}% APR</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg opacity-80">No credit line yet</p>
                  <p className="text-sm opacity-60">Apply below to get started</p>
                </div>
              )}
            </div>

            {/* Decorative elements */}
            <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/5 -mr-24 -mb-24" />
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white/5 -ml-16 -mt-16" />
          </div>
        </div>

        {/* Main Content */}
        {creditLine ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Credit Summary */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Credit Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Credit Limit</p>
                    <p className="text-xl font-bold">M${creditLine.credit_limit.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-xl font-bold text-destructive">M${creditLine.current_balance.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="text-xl font-bold">{creditLine.interest_rate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-sm text-muted-foreground">Interest Due</p>
                    <p className={`text-xl font-bold ${creditLine.interest_due > 0 ? 'text-destructive' : 'text-success'}`}>
                      M${creditLine.interest_due.toFixed(2)}
                    </p>
                  </div>
                </div>

                {creditLine.interest_due > 0 && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                      <div>
                        <p className="font-semibold text-destructive">Interest Payment Due</p>
                        <p className="text-sm text-muted-foreground">
                          Pay M${creditLine.interest_due.toFixed(2)} by the end of the month to avoid account lock.
                        </p>
                        <Button 
                          size="sm" 
                          className="mt-2" 
                          onClick={handlePayInterest}
                          disabled={isSubmitting || balance < creditLine.interest_due}
                        >
                          Pay Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Draw Funds */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Draw Funds
                </CardTitle>
                <CardDescription>
                  Withdraw funds instantly to your ManiFed balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">M$</span>
                  <Input
                    type="number"
                    placeholder="Amount..."
                    value={drawdownAmount}
                    onChange={e => setDrawdownAmount(e.target.value)}
                    className="pl-10"
                    max={creditLine.available_credit}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Available: M${creditLine.available_credit.toLocaleString()}
                </p>
                <Button 
                  className="w-full gap-2" 
                  onClick={handleDrawdown}
                  disabled={isSubmitting || !drawdownAmount || parseFloat(drawdownAmount) > creditLine.available_credit}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Draw Funds
                </Button>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="glass lg:col-span-2">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                          <div>
                            <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.type === 'drawdown' ? 'text-emerald-400' : 'text-destructive'}`}>
                              {tx.type === 'drawdown' ? '+' : '-'}M${tx.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Balance: M${tx.balance_after.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* No credit line - show application */
          <div className="max-w-xl mx-auto space-y-6">
            {application ? (
              <Card className="glass">
                <CardHeader className="text-center">
                  {application.status === 'pending' ? (
                    <>
                      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                      <CardTitle>Application Under Review</CardTitle>
                      <CardDescription>
                        Your application submitted on {format(new Date(application.requested_at), 'MMM d, yyyy')} is being reviewed.
                      </CardDescription>
                    </>
                  ) : application.status === 'rejected' ? (
                    <>
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                      <CardTitle>Application Declined</CardTitle>
                      <CardDescription>
                        {application.notes || 'Your application was not approved at this time. You may reapply after improving your financial profile.'}
                      </CardDescription>
                    </>
                  ) : null}
                </CardHeader>
              </Card>
            ) : (
              <Card className="glass">
                <CardHeader className="text-center">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <CardTitle>Apply for NAVLOC</CardTitle>
                  <CardDescription>
                    Get instant access to credit based on your Net Account Value.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full gap-2" onClick={handleApply} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Submit Application
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* How It Works */}
        <Collapsible open={showHowItWorks} onOpenChange={setShowHowItWorks} className="mt-12">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                How NAVLOC Works
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <Card className="glass">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">What is NAVLOC?</h3>
                  <p className="text-sm text-muted-foreground">
                    NAVLOC (Net Account Value Line of Credit) is a revolving credit facility that allows you to borrow against your total financial position with ManiFed. Unlike traditional loans, you can draw and repay funds at any time.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Credit Rating Factors</h3>
                  <p className="text-sm text-muted-foreground mb-2">Your credit grade (AAA to C) is determined by:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Account balance and trading history</li>
                    <li>Market liquidity in your positions</li>
                    <li>Outstanding loans and repayment history</li>
                    <li>Treasury bond holdings</li>
                    <li>Account age and activity level</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Interest Payments</h3>
                  <p className="text-sm text-muted-foreground">
                    Interest is calculated monthly on your outstanding balance. Payment is due on the last day of each month. Failure to pay by the 3rd of the following month will result in account restrictions until payment is made.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CREDIT_GRADES.map(grade => (
                    <Badge key={grade} className={getGradeColor(grade)}>{grade}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </main>
    </div>
  );
}