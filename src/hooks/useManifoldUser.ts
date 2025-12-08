import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ManifoldUserData {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  balance: number;
  totalDeposits: number;
  createdTime: number;
  lastBetTime?: number;
  currentBettingStreak?: number;
}

export interface ManifoldPortfolio {
  investmentValue: number;
  balance: number;
  totalDeposits: number;
  loanTotal: number;
  profit?: number;
  dailyProfit: number;
}

export interface CreditScore {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'new' | 'poor';
  factors: { name: string; impact: string; value: string }[];
}

export interface ManifoldUserResult {
  user: ManifoldUserData;
  portfolio: ManifoldPortfolio | null;
  creditScore: CreditScore;
  isVerified: boolean;
}

export function useManifoldUser() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (username: string, apiKey?: string): Promise<ManifoldUserResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manifold-user', {
        body: { username, apiKey },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        setError(data.error);
        return null;
      }

      return data as ManifoldUserResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    fetchUser,
    isLoading,
    error,
  };
}