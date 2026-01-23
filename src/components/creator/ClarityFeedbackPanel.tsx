import { ClarityIssue } from '@/types/market-creator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Sparkles, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ClarityFeedbackPanelProps {
  score: number;
  issues: ClarityIssue[];
  isAnalyzing: boolean;
  onRequestAI: () => void;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Clear', color: 'text-green-500' };
  if (score >= 60) return { label: 'Adequate', color: 'text-yellow-500' };
  if (score >= 40) return { label: 'Needs Work', color: 'text-orange-500' };
  return { label: 'Unclear', color: 'text-red-500' };
}

function getSeverityIcon(severity: ClarityIssue['severity']) {
  switch (severity) {
    case 'high':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'low':
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

export function ClarityFeedbackPanel({
  score,
  issues,
  isAnalyzing,
  onRequestAI,
}: ClarityFeedbackPanelProps) {
  const { label, color } = getScoreLabel(score);

  // Group issues by severity
  const highIssues = issues.filter((i) => i.severity === 'high');
  const mediumIssues = issues.filter((i) => i.severity === 'medium');
  const lowIssues = issues.filter((i) => i.severity === 'low');

  return (
    <div className="flex flex-col h-full">
      {/* Score Display */}
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-muted-foreground mb-2">Clarity Score</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                score >= 80 && 'bg-green-500',
                score >= 60 && score < 80 && 'bg-yellow-500',
                score >= 40 && score < 60 && 'bg-orange-500',
                score < 40 && 'bg-red-500'
              )}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className={cn('text-sm font-semibold', color)}>{label}</span>
        </div>
        {isAnalyzing && (
          <div className="text-xs text-muted-foreground mt-2 animate-pulse">
            Analyzing...
          </div>
        )}
      </div>

      {/* AI Analysis Button */}
      <div className="p-4 border-b border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRequestAI}
          disabled={isAnalyzing}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Deep Analysis
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Get AI-powered suggestions for improving your market.
        </p>
      </div>

      {/* Issues List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No issues detected. Looking good!
            </div>
          ) : (
            <>
              {highIssues.length > 0 && (
                <IssueGroup title="Critical" issues={highIssues} />
              )}
              {mediumIssues.length > 0 && (
                <IssueGroup title="Suggestions" issues={mediumIssues} />
              )}
              {lowIssues.length > 0 && (
                <IssueGroup title="Minor" issues={lowIssues} />
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function IssueGroup({ title, issues }: { title: string; issues: ClarityIssue[] }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title} ({issues.length})
      </div>
      <div className="space-y-2">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: ClarityIssue }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-2">
        {getSeverityIcon(issue.severity)}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{issue.message}</div>
          {issue.suggestion && (
            <div className="text-xs text-muted-foreground mt-1">
              {issue.suggestion}
            </div>
          )}
          <div className="text-xs text-muted-foreground/60 mt-1 capitalize">
            {issue.field.replace(/([A-Z])/g, ' $1').trim()} • {issue.type}
          </div>
        </div>
      </div>
    </div>
  );
}
