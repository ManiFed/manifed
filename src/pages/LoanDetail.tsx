import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUserBalance } from '@/hooks/useUserBalance';
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Calendar,
  DollarSign,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  seeking_funding: { label: 'Seeking Funding', variant: 'pending' as const, icon: Clock },
  active: { label: 'Active', variant: 'active' as const, icon: TrendingUp },
  repaid: { label: 'Repaid', variant: 'success' as const, icon: CheckCircle },
  defaulted: { label: 'Defaulted', variant: 'destructive' as const, icon: XCircle },
};

const riskConfig = {
  low: { label: 'Low Risk', className: 'text-success bg-success/10 border-success/20' },
  medium: { label: 'Medium Risk', className: 'text-warning bg-warning/10 border-warning/20' },
  high: { label: 'High Risk', className: 'text-destructive bg-destructive/10 border-destructive/20' },
};

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
  funding_deadline: string | null;
  maturity_date: string | null;
  risk_score: string;
  collateral_description: string | null;
  manifold_market_id: string | null;
  created_at: string;
}

interface Investment {
  id: string;
  investor_username: string;
  amount: number;
  created_at: string;
}

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [investAmount, setInvestAmount] = useState('');
  const [investMessage, setInvestMessage] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { balance, fetchBalance, totalInvested } = useUserBalance();

  useEffect(() => {
    fetchLoanData();
    fetchUserSettings();
  }, [id]);

  const fetchLoanData = async () => {
    if (!id) return;
    
    try {
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .single();

      if (loanError) throw loanError;
      setLoan(loanData);

      const { data: investmentData, error: investmentError } = await supabase
        .from('investments')
        .select('*')
        .eq('loan_id', id)
        .order('created_at', { ascending: false });

      if (investmentError) throw investmentError;
      setInvestments(investmentData || []);
    } catch (error) {
      console.error('Error fetching loan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data } = await supabase
        .from('user_manifold_settings')
        .select('manifold_api_key, manifold_username')
        .eq('user_id', user.id)
        .maybeSingle();

      setHasApiKey(!!data?.manifold_api_key);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleCancelLoan = async () => {
    if (!loan) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel this loan? All investors will be refunded M$${loan.funded_amount.toLocaleString()} immediately.`
    );

    if (!confirmed) return;

    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-loan', {
        body: { loanId: loan.id }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Loan Cancelled',
        description: data.message,
      });

      navigate('/marketplace');
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: 'Failed to cancel loan',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">Loan Not Found</h1>
            <Link to="/marketplace">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const fundingProgress = (loan.funded_amount / loan.amount) * 100;
  const status = statusConfig[loan.status as keyof typeof statusConfig] || statusConfig.seeking_funding;
  const risk = riskConfig[loan.risk_score as keyof typeof riskConfig] || riskConfig.medium;
  const StatusIcon = status.icon;
  const remainingAmount = loan.amount - loan.funded_amount;

  const handleInvest = async () => {
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum investment is M$10',
        variant: 'destructive',
      });
      return;
    }
    if (!hasApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first',
        variant: 'destructive',
      });
      return;
    }

    // CHECK MANIFED BALANCE BEFORE INVESTING
    if (amount > balance) {
      toast({
        title: 'Insufficient ManiFed Balance',
        description: `You need to deposit M$${(amount - balance).toLocaleString()} more to make this investment. Click on your wallet to deposit.`,
        variant: 'destructive',
      });
      return;
    }

    setIsInvesting(true);
    try {
      // Get user info for recording investment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_username')
        .eq('user_id', user.id)
        .single();

      // Call the managram function to send funds to borrower (API key fetched server-side)
      const { data, error } = await supabase.functions.invoke('managram', {
        body: {
          action: 'invest',
          amount: amount,
          recipientUsername: loan.borrower_username,
          message: investMessage || `Loan investment for: ${loan.title}`,
          loanId: loan.id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Record the investment in the database
      const { error: investError } = await supabase
        .from('investments')
        .insert({
          loan_id: loan.id,
          investor_user_id: user.id,
          investor_username: settings?.manifold_username || 'Anonymous',
          amount: amount,
          message: investMessage,
        });

      if (investError) throw investError;

      // Update loan funded amount
      const { error: loanError } = await supabase
        .from('loans')
        .update({ 
          funded_amount: loan.funded_amount + amount,
          status: loan.funded_amount + amount >= loan.amount ? 'active' : 'seeking_funding'
        })
        .eq('id', loan.id);

      if (loanError) throw loanError;

      // Refresh balance from server (edge function already updated it)
      await fetchBalance();

      toast({
        title: 'Investment Successful!',
        description: `You invested M$${amount.toLocaleString()} in this loan`,
      });
      
      setInvestAmount('');
      setInvestMessage('');
      fetchLoanData(); // Refresh loan data
    } catch (error) {
      console.error('Investment error:', error);
      toast({
        title: 'Investment Failed',
        description: error instanceof Error ? error.message : 'Failed to process investment',
        variant: 'destructive',
      });
    } finally {
      setIsInvesting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Link to="/marketplace" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass animate-slide-up">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge variant={status.variant} className="mb-2">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                      {loan.title}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>by @{loan.borrower_username}</span>
                      <Badge variant="outline">Credit: {loan.borrower_reputation}</Badge>
                    </div>
                  </div>
                  <div className={cn('px-3 py-2 rounded-lg border flex items-center gap-2', risk.className)}>
                    <AlertTriangle className="w-4 h-4" />
                    {risk.label}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">{loan.description}</p>

                {loan.collateral_description && (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Collateral
                    </div>
                    <p className="text-sm text-muted-foreground">{loan.collateral_description}</p>
                  </div>
                )}

                {/* Loan Terms Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <DollarSign className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loan Amount</p>
                    <p className="text-xl font-bold text-foreground">M${loan.amount.toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <TrendingUp className="w-5 h-5 text-success mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="text-xl font-bold text-success">{loan.interest_rate}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Calendar className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Term Length</p>
                    <p className="text-xl font-bold text-foreground">{loan.term_days} days</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Investors</p>
                    <p className="text-xl font-bold text-foreground">{investments.length}</p>
                  </div>
                </div>

                {/* Funding Progress */}
                {loan.status === 'seeking_funding' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Funding Progress</span>
                      <span className="font-semibold text-primary">{fundingProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={fundingProgress} className="h-3" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        M${loan.funded_amount.toLocaleString()} funded
                      </span>
                      <span className="text-muted-foreground">
                        M${remainingAmount.toLocaleString()} remaining
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Investors List */}
            <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Investors ({investments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {investments.length > 0 ? (
                  <div className="space-y-3">
                    {investments.map((investor) => (
                      <div
                        key={investor.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                      >
                        <div>
                          <p className="font-medium text-foreground">@{investor.investor_username}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(investor.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold text-foreground">
                          M${Number(investor.amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No investors yet. Be the first!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cancel Loan Button - Only show to loan owner */}
            {currentUserId === loan.borrower_user_id && (loan.status === 'seeking_funding' || loan.status === 'active') && (
              <Card className="glass border-destructive/30 animate-slide-up" style={{ animationDelay: '150ms' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">Cancel This Loan</p>
                      <p className="text-sm text-muted-foreground">
                        All investors will be refunded their principal immediately.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelLoan}
                      disabled={isCancelling}
                    >
                      {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Cancel Loan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {loan.status === 'seeking_funding' && (
              <Card className="glass animate-slide-up sticky top-24" style={{ animationDelay: '150ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Invest in this Loan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!hasApiKey && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                      <p className="text-warning font-medium">Connect Manifold Account</p>
                      <p className="text-muted-foreground">
                        Go to <Link to="/settings" className="text-primary hover:underline">Settings</Link> to connect.
                      </p>
                    </div>
                  )}

                  {hasApiKey && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                      <p className="text-muted-foreground">Your ManiFed Balance</p>
                      <p className="text-xl font-bold text-foreground">M${balance.toLocaleString()}</p>
                      {balance < 10 && (
                        <p className="text-warning text-xs mt-1">
                          Deposit funds via the wallet icon in the header
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Investment Amount (M$)</p>
                    <Input
                      type="number"
                      placeholder="Enter amount..."
                      value={investAmount}
                      onChange={(e) => setInvestAmount(e.target.value)}
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Min: M$10
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Payment Message (Optional)</p>
                    <Textarea
                      placeholder="Add a message for the borrower..."
                      value={investMessage}
                      onChange={(e) => setInvestMessage(e.target.value)}
                      className="bg-secondary/50"
                      rows={2}
                    />
                  </div>

                  {investAmount && parseFloat(investAmount) > 0 && (
                    <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-bold text-success">
                        M$
                        {(
                          parseFloat(investAmount) *
                          (1 + loan.interest_rate / 100)
                        ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{loan.interest_rate}% in {loan.term_days} days
                      </p>
                    </div>
                  )}

                  <Button 
                    variant="glow" 
                    className="w-full" 
                    size="lg" 
                    onClick={handleInvest}
                    disabled={isInvesting || !hasApiKey || balance < 10}
                  >
                    {isInvesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Fund This Loan
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By investing, you agree to the loan terms and understand the associated risks.
                  </p>
                </CardContent>
              </Card>
            )}

            {loan.manifold_market_id && (
              <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
                <CardContent className="p-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={`https://manifold.markets/${loan.manifold_market_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on Manifold
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}