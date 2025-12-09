import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserBalance {
  balance: number;
  totalInvested: number;
}

export function useUserBalance() {
  const [balance, setBalance] = useState<UserBalance>({ balance: 0, totalInvested: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_balances')
        .select('balance, total_invested')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBalance({
          balance: Number(data.balance) || 0,
          totalInvested: Number(data.total_invested) || 0,
        });
      } else {
        // No balance record exists yet - it will be created on first deposit
        setBalance({ balance: 0, totalInvested: 0 });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Update local state only - actual balance changes happen server-side via edge functions
  const setLocalBalance = useCallback((newBalance: number, newTotalInvested?: number) => {
    setBalance(prev => ({
      balance: newBalance,
      totalInvested: newTotalInvested !== undefined ? newTotalInvested : prev.totalInvested,
    }));
  }, []);

  const recordTransaction = useCallback(async (
    type: 'deposit' | 'withdraw' | 'invest' | 'loan_received' | 'repayment',
    amount: number,
    description?: string,
    loanId?: string
  ) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type,
          amount,
          description,
          loan_id: loanId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  }, [userId]);

  return {
    balance: balance.balance,
    totalInvested: balance.totalInvested,
    isLoading,
    userId,
    fetchBalance,
    setLocalBalance,
    recordTransaction,
  };
}
