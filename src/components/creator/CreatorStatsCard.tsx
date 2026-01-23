import { MarketDraft } from '@/types/market-creator';

interface CreatorStatsCardProps {
  drafts: MarketDraft[];
}

export function CreatorStatsCard({ drafts }: CreatorStatsCardProps) {
  const allDrafts = drafts.filter((d) => d.clarityScore > 0);
  const avgScore = allDrafts.length > 0
    ? Math.round(allDrafts.reduce((sum, d) => sum + d.clarityScore, 0) / allDrafts.length)
    : 0;

  const liveCount = drafts.filter((d) => d.status === 'live').length;
  const resolvedCount = drafts.filter((d) => d.status === 'resolved').length;

  return (
    <div className="p-4 border-b border-border space-y-3">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Your Stats
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-semibold">{avgScore}</div>
          <div className="text-xs text-muted-foreground">Avg. Clarity</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{liveCount}</div>
          <div className="text-xs text-muted-foreground">Live</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{resolvedCount}</div>
          <div className="text-xs text-muted-foreground">Resolved</div>
        </div>
      </div>
    </div>
  );
}
