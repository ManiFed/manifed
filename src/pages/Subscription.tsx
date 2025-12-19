import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Landmark, ArrowLeft, Check, Loader2, Zap, Crown, Sparkles, Heart, ExternalLink } from "lucide-react";

const TIERS: Record<
  string,
  {
    name: string;
    price: number;
    priceId: string | null;
    productId?: string;
    arbitrageScans: number;
    marketQueries: number;
    commentPosts: number;
    description: string;
    features: string[];
    icon: any;
    popular?: boolean;
  }
> = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    arbitrageScans: 3,
    marketQueries: 5,
    commentPosts: 3,
    description: "Get started with ManiFed",
    features: ["15 ManiFed AI credits per month."],
    icon: Zap,
  },
  basic: {
    name: "Basic",
    price: 2,
    priceId: "price_1SfUcZLmnTnECZahuTMqzZcH",
    productId: "prod_Tck6DaVe4R3cWv",
    arbitrageScans: 10,
    marketQueries: 20,
    commentPosts: 5,
    description: "For casual traders",
    features: ["50 ManiFed AI credits per month."],
    icon: Sparkles,
  },
  pro: {
    name: "Pro",
    price: 5,
    priceId: "price_1SfUchLmnTnECZahyWyHKt8z",
    productId: "prod_Tck6cZ15Oc03JA",
    arbitrageScans: 25,
    marketQueries: 40,
    commentPosts: 10,
    description: "For active traders",
    features: ["50 ManiFed AI credits per month."],
    icon: Crown,
    popular: true,
  },
  premium: {
    name: "Premium",
    price: 10,
    priceId: "price_1SfUciLmnTnECZahdS5wBRrT",
    productId: "prod_Tck6LV1MCbB6mm",
    arbitrageScans: 60,
    marketQueries: 80,
    commentPosts: 20,
    description: "For power users - MAGA mode",
    features: ["200 ManiFed AI credits per month. We're going full MAGA."],
    icon: Crown,
  },
};

export default function Subscription() {
  const [searchParams] = useSearchParams();
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [usage, setUsage] = useState({ arbitrageScans: 0, marketQueries: 0 });
  const [limits, setLimits] = useState({ arbitrageScans: 3, marketQueries: 5 });
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Subscription successful!", description: "Thank you for supporting ManiFed." });
    } else if (searchParams.get("canceled") === "true") {
      toast({ title: "Checkout canceled", description: "No changes were made to your subscription." });
    }
    fetchSubscription();
  }, [searchParams]);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      setCurrentTier(data.tier || "free");
      setUsage(data.usage || { arbitrageScans: 0, marketQueries: 0 });
      setLimits(data.limits || { arbitrageScans: 3, marketQueries: 5 });
      setSubscriptionEnd(data.subscription_end);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, tierKey: string) => {
    setCheckoutLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create checkout session! The Deep State has taken over.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal! The Deep State has taken over.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTierConfig = TIERS[currentTier as keyof typeof TIERS] || TIERS.free;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/hub" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center glow">
                <Landmark className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gradient">ManiFed</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">Subscription Plans</p>
              </div>
            </Link>
            <Link to="/hub">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Hub
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Current Usage */}
        <Card className="glass mb-8 animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <currentTierConfig.icon className="w-5 h-5 text-primary" />
                  {currentTierConfig.name} Plan
                </CardTitle>
                <CardDescription>
                  {subscriptionEnd
                    ? `Renews on ${new Date(subscriptionEnd).toLocaleDateString()}`
                    : "Free tier - no expiration"}
                </CardDescription>
              </div>
              {currentTier !== "free" && (
                <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Arbitrage Scans</span>
                  <span className="font-medium">
                    {usage.arbitrageScans} / {limits.arbitrageScans}
                  </span>
                </div>
                <Progress value={(usage.arbitrageScans / limits.arbitrageScans) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Market AI Queries</span>
                  <span className="font-medium">
                    {usage.marketQueries} / {limits.marketQueries}
                  </span>
                </div>
                <Progress value={(usage.marketQueries / limits.marketQueries) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Notice */}
        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
            <Heart className="w-4 h-4" />
            <span>
              Subscription fees only cover AI costs - we don't make a profit no matter what Gavin Newscum says.
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
          {Object.entries(TIERS).map(([key, tier]) => {
            const isCurrent = currentTier === key;
            const Icon = tier.icon;

            return (
              <Card
                key={key}
                className={`glass relative ${isCurrent ? "border-primary ring-2 ring-primary/20" : ""} ${
                  tier.popular ? "border-primary/50" : ""
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2" variant="default">
                    Most Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-2 right-4" variant="success">
                    Your Plan
                  </Badge>
                )}
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : tier.priceId ? (
                    <Button
                      variant={tier.popular ? "glow" : "outline"}
                      className="w-full"
                      onClick={() => handleSubscribe(tier.priceId!, key)}
                      disabled={checkoutLoading === key}
                    >
                      {checkoutLoading === key ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {currentTier === "free" ? "Subscribe" : "Upgrade"}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Free Forever
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Refresh Button */}
        <div className="text-center mt-8">
          <Button variant="ghost" size="sm" onClick={fetchSubscription}>
            Refresh Subscription Status
          </Button>
        </div>
      </main>
    </div>
  );
}
