import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: string;
  market_id: string;
  market_question: string;
  market_url: string;
  initial_probability: number | null;
  current_probability: number | null;
  liquidity: number | null;
  added_at: string;
  notes: string | null;
  alert_threshold: number;
}

export function useArbitrageWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWatchlist = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('arbitrage_watchlist')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;
      setWatchlist(data || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const addToWatchlist = async (market: {
    id: string;
    question: string;
    url: string;
    probability?: number;
    liquidity?: number;
  }, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('arbitrage_watchlist')
        .insert({
          user_id: user.id,
          market_id: market.id,
          market_question: market.question,
          market_url: market.url,
          initial_probability: market.probability || null,
          current_probability: market.probability || null,
          liquidity: market.liquidity || null,
          notes: notes || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already in Watchlist',
            description: 'This market is already in your watchlist.',
            variant: 'destructive',
          });
          return false;
        }
        throw error;
      }

      toast({
        title: 'Added to Watchlist',
        description: 'Market added to your watchlist.',
      });

      await fetchWatchlist();
      return true;
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to add market to watchlist.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const removeFromWatchlist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('arbitrage_watchlist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Removed from Watchlist',
        description: 'Market removed from your watchlist.',
      });

      await fetchWatchlist();
      return true;
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove market from watchlist.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('arbitrage_watchlist')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;
      await fetchWatchlist();
      return true;
    } catch (error) {
      console.error('Error updating notes:', error);
      return false;
    }
  };

  const isInWatchlist = (marketId: string) => {
    return watchlist.some(item => item.market_id === marketId);
  };

  return {
    watchlist,
    isLoading,
    fetchWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    updateNotes,
    isInWatchlist,
  };
}
