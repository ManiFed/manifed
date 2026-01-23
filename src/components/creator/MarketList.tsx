import { MarketDraft, DraftStatus } from '@/types/market-creator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, FileText, Radio, CheckCircle2 } from 'lucide-react';

interface MarketListProps {
  drafts: MarketDraft[];
  selectedDraftId: string | null;
  onSelectDraft: (id: string) => void;
  onNewDraft: () => void;
}

const statusConfig: Record<DraftStatus, { label: string; icon: React.ElementType }> = {
  draft: { label: 'Drafts', icon: FileText },
  review: { label: 'In Review', icon: FileText },
  live: { label: 'Live', icon: Radio },
  resolved: { label: 'Resolved', icon: CheckCircle2 },
};

function DraftGroup({
  status,
  drafts,
  selectedDraftId,
  onSelectDraft,
}: {
  status: DraftStatus;
  drafts: MarketDraft[];
  selectedDraftId: string | null;
  onSelectDraft: (id: string) => void;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const filteredDrafts = drafts.filter((d) => d.status === status);

  if (filteredDrafts.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {config.label}
        <span className="ml-auto text-muted-foreground/60">{filteredDrafts.length}</span>
      </div>
      <div className="space-y-1">
        {filteredDrafts.map((draft) => (
          <button
            key={draft.id}
            onClick={() => onSelectDraft(draft.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md transition-colors',
              'hover:bg-muted/50',
              selectedDraftId === draft.id && 'bg-muted'
            )}
          >
            <div className="text-sm font-medium truncate">
              {draft.title || 'Untitled Market'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={cn(
                  'h-1.5 w-12 rounded-full bg-muted overflow-hidden'
                )}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    draft.clarityScore >= 70 && 'bg-green-500',
                    draft.clarityScore >= 40 && draft.clarityScore < 70 && 'bg-yellow-500',
                    draft.clarityScore < 40 && 'bg-red-500'
                  )}
                  style={{ width: `${draft.clarityScore}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(draft.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MarketList({
  drafts,
  selectedDraftId,
  onSelectDraft,
  onNewDraft,
}: MarketListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button onClick={onNewDraft} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Market
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No markets yet. Create your first one.
            </div>
          ) : (
            <>
              <DraftGroup
                status="draft"
                drafts={drafts}
                selectedDraftId={selectedDraftId}
                onSelectDraft={onSelectDraft}
              />
              <DraftGroup
                status="review"
                drafts={drafts}
                selectedDraftId={selectedDraftId}
                onSelectDraft={onSelectDraft}
              />
              <DraftGroup
                status="live"
                drafts={drafts}
                selectedDraftId={selectedDraftId}
                onSelectDraft={onSelectDraft}
              />
              <DraftGroup
                status="resolved"
                drafts={drafts}
                selectedDraftId={selectedDraftId}
                onSelectDraft={onSelectDraft}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
