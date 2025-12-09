import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { mockLoans } from '@/data/mockLoans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const [investAmount, setInvestAmount] = useState('');
  const [investMessage, setInvestMessage] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string | null>(null);

  const loan = mockLoans.find((l) => l.id === id);

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

  const fundingProgress = (loan.fundedAmount / loan.amount) * 100;
  const status = statusConfig[loan.status];
  const risk = riskConfig[loan.riskScore];
  const StatusIcon = status.icon;
  const remainingAmount = loan.amount - loan.fundedAmount;

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
    if (amount > remainingAmount) {
      toast({
        title: 'Amount too high',
        description: `Maximum investment is M$${remainingAmount.toLocaleString()}`,
        variant: 'destructive',
      });
      return;
    }
    if (!userApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first',
        variant: 'destructive',
      });
      return;
    }

    setIsInvesting(true);
    try {
      // Call the managram function to invest
      const { data, error } = await supabase.functions.invoke('managram', {
        body: {
          action: 'invest',
          amount: amount,
          userApiKey: userApiKey,
          recipientUsername: loan.borrower.username,
          message: investMessage || `Loan investment for: ${loan.title}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Investment submitted!',
        description: `You invested M$${amount.toLocaleString()} in this loan`,
      });
      setInvestAmount('');
      setInvestMessage('');
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
                      <span>by @{loan.borrower.username}</span>
                      <Badge variant="outline">Credit: {loan.borrower.reputation}</Badge>
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

                {loan.collateralDescription && (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      Collateral
                    </div>
                    <p className="text-sm text-muted-foreground">{loan.collateralDescription}</p>
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
                    <p className="text-xl font-bold text-success">{loan.interestRate}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Calendar className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Term Length</p>
                    <p className="text-xl font-bold text-foreground">{loan.termDays} days</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 text-center">
                    <Users className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Investors</p>
                    <p className="text-xl font-bold text-foreground">{loan.investors.length}</p>
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
                        M${loan.fundedAmount.toLocaleString()} funded
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
                  Investors ({loan.investors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loan.investors.length > 0 ? (
                  <div className="space-y-3">
                    {loan.investors.map((investor) => (
                      <div
                        key={investor.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                      >
                        <div>
                          <p className="font-medium text-foreground">@{investor.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(investor.investedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold text-foreground">
                          M${investor.amount.toLocaleString()}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {loan.status === 'seeking_funding' && (
              <Card className="glass animate-slide-up sticky top-24" style={{ animationDelay: '150ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Invest in this Loan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!userApiKey && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                      <p className="text-warning font-medium">Connect Manifold Account</p>
                      <p className="text-muted-foreground">
                        Go to <Link to="/settings" className="text-primary hover:underline">Settings</Link> to connect.
                      </p>
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
                      Max: M${remainingAmount.toLocaleString()}
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
                          (1 + loan.interestRate / 100)
                        ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{loan.interestRate}% in {loan.termDays} days
                      </p>
                    </div>
                  )}

                  <Button 
                    variant="glow" 
                    className="w-full" 
                    size="lg" 
                    onClick={handleInvest}
                    disabled={isInvesting || !userApiKey}
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

            {loan.manifoldMarketId && (
              <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
                <CardContent className="p-4">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={`https://manifold.markets/${loan.manifoldMarketId}`}
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

            <Card className="glass animate-slide-up" style={{ animationDelay: '250ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">How it Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p>Fund the loan from your ManiFed balance</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p>Borrower receives M$ via managram</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p>Receive principal + interest at maturity</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
