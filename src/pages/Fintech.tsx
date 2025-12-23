import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, BarChart3, Bot, Lock, Loader2, CreditCard, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/layout/Footer";
import IndexFunds from "@/components/fintech/IndexFunds";
import CalibrationGraph from "@/components/fintech/CalibrationGraph";
import BotPlayground from "@/components/fintech/BotPlayground";
import AdvancedOrders from "@/components/fintech/AdvancedOrders";
import manifedLogo from "@/assets/manifed-logo.png";

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
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <img src={manifedLogo} alt="ManiFed" className="w-10 h-10 rounded-lg" />
              <span className="font-display text-lg font-bold text-foreground">ManiFed Fintech</span>
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </Link>
            <Link to="/hub">
              <Button variant="ghost" size="sm" className="gap-2 font-serif">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {!hasAccess ? (
          // Subscription required view
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Sparkles className="w-16 h-16 mx-auto text-accent mb-4" />
              <h1 className="font-display text-4xl font-bold text-foreground mb-4">
                ManiFed Fintech
              </h1>
              <p className="font-serif text-xl text-muted-foreground max-w-2xl mx-auto">
                Premium AI-powered tools for prediction market traders. Arbitrage scanner, 
                market agent, index funds, and more.
              </p>
            </div>

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