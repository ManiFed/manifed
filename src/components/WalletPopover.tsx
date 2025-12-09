import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Wallet, Plus, Minus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface WalletPopoverProps {
  balance: number;
  userApiKey: string | null;
  onBalanceChange: () => void; // Now just triggers a refresh
}

export function WalletPopover({ balance, userApiKey, onBalanceChange }: WalletPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'select' | 'deposit' | 'withdraw'>('select');

  const handleDeposit = async () => {
    if (!userApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first',
        variant: 'destructive',
      });
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum deposit is M$10',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('managram', {
        body: {
          action: 'deposit',
          amount: depositAmount,
          userApiKey: userApiKey,
          message: `ManiFed deposit - M$${depositAmount}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Refresh balance from server
      onBalanceChange();
      
      setAmount('');
      setMode('select');
      setIsOpen(false);
      
      toast({
        title: 'Deposit Successful',
        description: `M$${depositAmount.toLocaleString()} added to your ManiFed balance`,
      });
    } catch (error) {
      console.error('Deposit error:', error);
      toast({
        title: 'Deposit Failed',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!userApiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please connect your Manifold account in Settings first',
        variant: 'destructive',
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum withdrawal is M$10',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawAmount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You cannot withdraw more than your available balance',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('managram', {
        body: {
          action: 'withdraw',
          amount: withdrawAmount,
          userApiKey: userApiKey,
          message: `ManiFed withdrawal - M$${withdrawAmount}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Refresh balance from server
      onBalanceChange();
      
      setAmount('');
      setMode('select');
      setIsOpen(false);
      
      toast({
        title: 'Withdrawal Successful',
        description: `M$${withdrawAmount.toLocaleString()} sent to your Manifold wallet`,
      });
    } catch (error) {
      console.error('Withdraw error:', error);
      toast({
        title: 'Withdrawal Failed',
        description: error instanceof Error ? error.message : 'Failed to process withdrawal',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setMode('select');
        setAmount('');
      }
    }}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary/70 transition-colors cursor-pointer">
          <Wallet className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            M${balance.toLocaleString()}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        {!userApiKey ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your Manifold account to deposit and withdraw M$.
            </p>
            <Link to="/settings" onClick={() => setIsOpen(false)}>
              <Button variant="glow" className="w-full">
                Connect Account
              </Button>
            </Link>
          </div>
        ) : mode === 'select' ? (
          <div className="space-y-3">
            <div className="text-center pb-2 border-b border-border/50">
              <p className="text-xs text-muted-foreground">ManiFed Balance</p>
              <p className="text-2xl font-bold text-foreground">M${balance.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setMode('deposit')} className="gap-2">
                <Plus className="w-4 h-4" />
                Deposit
              </Button>
              <Button variant="outline" onClick={() => setMode('withdraw')} className="gap-2">
                <Minus className="w-4 h-4" />
                Withdraw
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Minimum transaction: M$10
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">
                {mode === 'deposit' ? 'Deposit M$' : 'Withdraw M$'}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setMode('select')}>
                Back
              </Button>
            </div>
            <Input
              type="number"
              placeholder="Enter amount..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary/50"
              min={10}
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'deposit' 
                ? 'Sends M$ from your Manifold wallet to ManiFed'
                : `Available: M$${balance.toLocaleString()}`
              }
            </p>
            <Button 
              variant="glow" 
              className="w-full" 
              onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {mode === 'deposit' ? 'Deposit' : 'Withdraw'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
