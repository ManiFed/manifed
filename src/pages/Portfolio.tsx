import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockLoans, mockUserPortfolio } from '@/data/mockLoans';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Portfolio() {
  // Simulated user investments
  const userInvestments = mockLoans.filter(
    (loan) => loan.status === 'active' || loan.status === 'seeking_funding'
  ).slice(0, 2);

  const totalValue = mockUserPortfolio.balance + mockUserPortfolio.totalInvested;
  const expectedReturns = userInvestments.reduce(
    (sum, loan) => sum + (loan.fundedAmount * loan.interestRate) / 100,
    0
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Portfolio Overview */}
        <section className="animate-slide-up">
          <h1 className="text-3xl font-bold text-foreground mb-6">Your Portfolio</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      M${totalValue.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-success text-sm">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>+5.2% this month</span>
                    </div>
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
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      M${mockUserPortfolio.balance.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Ready to invest</p>
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
            <Link to="/">
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
                  <Link to="/">
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
    </div>
  );
}
