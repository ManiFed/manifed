import { useState } from 'react';
import { MarketDraft, LiquidityGuidance } from '@/types/market-creator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiquidityGuidanceCardProps {
  draft: MarketDraft;
}

function estimateEngagement(draft: MarketDraft): LiquidityGuidance {
  // Simple heuristic based on content quality
  const hasGoodTitle = draft.title.length > 20;
  const hasDescription = draft.description.length > 50;
  const hasResolution = draft.resolutionCriteria.length > 100;
  const hasCloseDate = !!draft.closeDate;

  const qualityPoints = [hasGoodTitle, hasDescription, hasResolution, hasCloseDate].filter(Boolean).length;

  if (qualityPoints >= 4) {
    return {
      expectedEngagement: 'high',
      suggestedSubsidyMin: 100,
      suggestedSubsidyMax: 500,
      reasoning: 'Well-structured market with clear criteria tends to attract more traders.',
    };
  } else if (qualityPoints >= 2) {
    return {
      expectedEngagement: 'medium',
      suggestedSubsidyMin: 50,
      suggestedSubsidyMax: 150,
      reasoning: 'Market has good foundation but could benefit from more detail.',
    };
  } else {
    return {
      expectedEngagement: 'low',
      suggestedSubsidyMin: 25,
      suggestedSubsidyMax: 75,
      reasoning: 'Consider adding more context to attract traders.',
    };
  }
}

const engagementColors = {
  low: 'text-red-500',
  medium: 'text-yellow-500',
  high: 'text-green-500',
};

export function LiquidityGuidanceCard({ draft }: LiquidityGuidanceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const guidance = estimateEngagement(draft);

  return (
    <div className="p-4 border-b border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Expected Engagement</div>
            <div className={cn('text-lg font-semibold capitalize', engagementColors[guidance.expectedEngagement])}>
              {guidance.expectedEngagement}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Suggested Subsidy</div>
            <div className="text-sm font-medium">
              {guidance.suggestedSubsidyMin}–{guidance.suggestedSubsidyMax} mana
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Why?</div>
            <div className="text-sm text-muted-foreground">{guidance.reasoning}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
