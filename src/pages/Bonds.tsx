import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Landmark, 
  FileText, 
  Clock, 
  TrendingUp, 
  Wallet,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  LogOut,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserBalance } from '@/hooks/useUserBalance';
import { format, addWeeks } from 'date-fns';

interface BondRate {
  term_weeks: number;
  annual_yield: number;
  monthly_yield: number;
}

interface Bond {
  id: string;
  amount: number;
  term_weeks: number;
  annual_yield: number;
  purchase_date: string;
  maturity_date: string;
  status: string;
  total_return: number;
}

const BOND_TERMS = [
  { weeks: 4, label: '4 Weeks', description: '1 Month T-Bill' },
  { weeks: 13, label: '13 Weeks', description: '3 Month T-Bill' },
  { weeks: 26, label: '26 Weeks', description: '6 Month T-Bill' },
  { weeks: 52, label: '52 Weeks', description: '1 Year T-Bill' },
];

const TRANSACTION_FEE = 0.005; // 0.5%

export default function Bonds() {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [rates, setRates] = useState<BondRate[]>([]);
  const [userBonds, setUserBonds] = useState<Bond[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { balance, fetchBalance } = useUserBalance();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      // Fetch bond rates
      const { data: ratesData } = await supabase
        .from('bond_rates')
        .select('*')
        .order('term_weeks', { ascending: true });

      if (ratesData) {
        // Get latest rate for each term
        const latestRates = BOND_TERMS.map(term => {
          const termRates = ratesData.filter(r => r.term_weeks === term.weeks);
          return termRates[termRates.length - 1] || { term_weeks: term.weeks, annual_yield: 6.0, monthly_yield: 0.5 };
        });
        setRates(latestRates);
      }

      if (user) {
        // Check API key
        const { data: settings } = await supabase
          .from('user_manifold_settings')
          .select('manifold_api_key')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setHasApiKey(!!settings?.manifold_api_key);

        // Fetch user's bonds
        const { data: bondsData } = await supabase
          .from('bonds')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bondsData) {
          setUserBonds(bondsData as Bond[]);
        }

        await fetchBalance();
      }
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
        variant: 'destructive',
      });
      return;
    }

    const fee = purchaseAmount * TRANSACTION_FEE;
    const totalCost = purchaseAmount + fee;

    if (totalCost > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You need M$${totalCost.toFixed(2)} (including 0.5% fee) to make this purchase`,
        variant: 'destructive',
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const rate = rates.find(r => r.term_weeks === selectedTerm);
      if (!rate) throw new Error('Rate not found');

      const maturityDate = addWeeks(new Date(), selectedTerm);
      const termYears = selectedTerm / 52;
      const totalReturn = purchaseAmount * (1 + (rate.annual_yield / 100) * termYears);

      // Withdraw from ManiFed balance (sends to @ManiFed)
      const { data: withdrawData, error: withdrawError } = await supabase.functions.invoke('managram', {
        body: {
          action: 'withdraw',
          amount: totalCost, // Include fee
        },
      });

      if (withdrawError || withdrawData?.error) {
        throw new Error(withdrawData?.error || 'Failed to process bond purchase');
      }

      // Create bond record
      const { error: bondError } = await supabase
        .from('bonds')
        .insert({
          user_id: user.id,
          amount: purchaseAmount,
          term_weeks: selectedTerm,
          annual_yield: rate.annual_yield,
          monthly_yield: rate.monthly_yield,
          maturity_date: maturityDate.toISOString(),
          total_return: totalReturn,
        });

      if (bondError) throw bondError;

      toast({
        title: 'Bond Purchased!',
        description: `M$${purchaseAmount.toLocaleString()} ${BOND_TERMS.find(t => t.weeks === selectedTerm)?.description} purchased (+ M$${fee.toFixed(2)} fee). You'll receive M$${totalReturn.toFixed(2)} at maturity.`,
      });

      // Refresh data
      await checkAuthAndFetchData();
      setAmount('');
      setSelectedTerm(null);

    } catch (error) {
      console.error('Error purchasing bond:', error);
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Could not complete bond purchase',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const selectedRate = rates.find(r => r.term_weeks === selectedTerm);
  const purchaseAmount = parseFloat(amount) || 0;
  const fee = purchaseAmount * TRANSACTION_FEE;
  const termYears = selectedTerm ? selectedTerm / 52 : 0;
  const estimatedReturn = selectedRate ? purchaseAmount * (1 + (selectedRate.annual_yield / 100) * termYears) : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={isAuthenticated ? "/hub" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed Bonds</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Treasury Bills</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/hub">
                    <Button variant="ghost" size="sm">Back to Hub</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/auth?mode=signup">
                    <Button variant="glow" size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero */}
        <div className="text-center mb-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <FileText className="w-4 h-4" />
            Fixed-Income Instruments
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            ManiFed <span className="text-gradient">Treasury Bills</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Earn stable yields on your M$ with our Treasury Bills. Fixed terms, guaranteed returns at maturity.
            Currently offering {rates[0]?.annual_yield || 6}% APY. <strong>0.5% transaction fee applies.</strong>
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Bond Selection */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
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
                    {BOND_TERMS.map((term) => {
                      const rate = rates.find(r => r.term_weeks === term.weeks);
                      const isSelected = selectedTerm === term.weeks;
                      return (
                        <button
                          key={term.weeks}
                          onClick={() => setSelectedTerm(term.weeks)}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border/50 bg-secondary/30 hover:border-primary/50'
                          }`}
                          disabled={!isAuthenticated}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-foreground">{term.label}</span>
                            {isSelected && <CheckCircle className="w-5 h-5 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{term.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="active">{rate?.annual_yield || 6}% APY</Badge>
                            <span className="text-xs text-muted-foreground">
                              ({rate?.monthly_yield || 0.5}% monthly)
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Amount Input */}
              {isAuthenticated && selectedTerm && (
                <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-primary" />
                      Investment Amount
                    </CardTitle>
                    <CardDescription>
                      Your ManiFed balance: M${balance.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!hasApiKey ? (
                      <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">Connect Your Manifold Account</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              You need to connect your Manifold account to purchase bonds.
                            </p>
                            <Link to="/settings">
                              <Button variant="outline" size="sm" className="mt-3">
                                Go to Settings
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">M$</span>
                          <Input
                            type="number"
                            placeholder="Enter amount..."
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-10 h-12 text-lg bg-secondary/50"
                            min={10}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Minimum purchase: M$10 • 0.5% transaction fee: M${fee.toFixed(2)}
                        </p>

                        {purchaseAmount >= 10 && (
                          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">At Maturity ({format(addWeeks(new Date(), selectedTerm), 'MMM d, yyyy')})</p>
                                <p className="text-2xl font-bold text-success">M${estimatedReturn.toFixed(2)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Profit</p>
                                <p className="text-lg font-semibold text-success">+M${(estimatedReturn - purchaseAmount).toFixed(2)}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Total cost: M${(purchaseAmount + fee).toFixed(2)} (including fee)
                            </p>
                          </div>
                        )}

                        <Button 
                          variant="glow" 
                          className="w-full gap-2"
                          onClick={handlePurchaseBond}
                          disabled={isPurchasing || purchaseAmount < 10 || (purchaseAmount + fee) > balance}
                        >
                          {isPurchasing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRight className="w-4 h-4" />
                          )}
                          Purchase Bond
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Non-tradable notice */}
              <Card className="glass border-warning/30 animate-slide-up" style={{ animationDelay: '300ms' }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Non-Tradable Instrument</p>
                      <p className="text-sm text-muted-foreground">
                        ManiFed T-Bills cannot be sold or transferred before maturity. Early redemption incurs a 50% penalty on accrued interest. 
                        This helps maintain the stability and predictability of returns.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - My Bonds */}
            <div className="space-y-6">
              {isAuthenticated ? (
                <Card className="glass animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      My Bonds
                    </CardTitle>
                    <CardDescription>
                      Your active Treasury Bill holdings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userBonds.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No bonds yet</p>
                        <p className="text-sm">Purchase your first Treasury Bill above</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userBonds.map((bond) => (
                          <div
                            key={bond.id}
                            className="p-3 rounded-lg bg-secondary/30 border border-border/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={bond.status === 'active' ? 'active' : 'secondary'}>
                                {bond.status === 'active' ? 'Active' : 'Matured'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {BOND_TERMS.find(t => t.weeks === bond.term_weeks)?.description}
                              </span>
                            </div>
                            <p className="font-semibold text-foreground">M${bond.amount.toLocaleString()}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>Return: M${bond.total_return.toFixed(2)}</span>
                              <span>Matures: {format(new Date(bond.maturity_date), 'MMM d')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass animate-slide-up" style={{ animationDelay: '150ms' }}>
                  <CardContent className="p-6 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                    <h3 className="font-semibold text-foreground mb-2">Sign In to Purchase</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create an account to start investing in Treasury Bills
                    </p>
                    <Link to="/auth?mode=signup">
                      <Button variant="glow" className="w-full">Get Started</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}