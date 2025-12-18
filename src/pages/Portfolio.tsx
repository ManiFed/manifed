import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useUserBalance } from '@/hooks/useUserBalance';
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  Loader2,
  Brain,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Investment {
  id: string;
  loan_id: string;
  amount: number;
  created_at: string;
  loans: {
    id: string;
    title: string;
    borrower_username: string;
    interest_rate: number;
    term_days: number;
    status: string;
    funded_amount: number;
    amount: number;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

const CREDIT_LIMITS: Record<string, number> = {
  'free': 15,
  'basic': 50,
  'pro': 100,
  'premium': 200,
};

export default function Portfolio() {
  const { balance, totalInvested, isLoading: balanceLoading } = useUserBalance();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaiCreditsUsed, setMfaiCreditsUsed] = useState(0);
  const [mfaiCreditsLimit, setMfaiCreditsLimit] = useState(15);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's investments with loan details
      const { data: investmentData, error: investmentError } = await supabase
        .from('investments')
        .select(`
          id,
          loan_id,
          amount,
          created_at,
          loans (
            id,
            title,
            borrower_username,
            interest_rate,
            term_days,
            status,
            funded_amount,
            amount
          )
        `)
        .eq('investor_user_id', user.id)
        .order('created_at', { ascending: false });

      if (investmentError) throw investmentError;
      setInvestments(investmentData || []);

      // Fetch recent transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // Fetch MFAI credits
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('status, mfai_credits_used')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subscription) {
        setMfaiCreditsUsed(subscription.mfai_credits_used || 0);
        setMfaiCreditsLimit(CREDIT_LIMITS[subscription.status] || 15);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalValue = balance + totalInvested;
  const expectedReturns = investments.reduce((sum, inv) => {
    if (inv.loans && (inv.loans.status === 'active' || inv.loans.status === 'seeking_funding')) {
      return sum + (Number(inv.amount) * inv.loans.interest_rate) / 100;
    }
    return sum;
  }, 0);

  const activeInvestments = investments.filter(
    inv => inv.loans && (inv.loans.status === 'active' || inv.loans.status === 'seeking_funding')
  );

  const mfaiCreditsRemaining = mfaiCreditsLimit - mfaiCreditsUsed;

  if (isLoading || balanceLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Portfolio Overview */}
        <section className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Your Portfolio</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ManiFed Balance</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      M${balance.toLocaleString()}
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
                      M${totalInvested.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {activeInvestments.length} active loans
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

            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">MFAI Credits</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {mfaiCreditsRemaining}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      of {mfaiCreditsLimit} remaining
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-500/10">
                    <Brain className="w-6 h-6 text-violet-500" />
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
            {activeInvestments.map((investment) => {
              const loan = investment.loans;
              if (!loan) return null;
              
              const progress = (loan.funded_amount / loan.amount) * 100;
              const expectedReturn = Number(investment.amount) * (1 + loan.interest_rate / 100);

              return (
                <Link key={investment.id} to={`/loan/${loan.id}`}>
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
                            @{loan.borrower_username} • {loan.term_days} day term
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Your Investment</p>
                            <p className="font-semibold text-foreground">
                              M${Number(investment.amount).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">Interest</p>
                            <p className="font-semibold text-success">{loan.interest_rate}%</p>
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

            {activeInvestments.length === 0 && (
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
              {transactions.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {transactions.map((tx) => {
                    const isPositive = tx.type === 'deposit' || tx.type === 'repayment' || tx.type === 'loan_received';
                    const Icon = isPositive ? ArrowUpRight : (tx.type === 'invest' ? ArrowDownRight : ArrowDownRight);
                    
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg bg-secondary/50 ${isPositive ? 'text-success' : 'text-primary'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{tx.description || tx.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`font-semibold ${isPositive ? 'text-success' : 'text-foreground'}`}>
                          {isPositive ? '+' : ''}M${Math.abs(Number(tx.amount)).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No recent activity</p>
                  <p className="text-sm mt-2">Deposit funds to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
