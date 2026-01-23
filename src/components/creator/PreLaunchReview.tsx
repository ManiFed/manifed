import { MarketDraft, ClarityIssue } from '@/types/market-creator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Check, X, ChevronDown, Rocket } from 'lucide-react';
import { useState } from 'react';

interface PreLaunchReviewProps {
  draft: MarketDraft;
  issues: ClarityIssue[];
  onBack: () => void;
  onPublish: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  check: (draft: MarketDraft, issues: ClarityIssue[]) => boolean;
}

const checklist: ChecklistItem[] = [
  {
    id: 'title',
    label: 'Clear question',
    description: 'The market question is specific and unambiguous.',
    check: (draft) => draft.title.length > 15,
  },
  {
    id: 'description',
    label: 'Context provided',
    description: 'Background information helps traders understand the market.',
    check: (draft) => draft.description.length > 30,
  },
  {
    id: 'resolution',
    label: 'Resolution criteria defined',
    description: 'Clear rules for how the market will be resolved.',
    check: (draft) => draft.resolutionCriteria.length > 50,
  },
  {
    id: 'timeline',
    label: 'Close date set',
    description: 'A specific end date for the market.',
    check: (draft) => !!draft.closeDate,
  },
  {
    id: 'no-critical',
    label: 'No critical issues',
    description: 'No high-severity problems detected in the draft.',
    check: (_, issues) => !issues.some((i) => i.severity === 'high'),
  },
  {
    id: 'clarity',
    label: 'Adequate clarity score',
    description: 'The overall clarity score is acceptable.',
    check: (draft) => draft.clarityScore >= 50,
  },
];

export function PreLaunchReview({ draft, issues, onBack, onPublish }: PreLaunchReviewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const results = checklist.map((item) => ({
    ...item,
    passed: item.check(draft, issues),
  }));

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-semibold">Pre-Launch Review</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review your market before publishing. All items are recommendations, not requirements.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {results.map((item) => (
            <Collapsible
              key={item.id}
              open={expandedItems.has(item.id)}
              onOpenChange={() => toggleItem(item.id)}
            >
              <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors text-left">
                <div
                  className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center',
                    item.passed ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  )}
                >
                  {item.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </div>
                <span className="flex-1 font-medium">{item.label}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    expandedItems.has(item.id) && 'rotate-180'
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-11 py-2">
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-border space-y-3">
        <div className="text-sm text-muted-foreground text-center">
          {passedCount} of {results.length} checks passed
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Back to Edit
          </Button>
          <Button className="flex-1" onClick={onPublish}>
            <Rocket className="h-4 w-4 mr-2" />
            Publish Market
          </Button>
        </div>
        {!allPassed && (
          <p className="text-xs text-muted-foreground text-center">
            You can still publish with unmet checks. They are advisory only.
          </p>
        )}
      </div>
    </div>
  );
}
