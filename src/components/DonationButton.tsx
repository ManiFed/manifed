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
import { Heart, Loader2, DollarSign, Coins } from 'lucide-react';

export function DonationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [usdAmount, setUsdAmount] = useState('5');
  const [manaAmount, setManaAmount] = useState('100');
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
        body: { amount: Math.round(amount * 100) },
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

  const handleManaDonate = async () => {
    const amount = parseInt(manaAmount);
    if (isNaN(amount) || amount < 10) {
      toast({
        title: 'Invalid amount',
        description: 'Minimum donation is M$10',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('managram', {
        body: { 
          action: 'deposit',
          amount: amount,
          message: `Donation to ManiFed: M$${amount} - Thank you for Making Manifold Great Again! 🇺🇸`
        },
      });
      if (error) throw error;
      toast({
        title: 'Donation Sent!',
        description: `Thank you for your M$${amount} donation! The deep state fears your generosity.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send mana donation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickUsdAmounts = [1, 5, 10, 25];
  const quickManaAmounts = [50, 100, 500, 1000];

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
            Your donations help fight the deep state... I mean, cover AI costs. We don't make a profit! 🇺🇸
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
              {quickUsdAmounts.map((amount) => (
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
              <Label htmlFor="custom-usd">Custom Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="custom-usd"
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
            <div className="flex gap-2">
              {quickManaAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={manaAmount === String(amount) ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setManaAmount(String(amount))}
                >
                  M${amount}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-mana">Custom Amount (M$)</Label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="custom-mana"
                  type="number"
                  min="10"
                  step="1"
                  value={manaAmount}
                  onChange={(e) => setManaAmount(e.target.value)}
                  className="pl-10"
                  placeholder="100"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Sends M$ directly from your Manifold account via managram
            </p>
            <Button
              variant="glow"
              className="w-full"
              onClick={handleManaDonate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Coins className="w-4 h-4 mr-2" />
              )}
              Donate M${manaAmount || '0'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
