import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, BarChart3, Bot, Lock, Loader2, CreditCard, Sparkles, Gift, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/layout/Footer";
import IndexFunds from "@/components/fintech/IndexFunds";
import CalibrationGraph from "@/components/fintech/CalibrationGraph";
import BotPlayground from "@/components/fintech/BotPlayground";
import AdvancedOrders from "@/components/fintech/AdvancedOrders";
import { UniversalHeader } from "@/components/layout/UniversalHeader";

interface SubscriptionRate {
  plan_type: string;
  mana_price: number;
  is_on_sale: boolean;
  sale_price: number | null;
}

interface FintechSubscription {
  plan_type: string;
  expires_at: string | null;
  is_active: boolean;
  is_gifted: boolean;
  is_trial?: boolean;
  trial_ends_at?: string | null;
}

export default function Fintech() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<FintechSubscription | null>(null);
  const [rates, setRates] = useState<SubscriptionRate[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check if admin (admins get free access)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setIsAdmin(true);
        setHasAccess(true);
        setIsLoading(false);
        return;
      }

      // Check subscription
      const { data: subData } = await supabase
        .from('fintech_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData);
        // Check if they already used trial
        if (subData.trial_ends_at) {
          setHasUsedTrial(true);
        }
        const isActive = subData.is_active && 
          (!subData.expires_at || new Date(subData.expires_at) > new Date());
        setHasAccess(isActive);
        
        if (!isActive && subData.expires_at) {
          setShowPaywall(true);
        }
      }

      // Fetch rates
      const { data: ratesData } = await supabase
        .from('subscription_rates')
        .select('*')
        .order('mana_price', { ascending: true });

      if (ratesData) {
        setRates(ratesData);
      }
    } catch (error) {
      console.error('Access check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startFreeTrial = async () => {
    setIsStartingTrial(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-fintech-trial');
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Trial Started!',
        description: 'Your 7-day free trial is now active. Enjoy ManiFed Fintech!',
      });

      navigate('/fintech/menu');
    } catch (error) {
      console.error('Trial error:', error);
      toast({
        title: 'Could not start trial',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setSelectedPlan(planType);
    setShowPaywall(true);
  };

  const processPayment = async () => {
    if (!apiKey.trim() || !selectedPlan) {
      toast({
        title: 'API Key Required',
        description: 'Enter your Manifold API key to process payment.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const rate = rates.find(r => r.plan_type === selectedPlan);
      const price = rate?.is_on_sale && rate.sale_price ? rate.sale_price : rate?.mana_price || 0;

      // Process payment via edge function
      const { data, error } = await supabase.functions.invoke('process-fintech-subscription', {
        body: {
          apiKey,
          planType: selectedPlan,
          amount: price,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Subscription Activated!',
        description: `Your ${selectedPlan} plan is now active.`,
      });

      setShowPaywall(false);
      setApiKey("");
      // Redirect to fintech menu after payment
      navigate('/fintech/menu');
      checkAccess(); // Refresh subscription data
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'monthly': return '1 Month';
      case 'quarterly': return '3 Months';
      case 'yearly': return '1 Year';
      default: return planType;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="glass max-w-md w-full">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="font-display">Sign In Required</CardTitle>
            <CardDescription className="font-serif">
              Please sign in to access ManiFed Fintech tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth">
              <Button className="w-full font-serif">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <UniversalHeader />

      <main className="flex-1 container mx-auto px-4 py-8 mt-4">
        {!hasAccess ? (
          // Subscription required view
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <Sparkles className="w-16 h-16 mx-auto text-accent mb-4" />
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
                ManiFed Fintech
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Premium AI-powered tools for prediction market traders. Arbitrage scanner, 
                market agent, index funds, and more.
              </p>
            </div>

            {/* Free Trial Card */}
            {!hasUsedTrial && (
              <Card className="glass border-2 border-primary/50 mb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
                <CardContent className="p-8 relative">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-2xl bg-primary/10">
                        <Gift className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">7-Day Free Trial</h3>
                        <p className="text-muted-foreground">
                          Try all premium features free. No payment required.
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="lg" 
                      className="px-8 gap-2 text-lg"
                      onClick={startFreeTrial}
                      disabled={isStartingTrial}
                    >
                      {isStartingTrial ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />Starting...</>
                      ) : (
                        <>Start Free Trial</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {rates.map((rate) => (
                <Card 
                  key={rate.plan_type} 
                  className={`glass border-2 transition-all ${
                    rate.plan_type === 'quarterly' ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <CardHeader className="text-center">
                    <CardTitle className="font-display">{getPlanLabel(rate.plan_type)}</CardTitle>
                    <div className="mt-4">
                      {rate.is_on_sale && rate.sale_price ? (
                        <>
                          <span className="text-muted-foreground line-through text-lg">
                            M${rate.mana_price}
                          </span>
                          <span className="font-display text-4xl font-bold text-accent ml-2">
                            M${rate.sale_price}
                          </span>
                        </>
                      ) : (
                        <span className="font-display text-4xl font-bold text-foreground">
                          M${rate.mana_price}
                        </span>
                      )}
                    </div>
                    {rate.plan_type === 'quarterly' && (
                      <Badge className="mt-2 bg-accent text-accent-foreground">Best Value</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full font-serif" 
                      variant={rate.plan_type === 'quarterly' ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(rate.plan_type)}
                    >
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="font-display">What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="font-serif space-y-2 text-muted-foreground">
                  <li>✓ AI Arbitrage Scanner - Find mispriced markets</li>
                  <li>✓ Market Agent - Ask AI about any market</li>
                  <li>✓ Index Funds - Batch trades on curated markets</li>
                  <li>✓ Calibration Tools - Analyze your predictions</li>
                  <li>✓ Bot Builder - Create custom trading bots</li>
                  <li>✓ Mispriced Market Scanner</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Full access view
          <>
            <div className="mb-8 text-center">
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">Fintech Tools</h1>
              <p className="font-serif text-muted-foreground">Advanced prediction market analysis and trading tools</p>
              {subscription?.expires_at && (
                <Badge variant="outline" className="mt-2 font-serif">
                  Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                </Badge>
              )}
            </div>

            <Tabs defaultValue="index-funds" className="space-y-6">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
                <TabsTrigger value="index-funds" className="gap-2 font-serif">
                  <TrendingUp className="w-4 h-4" />
                  Index Funds
                </TabsTrigger>
                <TabsTrigger value="advanced-orders" className="gap-2 font-serif">
                  <Sparkles className="w-4 h-4" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="calibration" className="gap-2 font-serif">
                  <BarChart3 className="w-4 h-4" />
                  Calibration
                </TabsTrigger>
                <TabsTrigger value="bot-builder" className="gap-2 font-serif">
                  <Bot className="w-4 h-4" />
                  Bot Builder
                </TabsTrigger>
              </TabsList>

              <TabsContent value="index-funds">
                <IndexFunds />
              </TabsContent>

              <TabsContent value="advanced-orders">
                <AdvancedOrders />
              </TabsContent>

              <TabsContent value="calibration">
                <CalibrationGraph />
              </TabsContent>

              <TabsContent value="bot-builder">
                <BotPlayground />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Payment Dialog */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {subscription?.expires_at ? 'Renew Your Subscription' : 'Subscribe to ManiFed Fintech'}
            </DialogTitle>
            <DialogDescription className="font-serif">
              {selectedPlan && (
                <>
                  Selected plan: <strong>{getPlanLabel(selectedPlan)}</strong> - 
                  M${rates.find(r => r.plan_type === selectedPlan)?.mana_price || 0}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="font-serif">Manifold API Key (one-time use)</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="mt-1 font-serif"
              />
              <p className="text-xs text-muted-foreground mt-1 font-serif">
                Your API key is used only for this transaction and is not stored.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaywall(false)} className="font-serif">
              Cancel
            </Button>
            <Button onClick={processPayment} disabled={isProcessing} className="gap-2 font-serif">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Pay & Subscribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}