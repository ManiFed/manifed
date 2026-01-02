import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { UniversalHeader } from "@/components/layout/UniversalHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useUserBalance } from "@/hooks/useUserBalance";
import { DollarSign, Percent, Calendar as CalendarIcon, FileText, Shield, Plus, X, ExternalLink, Clock, BadgeCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Validation schema for loan creation
const loanSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(2000, "Description must be less than 2000 characters"),
  amount: z.number().min(100, "Minimum loan amount is M$100").max(1000000, "Maximum loan amount is M$1,000,000"),
  interestRate: z.number().min(0, "Interest rate cannot be negative").max(100, "Interest rate cannot exceed 100%"),
  termDays: z.number().int("Term must be a whole number").min(1, "Minimum term is 1 day").max(365, "Maximum term is 365 days"),
  fundingPeriodDays: z.number().int("Funding period must be a whole number").min(1, "Minimum funding period is 1 day").max(30, "Maximum funding period is 30 days"),
  collateralDescription: z.string().max(1000, "Collateral description must be less than 1000 characters").optional()
});

interface EmbeddedMarket {
  url: string;
  slug: string;
}

export default function CreateLoan() {
  const navigate = useNavigate();
  const { balance } = useUserBalance();
  const [loanType, setLoanType] = useState<'request' | 'offer'>('request');
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: 1000,
    interestRate: 10,
    termDays: 30,
    fundingPeriodDays: 7,
    collateralDescription: ""
  });
  const [fundingDeadline, setFundingDeadline] = useState<Date | undefined>(addDays(new Date(), 7));
  const [maturityDate, setMaturityDate] = useState<Date | undefined>(addDays(addDays(new Date(), 7), 30)); // After funding period
  const [embeddedMarkets, setEmbeddedMarkets] = useState<EmbeddedMarket[]>([]);
  const [newMarketUrl, setNewMarketUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [wantsResearchFee, setWantsResearchFee] = useState(false);
  const [manifoldUsername, setManifoldUsername] = useState("");
  const [hasWithdrawalUsername, setHasWithdrawalUsername] = useState(false);

  useEffect(() => {
    checkUserSettings();
  }, []);

  const checkUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from("user_manifold_settings")
        .select("withdrawal_username, manifold_username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings?.withdrawal_username || settings?.manifold_username) {
        setHasWithdrawalUsername(true);
        setManifoldUsername(settings.withdrawal_username || settings.manifold_username || "");
      }
    } catch (error) {
      console.error("Error checking settings:", error);
    }
  };

  // Update maturity date when funding period or term changes
  useEffect(() => {
    if (fundingDeadline) {
      setMaturityDate(addDays(fundingDeadline, formData.termDays));
    }
  }, [fundingDeadline, formData.termDays]);

  const handleAmountInput = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num >= 0) {
      setFormData({ ...formData, amount: num });
      setValidationErrors(prev => ({ ...prev, amount: "" }));
    }
  };

  const handleInterestInput = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (!isNaN(num) && num >= 0) {
      setFormData({ ...formData, interestRate: num });
      setValidationErrors(prev => ({ ...prev, interestRate: "" }));
    }
  };

  const handleTermInput = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num >= 1) {
      setFormData({ ...formData, termDays: num });
      setValidationErrors(prev => ({ ...prev, termDays: "" }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && fundingDeadline) {
      const days = Math.ceil((date.getTime() - fundingDeadline.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        setFormData({ ...formData, termDays: days });
        setMaturityDate(date);
      }
    }
  };

  const parseManifoldUrl = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "manifold.markets") {
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
          return `${pathParts[0]}/${pathParts[1]}`;
        }
      }
    } catch {}
    return null;
  };

  const handleAddMarket = () => {
    const slug = parseManifoldUrl(newMarketUrl);
    if (!slug) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Manifold Markets URL",
        variant: "destructive"
      });
      return;
    }
    if (embeddedMarkets.some(m => m.slug === slug)) {
      toast({
        title: "Already added",
        description: "This market is already in your list",
        variant: "destructive"
      });
      return;
    }
    setEmbeddedMarkets([...embeddedMarkets, { url: newMarketUrl, slug }]);
    setNewMarketUrl("");
  };

  const handleRemoveMarket = (slug: string) => {
    setEmbeddedMarkets(embeddedMarkets.filter(m => m.slug !== slug));
  };

  const expectedReturn = formData.amount * (1 + formData.interestRate / 100);
  const monthlyEquivalent = (formData.interestRate / formData.termDays) * 30;
  const researchFee = formData.amount >= 10000 ? 100 : 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Check if user needs to enter Manifold username
    if (!hasWithdrawalUsername && !manifoldUsername.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter your Manifold username before creating a loan",
        variant: "destructive"
      });
      return;
    }

    // Validate form data with Zod
    const validationResult = loanSchema.safeParse({
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      interestRate: formData.interestRate,
      termDays: formData.termDays,
      fundingPeriodDays: formData.fundingPeriodDays,
      collateralDescription: formData.collateralDescription || undefined
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach(err => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(errors);
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    // Check balance for research fee if selected
    if (wantsResearchFee && balance < researchFee) {
      toast({
        title: "Insufficient Balance",
        description: `You need M$${researchFee} for the research fee. Your balance: M$${balance.toLocaleString()}`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to create a loan",
          variant: "destructive"
        });
        return;
      }

      // Save Manifold username if entered
      if (!hasWithdrawalUsername && manifoldUsername.trim()) {
        await supabase.from("user_manifold_settings").upsert({
          user_id: user.id,
          withdrawal_username: manifoldUsername.trim()
        }, { onConflict: 'user_id' });
      }

      const usernameToUse = manifoldUsername.trim() || "Anonymous";

      // Deduct research fee if requested
      if (wantsResearchFee) {
        const { error: feeError } = await supabase.rpc("modify_user_balance", {
          p_user_id: user.id,
          p_amount: researchFee,
          p_operation: "subtract"
        });
        if (feeError) {
          throw new Error("Failed to deduct research fee: " + feeError.message);
        }

        // Record the fee transaction
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: "withdraw",
          amount: -researchFee,
          description: `Research fee for loan verification`
        });
      }

      // Insert the loan into the database
      const validatedData = validationResult.data;
      const { error } = await supabase.from("loans").insert({
        borrower_user_id: user.id,
        borrower_username: usernameToUse,
        title: validatedData.title,
        description: validatedData.description,
        amount: validatedData.amount,
        interest_rate: validatedData.interestRate,
        term_days: validatedData.termDays,
        funding_period_days: validatedData.fundingPeriodDays,
        funding_deadline: fundingDeadline?.toISOString() || null,
        collateral_description: validatedData.collateralDescription || null,
        maturity_date: maturityDate?.toISOString() || null,
        status: "seeking_funding",
        risk_score: "medium",
        loan_type: loanType,
        research_fee_paid: wantsResearchFee,
        research_fee_amount: wantsResearchFee ? researchFee : null
      });

      if (error) throw error;

      toast({
        title: loanType === 'offer' ? "Loan offer created!" : "Loan request created!",
        description: "Your loan is now live on the marketplace"
      });
      navigate("/marketplace");
    } catch (error) {
      console.error("Error creating loan:", error);
      toast({
        title: "Error creating loan",
        description: error instanceof Error ? error.message : "Failed to create loan",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <UniversalHeader />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Create a <span className="text-gradient">Loan</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Request funding or offer a loan to other traders.
          </p>
        </div>

        {/* Loan Type Tabs */}
        <Tabs value={loanType} onValueChange={(v) => setLoanType(v as 'request' | 'offer')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Request a Loan</TabsTrigger>
            <TabsTrigger value="offer">Offer a Loan</TabsTrigger>
          </TabsList>
          <TabsContent value="request">
            <p className="text-sm text-muted-foreground mt-2">
              You're seeking funding. Investors will contribute to your loan.
            </p>
          </TabsContent>
          <TabsContent value="offer">
            <p className="text-sm text-muted-foreground mt-2">
              You're offering capital. Borrowers can accept or negotiate your terms.
            </p>
          </TabsContent>
        </Tabs>

        <div className="grid lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Manifold Username - only show if not configured */}
            {!hasWithdrawalUsername && (
              <Card className="glass border-warning/30 animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-5 h-5" />
                    Manifold Username Required
                  </CardTitle>
                  <CardDescription>Enter your Manifold username to create a loan</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Your Manifold username..."
                    value={manifoldUsername}
                    onChange={(e) => setManifoldUsername(e.target.value)}
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This will be displayed on your loan. You can also configure this in <Link to="/settings" className="text-primary hover:underline">Settings</Link>.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="glass animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Loan Details
                </CardTitle>
                <CardDescription>
                  {loanType === 'request' 
                    ? "Describe what you need the funding for"
                    : "Describe the loan you're offering"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Loan Title</Label>
                  <Input
                    id="title"
                    placeholder={loanType === 'request' ? "e.g., Bail out Tumbles" : "e.g., Offering M$5k for market makers"}
                    value={formData.title}
                    onChange={e => {
                      setFormData({ ...formData, title: e.target.value });
                      setValidationErrors(prev => ({ ...prev, title: "" }));
                    }}
                    className={cn("bg-secondary/50", validationErrors.title && "border-destructive")}
                    maxLength={100}
                  />
                  {validationErrors.title && <p className="text-xs text-destructive">{validationErrors.title}</p>}
                  <p className="text-xs text-muted-foreground">{formData.title.length}/100 characters (min 5)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder={loanType === 'request' 
                      ? "Explain your trading strategy and why investors should fund your loan..."
                      : "Describe the ideal borrower and use case for this loan..."}
                    value={formData.description}
                    onChange={e => {
                      setFormData({ ...formData, description: e.target.value });
                      setValidationErrors(prev => ({ ...prev, description: "" }));
                    }}
                    className={cn("bg-secondary/50 min-h-[120px]", validationErrors.description && "border-destructive")}
                    maxLength={2000}
                  />
                  {validationErrors.description && <p className="text-xs text-destructive">{validationErrors.description}</p>}
                  <p className="text-xs text-muted-foreground">{formData.description.length}/2000 characters (min 20)</p>
                </div>

                {/* Embedded Markets */}
                <div className="space-y-3">
                  <Label>Target Markets (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    {loanType === 'request' 
                      ? "Add Manifold Markets you plan to invest in with this loan"
                      : "Specify markets where you expect the borrower to trade"}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://manifold.markets/user/market-slug"
                      value={newMarketUrl}
                      onChange={e => setNewMarketUrl(e.target.value)}
                      className="bg-secondary/50"
                      onKeyPress={e => e.key === "Enter" && (e.preventDefault(), handleAddMarket())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddMarket}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {embeddedMarkets.length > 0 && (
                    <div className="space-y-2">
                      {embeddedMarkets.map(market => (
                        <div key={market.slug} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <a href={market.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors truncate flex-1">
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            <span className="truncate">{market.slug}</span>
                          </a>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveMarket(market.slug)} className="shrink-0">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass animate-slide-up" style={{ animationDelay: "200ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Loan Terms
                </CardTitle>
                <CardDescription>Set your funding amount and terms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Loan Amount</Label>
                    <Input
                      value={`M$${formData.amount.toLocaleString()}`}
                      onChange={e => handleAmountInput(e.target.value)}
                      className={cn("w-32 text-right font-bold bg-secondary/50 h-8", validationErrors.amount && "border-destructive")}
                    />
                  </div>
                  {validationErrors.amount && <p className="text-xs text-destructive">{validationErrors.amount}</p>}
                  <Slider
                    value={[Math.min(formData.amount, 100000)]}
                    onValueChange={value => {
                      setFormData({ ...formData, amount: value[0] });
                      setValidationErrors(prev => ({ ...prev, amount: "" }));
                    }}
                    min={100}
                    max={100000}
                    step={100}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>M$100</span>
                    <span>M$100,000</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Interest Rate
                    </Label>
                    <Input
                      value={`${formData.interestRate}%`}
                      onChange={e => handleInterestInput(e.target.value)}
                      className={cn("w-24 text-right font-bold text-success bg-secondary/50 h-8", validationErrors.interestRate && "border-destructive")}
                    />
                  </div>
                  {validationErrors.interestRate && <p className="text-xs text-destructive">{validationErrors.interestRate}</p>}
                  <Slider
                    value={[Math.min(Math.max(formData.interestRate, 1), 25)]}
                    onValueChange={value => {
                      setFormData({ ...formData, interestRate: value[0] });
                      setValidationErrors(prev => ({ ...prev, interestRate: "" }));
                    }}
                    min={1}
                    max={25}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1%</span>
                    <span>25% (max 100%)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Loan Term
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={`${formData.termDays} days`}
                        onChange={e => handleTermInput(e.target.value)}
                        className={cn("w-28 text-right font-bold bg-secondary/50 h-8", validationErrors.termDays && "border-destructive")}
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <CalendarIcon className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={maturityDate}
                            onSelect={handleDateSelect}
                            disabled={date => date < (fundingDeadline || new Date())}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {validationErrors.termDays && <p className="text-xs text-destructive">{validationErrors.termDays}</p>}
                  <Slider
                    value={[Math.min(Math.max(formData.termDays, 7), 180)]}
                    onValueChange={value => {
                      setFormData({ ...formData, termDays: value[0] });
                      setValidationErrors(prev => ({ ...prev, termDays: "" }));
                    }}
                    min={7}
                    max={180}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>7 days</span>
                    <span>180 days (max 365)</span>
                  </div>
                  {maturityDate && (
                    <p className="text-sm text-muted-foreground">
                      Maturity date: <span className="text-foreground font-medium">{format(maturityDate, "PPP")}</span>
                      <span className="text-xs ml-2">(after funding period ends)</span>
                    </p>
                  )}
                </div>

                {/* Funding Period */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Funding Period
                    </Label>
                    <Input
                      value={`${formData.fundingPeriodDays} days`}
                      onChange={e => {
                        const num = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                        if (!isNaN(num) && num >= 1) {
                          setFormData({ ...formData, fundingPeriodDays: Math.min(num, 30) });
                          setFundingDeadline(addDays(new Date(), Math.min(num, 30)));
                        }
                      }}
                      className="w-28 text-right font-bold bg-secondary/50 h-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {loanType === 'request' 
                      ? "How long investors can contribute to this loan before it closes."
                      : "How long borrowers have to accept your offer."}
                  </p>
                  <Slider
                    value={[formData.fundingPeriodDays]}
                    onValueChange={value => {
                      setFormData({ ...formData, fundingPeriodDays: value[0] });
                      setFundingDeadline(addDays(new Date(), value[0]));
                    }}
                    min={1}
                    max={30}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>30 days</span>
                  </div>
                  {fundingDeadline && (
                    <p className="text-sm text-muted-foreground">
                      Funding deadline: <span className="text-foreground font-medium">{format(fundingDeadline, "PPP")}</span>
                    </p>
                  )}
                  <p className="text-xs text-warning">
                    Note: Funds will only be sent to {loanType === 'request' ? 'you' : 'the borrower'} after the funding period ends.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass animate-slide-up" style={{ animationDelay: "300ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Collateral (Optional)
                </CardTitle>
                <CardDescription>Describe any collateral being offered to secure the loan</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., I have to take one of your dares at Manifest 2026"
                  value={formData.collateralDescription}
                  onChange={e => setFormData({ ...formData, collateralDescription: e.target.value })}
                  className="bg-secondary/50"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.collateralDescription.length}/1000 characters
                </p>
              </CardContent>
            </Card>

            {/* Research Fee Option */}
            <Card className="glass animate-slide-up border-primary/30" style={{ animationDelay: "350ms" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-primary" />
                  Request Verification Badge
                </CardTitle>
                <CardDescription>Pay a research fee to be considered for the "Trustworthy-ish" badge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Request verification review</p>
                    <p className="text-xs text-muted-foreground">
                      ManiFed will review your loan and may add a "Trustworthy-ish" badge if approved.
                    </p>
                  </div>
                  <Switch
                    checked={wantsResearchFee}
                    onCheckedChange={setWantsResearchFee}
                  />
                </div>
                {wantsResearchFee && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-foreground font-medium">Research Fee: M${researchFee}</p>
                    <p className="text-xs text-muted-foreground">
                      {formData.amount >= 10000 
                        ? "M$100 for loans ≥M$10,000"
                        : "M$50 for loans <M$10,000"}
                    </p>
                    <p className="text-xs text-warning mt-2">
                      Note: Payment does not guarantee approval. Badge is at admin discretion.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" variant="glow" size="xl" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating Loan..." : loanType === 'offer' ? "Post Loan Offer" : "Submit Loan Request"}
            </Button>
          </form>

          {/* Preview Sidebar */}
          <div className="space-y-6">
            <Card className="glass animate-slide-up" style={{ animationDelay: "400ms" }}>
              <CardHeader>
                <CardTitle className="text-lg">Loan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-semibold text-foreground capitalize">{loanType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">M${formData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate</span>
                  <span className="font-semibold text-success">{formData.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Term</span>
                  <span className="font-semibold text-foreground">{formData.termDays} days</span>
                </div>
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Return</span>
                    <span className="font-bold text-success">M${expectedReturn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Equiv.</span>
                    <span className="text-foreground">{monthlyEquivalent.toFixed(2)}%/mo</span>
                  </div>
                </div>
                {wantsResearchFee && (
                  <div className="border-t border-border/50 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Research Fee</span>
                      <span className="text-warning">M${researchFee}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
