import { useEffect } from 'react';
import { MarketDraft, MarketType, ClarityIssue } from '@/types/market-creator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DraftEditorProps {
  draft: MarketDraft;
  issues: ClarityIssue[];
  isReadOnly?: boolean;
  onUpdate: (updates: Partial<MarketDraft>) => void;
}

const marketTypes: { value: MarketType; label: string }[] = [
  { value: 'binary', label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'numeric', label: 'Numeric Range' },
  { value: 'poll', label: 'Poll' },
];

function HighlightedText({
  content,
  field,
  issues,
}: {
  content: string;
  field: 'title' | 'description' | 'resolutionCriteria';
  issues: ClarityIssue[];
}) {
  const fieldIssues = issues.filter((i) => i.field === field && i.highlight);

  if (fieldIssues.length === 0) {
    return <span>{content}</span>;
  }

  // Sort by start position
  const sortedIssues = [...fieldIssues].sort((a, b) => 
    (a.highlight?.start || 0) - (b.highlight?.start || 0)
  );

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  sortedIssues.forEach((issue, idx) => {
    if (!issue.highlight) return;
    
    const { start, end } = issue.highlight;
    
    // Add text before this highlight
    if (start > lastEnd) {
      parts.push(content.slice(lastEnd, start));
    }

    // Add highlighted text
    parts.push(
      <span
        key={idx}
        className={cn(
          'underline decoration-wavy',
          issue.severity === 'high' && 'decoration-red-400/60',
          issue.severity === 'medium' && 'decoration-yellow-400/60',
          issue.severity === 'low' && 'decoration-blue-400/60'
        )}
        title={issue.message}
      >
        {content.slice(start, end)}
      </span>
    );

    lastEnd = end;
  });

  // Add remaining text
  if (lastEnd < content.length) {
    parts.push(content.slice(lastEnd));
  }

  return <>{parts}</>;
}

export function DraftEditor({ draft, issues, isReadOnly = false, onUpdate }: DraftEditorProps) {
  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Market Question
        </Label>
        <Input
          id="title"
          value={draft.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Will X happen by Y date?"
          disabled={isReadOnly}
          className="text-lg font-medium"
        />
        {!isReadOnly && draft.title && (
          <div className="text-sm text-muted-foreground">
            <HighlightedText content={draft.title} field="title" issues={issues} />
          </div>
        )}
      </div>

      {/* Market Type & Close Date Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Market Type</Label>
          <Select
            value={draft.marketType}
            onValueChange={(value: MarketType) => onUpdate({ marketType: value })}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {marketTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Close Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={isReadOnly}
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !draft.closeDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {draft.closeDate ? format(draft.closeDate, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={draft.closeDate || undefined}
                onSelect={(date) => onUpdate({ closeDate: date || null })}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 flex-1">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={draft.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Provide context and background for your market..."
          disabled={isReadOnly}
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Resolution Criteria */}
      <div className="space-y-2 flex-1">
        <Label htmlFor="resolution" className="text-sm font-medium">
          Resolution Criteria
        </Label>
        <Textarea
          id="resolution"
          value={draft.resolutionCriteria}
          onChange={(e) => onUpdate({ resolutionCriteria: e.target.value })}
          placeholder="Describe exactly how this market will be resolved. Include edge cases, sources, and specific conditions..."
          disabled={isReadOnly}
          className="min-h-[160px] resize-none"
        />
        {!isReadOnly && draft.resolutionCriteria && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            <HighlightedText
              content={draft.resolutionCriteria}
              field="resolutionCriteria"
              issues={issues}
            />
          </div>
        )}
      </div>
    </div>
  );
}
