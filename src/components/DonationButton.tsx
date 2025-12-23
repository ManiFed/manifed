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
import { Heart, Loader2, DollarSign, Coins, ExternalLink, Copy, Check } from 'lucide-react';

export function DonationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [usdAmount, setUsdAmount] = useState('5');
  const [manaAmount, setManaAmount] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopyMessage = () => {
    const message = `Donation to ManiFed: M$${manaAmount} - Thank you!`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Donation message copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
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
            Your donations help cover AI and infrastructure costs. We don't make a profit!
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

            {/* Instructions for mana donation */}
            <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <p className="text-sm font-medium text-foreground">To donate M$:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://manifold.markets/ManiFed" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@ManiFed on Manifold</a></li>
                <li>Click "Send Mana" and enter M${manaAmount}</li>
                <li>Add a message (optional)</li>
              </ol>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMessage}
                  className="flex-1 gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Message
                </Button>
              </div>
            </div>

            <a
              href="https://manifold.markets/ManiFed"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="glow" className="w-full gap-2">
                <ExternalLink className="w-4 h-4" />
                Go to @ManiFed
              </Button>
            </a>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}