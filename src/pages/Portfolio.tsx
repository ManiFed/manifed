import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { mockLoans, mockUserPortfolio } from '@/data/mockLoans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Portfolio() {
  const [manifedBalance, setManifedBalance] = useState(0);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);

  // Simulated user investments
  const userInvestments = mockLoans.filter(
    (loan) => loan.status === 'active' || loan.status === 'seeking_funding'
  ).slice(0, 2);

  const totalValue = manifedBalance + mockUserPortfolio.totalInvested;
  const expectedReturns = userInvestments.reduce(
    (sum, loan) => sum + (loan.fundedAmount * loan.interestRate) / 100,
    0
  );

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.manifold_api_key) {
        setUserApiKey(data.manifold_api_key);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleDeposit = async () => {
    if (!userApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first',
        variant: 'destructive',
      });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('managram', {
        body: {
          action: 'deposit',
          amount: depositAmount,
          userApiKey: userApiKey,
          message: `ManiFed deposit - M$${depositAmount}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setManifedBalance(prev => prev + depositAmount);
      setAmount('');
      setIsDepositOpen(false);
      
      toast({
        title: 'Deposit Successful',
        description: `M$${depositAmount.toLocaleString()} deposited to your ManiFed account`,
      });
    } catch (error) {
      console.error('Deposit error:', error);
      toast({
        title: 'Deposit Failed',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first',
        variant: 'destructive',
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawAmount > manifedBalance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You cannot withdraw more than your available balance',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('managram', {
        body: {
          action: 'withdraw',
          amount: withdrawAmount,
          userApiKey: userApiKey,
          message: `ManiFed withdrawal - M$${withdrawAmount}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setManifedBalance(prev => prev - withdrawAmount);
      setAmount('');
      setIsWithdrawOpen(false);
      
      toast({
        title: 'Withdrawal Successful',
        description: `M$${withdrawAmount.toLocaleString()} sent to your Manifold wallet`,
      });
    } catch (error) {
      console.error('Withdraw error:', error);
      toast({
        title: 'Withdrawal Failed',
        description: error instanceof Error ? error.message : 'Failed to process withdrawal',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Portfolio Overview */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Your Portfolio</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDepositOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Deposit
              </Button>
              <Button variant="outline" onClick={() => setIsWithdrawOpen(true)}>
                <Minus className="w-4 h-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>

          {!userApiKey && (
            <Card className="glass border-warning/30 mb-6">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="text-warning font-medium">Connect your Manifold account</span> in{' '}
                  <Link to="/settings" className="text-primary hover:underline">Settings</Link> to deposit and invest with real M$.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ManiFed Balance</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      M${manifedBalance.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Available to invest</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      M${totalValue.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-success text-sm">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Balance + Invested</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10">
                    <PiggyBank className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Invested</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      M${mockUserPortfolio.totalInvested.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {mockUserPortfolio.activeInvestments} active loans
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expected Returns</p>
                    <p className="text-3xl font-bold text-success mt-1">
                      +M${expectedReturns.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">From active loans</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10">
                    <ArrowUpRight className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Active Investments */}
        <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Active Investments</h2>
            <Link to="/marketplace">
              <Button variant="outline" size="sm">
                Find More Loans
              </Button>
            </Link>
          </div>

          <div className="grid gap-4">
            {userInvestments.map((loan) => {
              const progress = (loan.fundedAmount / loan.amount) * 100;
              const yourInvestment = loan.investors[0]?.amount || 1000;
              const expectedReturn = yourInvestment * (1 + loan.interestRate / 100);

              return (
                <Link key={loan.id} to={`/loan/${loan.id}`}>
                  <Card className="glass hover:bg-card/90 transition-all hover:-translate-y-0.5 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {loan.title}
                            </h3>
                            <Badge
                              variant={loan.status === 'active' ? 'active' : 'pending'}
                            >
                              {loan.status === 'active' ? (
                                <>
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Funding
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{loan.borrower.username} • {loan.termDays} day term
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Your Investment</p>
                            <p className="font-semibold text-foreground">
                              M${yourInvestment.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Interest</p>
                            <p className="font-semibold text-success">{loan.interestRate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Expected Return</p>
                            <p className="font-semibold text-success">
                              M${expectedReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>

                          {loan.status === 'seeking_funding' && (
                            <div className="w-32">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Funded</span>
                                <span className="text-primary">{progress.toFixed(0)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {userInvestments.length === 0 && (
              <Card className="glass">
                <CardContent className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Active Investments</h3>
                  <p className="text-muted-foreground mb-4">
                    Start earning yield by investing in loans on the marketplace
                  </p>
                  <Link to="/marketplace">
                    <Button variant="glow">Browse Loans</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xl font-semibold text-foreground mb-6">Recent Activity</h2>
          <Card className="glass">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[
                  {
                    type: 'investment',
                    title: 'Invested in Election Market Arbitrage',
                    amount: '+M$2,000',
                    date: '2 days ago',
                    icon: ArrowDownRight,
                    iconClass: 'text-primary',
                  },
                  {
                    type: 'return',
                    title: 'Received interest payment',
                    amount: '+M$150',
                    date: '5 days ago',
                    icon: ArrowUpRight,
                    iconClass: 'text-success',
                  },
                  {
                    type: 'repaid',
                    title: 'Loan repaid: Crypto Coverage',
                    amount: '+M$880',
                    date: '1 week ago',
                    icon: CheckCircle,
                    iconClass: 'text-success',
                  },
                ].map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-secondary/50 ${activity.iconClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.date}</p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold ${
                          activity.amount.startsWith('+') ? 'text-success' : 'text-foreground'
                        }`}
                      >
                        {activity.amount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Deposit Dialog */}
      <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deposit M$ to ManiFed</DialogTitle>
            <DialogDescription>
              Send M$ from your Manifold wallet to your ManiFed account via managram to @ManiFed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (M$)</label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
              <p>This will send a managram from your Manifold account to @ManiFed.</p>
              <p className="mt-1">Your API key is used to authorize the transfer.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleDeposit} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw M$ from ManiFed</DialogTitle>
            <DialogDescription>
              Receive M$ from ManiFed back to your Manifold wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (M$)</label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                Available: M${manifedBalance.toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button variant="glow" onClick={handleWithdraw} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
