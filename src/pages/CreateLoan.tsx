import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Percent, Calendar, FileText, Shield, Sparkles } from 'lucide-react';

export default function CreateLoan() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: 1000,
    interestRate: 10,
    termDays: 30,
    collateralDescription: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expectedReturn = formData.amount * (1 + formData.interestRate / 100);
  const monthlyEquivalent = (formData.interestRate / formData.termDays) * 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({ title: 'Title required', description: 'Please enter a loan title', variant: 'destructive' });
      return;
    }
    if (!formData.description.trim()) {
      toast({ title: 'Description required', description: 'Please describe your loan purpose', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: 'Loan created successfully!',
      description: 'Your loan request is now live on the marketplace',
    });

    navigate('/');
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Request Funding
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Create a <span className="text-gradient">Loan Request</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Describe your trading strategy and funding needs. Investors will review and fund your request.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            <Card className="glass animate-slide-up" style={{ animationDelay: '100ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Loan Details
                </CardTitle>
                <CardDescription>Describe what you need the funding for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Loan Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Election Market Arbitrage Opportunity"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Explain your trading strategy and why investors should fund your loan..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-secondary/50 min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass animate-slide-up" style={{ animationDelay: '200ms' }}>
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
                    <span className="text-xl font-bold text-foreground">
                      M${formData.amount.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[formData.amount]}
                    onValueChange={(value) => setFormData({ ...formData, amount: value[0] })}
                    min={100}
                    max={25000}
                    step={100}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>M$100</span>
                    <span>M$25,000</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Interest Rate
                    </Label>
                    <span className="text-xl font-bold text-success">{formData.interestRate}%</span>
                  </div>
                  <Slider
                    value={[formData.interestRate]}
                    onValueChange={(value) => setFormData({ ...formData, interestRate: value[0] })}
                    min={5}
                    max={50}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5%</span>
                    <span>50%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Loan Term
                    </Label>
                    <span className="text-xl font-bold text-foreground">{formData.termDays} days</span>
                  </div>
                  <Slider
                    value={[formData.termDays]}
                    onValueChange={(value) => setFormData({ ...formData, termDays: value[0] })}
                    min={7}
                    max={180}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>7 days</span>
                    <span>180 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass animate-slide-up" style={{ animationDelay: '300ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Collateral (Optional)
                </CardTitle>
                <CardDescription>
                  Describe any collateral you're offering to secure the loan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., M$2,500 in diversified YES positions on established markets..."
                  value={formData.collateralDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, collateralDescription: e.target.value })
                  }
                  className="bg-secondary/50"
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              variant="glow"
              size="xl"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Loan...' : 'Submit Loan Request'}
            </Button>
          </form>

          {/* Preview Sidebar */}
          <div className="space-y-6">
            <Card className="glass sticky top-24 animate-slide-up" style={{ animationDelay: '400ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Loan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">
                    M${formData.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate</span>
                  <span className="font-semibold text-success">{formData.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Term</span>
                  <span className="font-semibold text-foreground">{formData.termDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rate</span>
                  <span className="font-semibold text-foreground">
                    ~{monthlyEquivalent.toFixed(1)}%
                  </span>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">You'll Repay</span>
                    <span className="text-xl font-bold text-foreground">
                      M${expectedReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Principal + {formData.interestRate}% interest
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass animate-slide-up" style={{ animationDelay: '500ms' }}>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-3">Tips for Success</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Be specific about your trading strategy
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Mention your track record if applicable
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Offer collateral for lower rates
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Set realistic interest rates
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
