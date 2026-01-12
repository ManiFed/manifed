import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Clock, TrendingUp, Wallet, ArrowRight, Loader2, CheckCircle, Store, Users, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, addWeeks } from 'date-fns';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { useUserBalance } from '@/hooks/useUserBalance';
import { LoanCard } from '@/components/loans/LoanCard';
interface BondRate {
  term_weeks: number;
  annual_yield: number;
  monthly_yield: number;
}
interface Bond {
  id: string;
  bond_code: string;
  amount: number;
  term_weeks: number;
  annual_yield: number;
  purchase_date: string;
  maturity_date: string;
  next_interest_date: string;
  status: string;
  total_return: number;
  issuer_id?: string;
}
interface BondIssuer {
  id: string;
  name: string;
  description: string;
  is_verified: boolean;
}
interface Loan {
  id: string;
  borrower_user_id: string;
  borrower_username: string;
  borrower_reputation: number;
  title: string;
  description: string;
  amount: number;
  funded_amount: number;
  interest_rate: number;
  term_days: number;
  status: string;
  created_at: string;
  is_verified: boolean;
  risk_score: string;
}
const BOND_TERMS = [{
  weeks: 4,
  label: '4 Weeks',
  description: '1 Month T-Bill'
}, {
  weeks: 13,
  label: '13 Weeks',
  description: '3 Month T-Bill'
}, {
  weeks: 26,
  label: '26 Weeks',
  description: '6 Month T-Bill'
}, {
  weeks: 52,
  label: '52 Weeks',
  description: '1 Year T-Bill'
}];
export default function Loans() {
  const [activeTab, setActiveTab] = useState<'bonds' | 'p2p'>('p2p');
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<BondRate[]>([]);
  const [userBonds, setUserBonds] = useState<Bond[]>([]);
  const [issuers, setIssuers] = useState<BondIssuer[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanFilter, setLoanFilter] = useState<string>('seeking_funding');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const {
    balance,
    fetchBalance
  } = useUserBalance();
  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Fetch bond rates
      const {
        data: ratesData
      } = await supabase.from('bond_rates').select('*').order('term_weeks', {
        ascending: true
      });
      if (ratesData) {
        const latestRates = BOND_TERMS.map(term => {
          const termRates = ratesData.filter(r => r.term_weeks === term.weeks);
          return termRates[termRates.length - 1] || {
            term_weeks: term.weeks,
            annual_yield: 6.0,
            monthly_yield: 0.5
          };
        });
        setRates(latestRates);
      }

      // Fetch bond issuers
      const {
        data: issuersData
      } = await supabase.from('bond_issuers').select('*').order('name');
      if (issuersData) setIssuers(issuersData);

      // Fetch user bonds
      if (user) {
        const {
          data: bondsData
        } = await supabase.from('bonds').select('*').eq('user_id', user.id).order('created_at', {
          ascending: false
        });
        if (bondsData) setUserBonds(bondsData as Bond[]);
      }

      // Fetch P2P loans
      const {
        data: loansData
      } = await supabase.from('loans').select('*').order('is_verified', {
        ascending: false
      }).order('created_at', {
        ascending: false
      });
      if (loansData) setLoans(loansData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePurchaseBond = async () => {
    if (!selectedTerm || !amount) return;
    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum bond purchase is M$10',
        variant: 'destructive'
      });
      return;
    }
    if (purchaseAmount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need M$${purchaseAmount.toLocaleString()} but only have M$${balance.toLocaleString()}.`,
        variant: 'destructive'
      });
      return;
    }
    if (purchaseAmount > 100000) {
      toast({
        title: 'Weekly Limit Exceeded',
        description: 'Maximum purchase is M$100,000 per week.',
        variant: 'destructive'
      });
      return;
    }
    const currentHoldings = userBonds.filter(b => b.status === 'active').reduce((sum, b) => sum + b.amount, 0);
    if (currentHoldings + purchaseAmount > 250000) {
      toast({
        title: 'Holdings Cap Exceeded',
        description: `You can hold max M$250,000 in bonds.`,
        variant: 'destructive'
      });
      return;
    }
    setIsPurchasing(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('purchase-bond-balance', {
        body: {
          amount: purchaseAmount,
          termWeeks: selectedTerm
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: 'Bond Purchased!',
        description: `Successfully purchased M$${purchaseAmount.toLocaleString()} bond.`
      });
      setAmount('');
      setSelectedTerm(null);
      await Promise.all([fetchData(), fetchBalance()]);
    } catch (error) {
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Could not complete bond purchase',
        variant: 'destructive'
      });
    } finally {
      setIsPurchasing(false);
    }
  };
  const filteredLoans = loans.filter(loan => loanFilter === 'all' ? true : loan.status === loanFilter);
  const transformedLoans = filteredLoans.map(loan => ({
    id: loan.id,
    borrower: {
      id: loan.borrower_user_id,
      username: loan.borrower_username,
      reputation: loan.borrower_reputation || 0
    },
    title: loan.title,
    description: loan.description,
    amount: loan.amount,
    fundedAmount: loan.funded_amount,
    interestRate: loan.interest_rate,
    termDays: loan.term_days,
    status: loan.status as any,
    createdAt: loan.created_at,
    riskScore: (loan.risk_score || 'medium') as 'low' | 'medium' | 'high',
    investors: [],
    isVerified: loan.is_verified
  }));
  const selectedRate = rates.find(r => r.term_weeks === selectedTerm);
  const purchaseAmount = parseFloat(amount) || 0;
  const monthlyInterest = selectedRate ? purchaseAmount * (selectedRate.annual_yield / 100) / 12 : 0;
  const termMonths = selectedTerm ? selectedTerm / 4 : 0;
  const totalInterest = monthlyInterest * termMonths;
  const minimumAmount = selectedRate ? Math.ceil(10 * 12 * 100 / selectedRate.annual_yield) : 2000;
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <UniversalHeader />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            ManiFed <span className="text-gradient">Loans</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Invest in Treasury Bonds for stable yields or participate in P2P lending for higher returns.
          </p>
          {isAuthenticated && <p className="text-sm text-primary mt-2">Your Balance: M${balance.toLocaleString()}</p>}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'bonds' | 'p2p')} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="bonds" className="gap-2">
              <Building2 className="w-4 h-4" />
              Bonds
            </TabsTrigger>
            <TabsTrigger value="p2p" className="gap-2">
              <Users className="w-4 h-4" />
              P2P Loans
            </TabsTrigger>
          </TabsList>

          {/* Bonds Tab */}
          <TabsContent value="bonds" className="space-y-6">
            {/* Issuer Filter - Dropdown */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-muted-foreground">Issuer:</span>
              <Select value={selectedIssuer === 'all' ? issuers[0]?.id || 'all' : selectedIssuer} onValueChange={setSelectedIssuer}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select issuer" />
                </SelectTrigger>
                <SelectContent>
                  {issuers.map(issuer => <SelectItem key={issuer.id} value={issuer.id}>
                      <div className="flex items-center gap-2">
                        {issuer.is_verified && <CheckCircle className="w-3 h-3 text-primary" />}
                        {issuer.name}
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Bond Selection */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Select Term
                    </CardTitle>
                    <CardDescription>
                      Choose your investment duration. Longer terms may offer better rates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {BOND_TERMS.map(term => {
                      const rate = rates.find(r => r.term_weeks === term.weeks);
                      const isSelected = selectedTerm === term.weeks;
                      return <button key={term.weeks} onClick={() => setSelectedTerm(term.weeks)} className={`p-4 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-border/50 bg-secondary/30 hover:border-primary/50'}`} disabled={!isAuthenticated}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-foreground">{term.label}</span>
                              {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{term.description}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{rate?.annual_yield || 6}% APY</Badge>
                              <span className="text-xs text-muted-foreground">({rate?.monthly_yield || 0.5}% monthly)</span>
                            </div>
                          </button>;
                    })}
                    </div>
                  </CardContent>
                </Card>

                {/* Amount Input */}
                {isAuthenticated && selectedTerm && <Card className="glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        Investment Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">M$</span>
                        <Input type="number" placeholder="Enter amount..." value={amount} onChange={e => setAmount(e.target.value)} className="pl-10 h-12 text-lg bg-secondary/50" min={minimumAmount} />
                      </div>

                      {purchaseAmount >= minimumAmount && purchaseAmount <= balance && <div className="p-4 rounded-lg bg-success/10 border border-success/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Monthly Interest</p>
                              <p className="text-xl font-bold text-success">M${monthlyInterest.toFixed(2)}/month</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Total Interest</p>
                              <p className="text-lg font-semibold text-success">+M${totalInterest.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>}

                      <Button className="w-full gap-2" onClick={handlePurchaseBond} disabled={isPurchasing || purchaseAmount < minimumAmount || purchaseAmount > balance}>
                        {isPurchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Purchase Bond
                      </Button>
                    </CardContent>
                  </Card>}
              </div>

              {/* My Bonds Sidebar */}
              <div className="space-y-6">
                {isAuthenticated ? <Card className="glass">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          My Bonds
                        </CardTitle>
                        <Link to="/bond-market">
                          <Button variant="outline" size="sm" className="gap-1">
                            <Store className="w-3 h-3" />
                            Market
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        {userBonds.length === 0 ? <div className="text-center py-8">
                            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">No bonds yet</p>
                          </div> : <div className="space-y-3">
                            {userBonds.map(bond => {
                        const bondMonthlyInterest = bond.amount * (bond.annual_yield / 100) / 12;
                        return <div key={bond.id} className="p-3 rounded-lg bg-secondary/30">
                                  <div className="flex items-center justify-between mb-1">
                                    <Badge variant={bond.status === 'active' ? 'default' : 'secondary'}>
                                      {bond.status}
                                    </Badge>
                                    <span className="text-xs font-mono text-primary">{bond.bond_code}</span>
                                  </div>
                                  <p className="font-semibold text-foreground">M${bond.amount.toLocaleString()}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {bond.term_weeks}w • {bond.annual_yield}% APY
                                  </p>
                                  {bond.status === 'active' && bond.next_interest_date && <p className="text-xs text-success mt-1">
                                      Next: M${bondMonthlyInterest.toFixed(2)} on {format(new Date(bond.next_interest_date), 'MMM d')}
                                    </p>}
                                </div>;
                      })}
                          </div>}
                      </ScrollArea>
                    </CardContent>
                  </Card> : <Card className="glass">
                    <CardContent className="p-6 text-center">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground mb-4">Sign in to purchase bonds</p>
                      <Link to="/auth">
                        <Button>Sign In</Button>
                      </Link>
                    </CardContent>
                  </Card>}
              </div>
            </div>
          </TabsContent>

          {/* P2P Loans Tab */}
          <TabsContent value="p2p" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={loanFilter} onValueChange={setLoanFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seeking_funding">Seeking Funding</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="repaid">Repaid</SelectItem>
                    <SelectItem value="all">All Loans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Link to="/create">
                <Button className="gap-2">
                  Request/Offer a Loan
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transformedLoans.length === 0 ? <div className="col-span-full text-center py-12">
                  
                  <p className="text-muted-foreground">No loans found</p>
                </div> : transformedLoans.map(loan => <LoanCard key={loan.id} loan={loan} />)}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>;
}