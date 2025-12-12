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
  hasApiKey: boolean;
  onBalanceChange: () => void;
}

export function WalletPopover({ balance, hasApiKey, onBalanceChange }: WalletPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'select' | 'deposit' | 'withdraw'>('select');
  const [manifoldBalance, setManifoldBalance] = useState<number | null>(null);
  const [isFetchingManifoldBalance, setIsFetchingManifoldBalance] = useState(false);

  const fetchManifoldBalance = async () => {
    setIsFetchingManifoldBalance(true);
    try {
      // Get user's Manifold username from settings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: settings } = await supabase
        .from('user_manifold_settings')
        .select('manifold_username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.manifold_username) return;

      // Fetch balance from Manifold API
      const response = await fetch(`https://api.manifold.markets/v0/user/${settings.manifold_username}`);
      if (response.ok) {
        const userData = await response.json();
        setManifoldBalance(Math.floor(userData.balance || 0));
      }
    } catch (error) {
      console.error('Failed to fetch Manifold balance:', error);
    } finally {
      setIsFetchingManifoldBalance(false);
    }
  };

  const handleMaxDeposit = () => {
    if (manifoldBalance !== null && manifoldBalance >= 10) {
      setAmount(manifoldBalance.toString());
    } else {
      toast({
        title: 'Insufficient Manifold Balance',
        description: 'You need at least M$10 in your Manifold account to deposit.',
        variant: 'destructive',
      });
    }
  };

  const handleDeposit = async () => {
    if (!hasApiKey) {
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
    if (!hasApiKey) {
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
        {!hasApiKey ? (
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
              <Button variant="outline" onClick={() => {
                setMode('deposit');
                fetchManifoldBalance();
              }} className="gap-2">
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
              <Button variant="ghost" size="sm" onClick={() => {
                setMode('select');
                setManifoldBalance(null);
              }}>
                Back
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary/50 flex-1"
                min={10}
              />
              {mode === 'deposit' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMaxDeposit}
                  disabled={isFetchingManifoldBalance}
                  className="px-3"
                >
                  {isFetchingManifoldBalance ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Max'
                  )}
                </Button>
              )}
              {mode === 'withdraw' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAmount(Math.floor(balance).toString())}
                  className="px-3"
                >
                  Max
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'deposit' 
                ? manifoldBalance !== null 
                  ? `Manifold balance: M$${manifoldBalance.toLocaleString()}`
                  : 'Sends M$ from your Manifold wallet to ManiFed'
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