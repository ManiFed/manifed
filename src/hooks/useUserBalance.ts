import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
        // Create initial balance record
        const { error: insertError } = await supabase
          .from('user_balances')
          .insert({ user_id: user.id, balance: 0, total_invested: 0 });
        
        if (insertError && insertError.code !== '23505') { // Ignore duplicate key error
          throw insertError;
        }
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

  const updateBalance = useCallback(async (newBalance: number, newTotalInvested?: number) => {
    if (!userId) return;

    try {
      const updateData: { balance: number; total_invested?: number } = { balance: newBalance };
      if (newTotalInvested !== undefined) {
        updateData.total_invested = newTotalInvested;
      }

      const { error } = await supabase
        .from('user_balances')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      setBalance(prev => ({
        balance: newBalance,
        totalInvested: newTotalInvested !== undefined ? newTotalInvested : prev.totalInvested,
      }));
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }, [userId]);

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
    updateBalance,
    recordTransaction,
  };
}
