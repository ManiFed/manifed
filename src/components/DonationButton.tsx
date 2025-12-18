import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Heart, Loader2, DollarSign, Coins, ExternalLink } from 'lucide-react';

export function DonationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [usdAmount, setUsdAmount] = useState('5');
  const [isLoading, setIsLoading] = useState(false);

  const handleUsdDonate = async () => {
    const amount = parseFloat(usdAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum donation is $1.00',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation', {
        body: { amount: Math.round(amount * 100) }, // Convert to cents
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        setIsOpen(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process donation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [1, 5, 10, 25];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Support ManiFed
          </DialogTitle>
          <DialogDescription>
            Your donations help cover AI costs and keep ManiFed running. We don't make a profit!
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="usd" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="usd" className="gap-2">
              <DollarSign className="w-4 h-4" />
              USD
            </TabsTrigger>
            <TabsTrigger value="mana" className="gap-2">
              <Coins className="w-4 h-4" />
              Mana
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usd" className="space-y-4 mt-4">
            <div className="flex gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={usdAmount === String(amount) ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setUsdAmount(String(amount))}
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Custom Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="custom-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  className="pl-10"
                  placeholder="5.00"
                />
              </div>
            </div>
            <Button
              variant="glow"
              className="w-full"
              onClick={handleUsdDonate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Heart className="w-4 h-4 mr-2" />
              )}
              Donate ${usdAmount || '0'}
            </Button>
          </TabsContent>

          <TabsContent value="mana" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 text-center">
              <Coins className="w-10 h-10 mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground mb-4">
                To donate M$, you can send a managram directly to <strong>@ManiFed</strong> on Manifold Markets.
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open('https://manifold.markets/ManiFed', '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
                Open Manifold Profile
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
