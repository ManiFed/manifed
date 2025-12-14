import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScanHistoryItem {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  markets_scanned: number;
  tradeable_markets: number;
  opportunities_found: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  scan_config: unknown;
}

export function useArbitrageScanHistory() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('arbitrage_scan_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching scan history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStats = () => {
    const completedScans = history.filter(h => h.status === 'completed');
    const totalOpportunities = completedScans.reduce((sum, h) => sum + (h.opportunities_found || 0), 0);
    const totalHighConfidence = completedScans.reduce((sum, h) => sum + (h.high_confidence || 0), 0);
    const avgMarketsScanned = completedScans.length > 0
      ? completedScans.reduce((sum, h) => sum + (h.markets_scanned || 0), 0) / completedScans.length
      : 0;

    return {
      totalScans: completedScans.length,
      totalOpportunities,
      totalHighConfidence,
      avgMarketsScanned: Math.round(avgMarketsScanned),
    };
  };

  return {
    history,
    isLoading,
    fetchHistory,
    getStats,
  };
}
