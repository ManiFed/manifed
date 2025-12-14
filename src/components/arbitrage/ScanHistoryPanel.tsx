import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useArbitrageScanHistory } from '@/hooks/useArbitrageScanHistory';
import { History, Loader2, CheckCircle, XCircle, Clock, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ScanHistoryPanel() {
  const { history, isLoading, getStats } = useArbitrageScanHistory();
  const stats = getStats();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Scan History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Scan History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2 rounded bg-secondary/20 text-center">
            <p className="text-xs text-muted-foreground">Total Scans</p>
            <p className="text-lg font-bold">{stats.totalScans}</p>
          </div>
          <div className="p-2 rounded bg-secondary/20 text-center">
            <p className="text-xs text-muted-foreground">Total Opportunities</p>
            <p className="text-lg font-bold text-primary">{stats.totalOpportunities}</p>
          </div>
          <div className="p-2 rounded bg-secondary/20 text-center">
            <p className="text-xs text-muted-foreground">High Confidence</p>
            <p className="text-lg font-bold text-success">{stats.totalHighConfidence}</p>
          </div>
          <div className="p-2 rounded bg-secondary/20 text-center">
            <p className="text-xs text-muted-foreground">Avg Markets</p>
            <p className="text-lg font-bold">{stats.avgMarketsScanned.toLocaleString()}</p>
          </div>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No scan history yet. Run your first scan to see results here.
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {history.slice(0, 10).map(scan => (
              <div key={scan.id} className="p-2 rounded bg-background/50 border border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scan.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : scan.status === 'failed' ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <Clock className="w-4 h-4 text-warning animate-pulse" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(scan.started_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Badge variant={scan.status === 'completed' ? 'success' : scan.status === 'failed' ? 'destructive' : 'pending'}>
                    {scan.status}
                  </Badge>
                </div>
                {scan.status === 'completed' && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{scan.markets_scanned?.toLocaleString() || 0} markets</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {scan.opportunities_found || 0} opportunities
                    </span>
                    {(scan.high_confidence || 0) > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-success">{scan.high_confidence} high conf.</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
