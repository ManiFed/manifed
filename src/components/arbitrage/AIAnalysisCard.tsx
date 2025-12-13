import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Brain, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface AIAnalysis {
  isValidArbitrage: boolean;
  confidence: number;
  reason: string;
  suggestedAction: string;
}

interface AIExplanation {
  summary: string;
  riskAssessment: string;
  executionStrategy: string;
  confidence: number;
}

interface AIAnalysisCardProps {
  opportunityId: string;
  market1: { id: string; question: string };
  market2: { id: string; question: string };
  opportunityType: string;
  expectedProfit: number;
  analysis?: AIAnalysis;
  explanation?: AIExplanation;
  isLoadingExplanation?: boolean;
  onRequestExplanation: () => void;
  onSubmitFeedback: (isValid: boolean, reason: string) => Promise<boolean>;
}

export function AIAnalysisCard({
  opportunityId,
  market1,
  market2,
  opportunityType,
  expectedProfit,
  analysis,
  explanation,
  isLoadingExplanation,
  onRequestExplanation,
  onSubmitFeedback,
}: AIAnalysisCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (isValid: boolean) => {
    if (!feedbackReason.trim() && !isValid) {
      setShowFeedback(true);
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmitFeedback(isValid, feedbackReason);
    setIsSubmitting(false);
    
    if (success) {
      setShowFeedback(false);
      setFeedbackReason('');
    }
  };

  if (!analysis) {
    return null;
  }

  const confidenceColor = analysis.confidence > 0.7 
    ? 'text-success' 
    : analysis.confidence > 0.4 
      ? 'text-warning' 
      : 'text-destructive';

  const confidenceLabel = analysis.confidence > 0.7 
    ? 'High' 
    : analysis.confidence > 0.4 
      ? 'Medium' 
      : 'Low';

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20">
      <CardContent className="p-4 space-y-3">
        {/* AI Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Analysis</span>
            <Badge 
              variant={analysis.isValidArbitrage ? 'success' : 'destructive'} 
              className="gap-1"
            >
              {analysis.isValidArbitrage ? (
                <><CheckCircle className="w-3 h-3" />Valid</>
              ) : (
                <><AlertTriangle className="w-3 h-3" />Invalid</>
              )}
            </Badge>
          </div>
          <Badge variant="outline" className={`gap-1 ${confidenceColor}`}>
            <Sparkles className="w-3 h-3" />
            {confidenceLabel} ({(analysis.confidence * 100).toFixed(0)}%)
          </Badge>
        </div>

        {/* AI Reason */}
        <p className="text-sm text-muted-foreground">{analysis.reason}</p>

        {/* Detailed Explanation */}
        {explanation ? (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Summary
              </p>
              <p className="text-xs text-muted-foreground">
                {typeof explanation.summary === 'string' 
                  ? explanation.summary 
                  : JSON.stringify(explanation.summary)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Risks
              </p>
              <div className="text-xs text-muted-foreground">
                {typeof explanation.riskAssessment === 'string' 
                  ? explanation.riskAssessment 
                  : typeof explanation.riskAssessment === 'object' && explanation.riskAssessment
                    ? Object.entries(explanation.riskAssessment).map(([key, value]) => (
                        <p key={key} className="mb-1">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                          {String(value)}
                        </p>
                      ))
                    : String(explanation.riskAssessment)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Strategy
              </p>
              <div className="text-xs text-muted-foreground">
                {typeof explanation.executionStrategy === 'string' 
                  ? explanation.executionStrategy 
                  : typeof explanation.executionStrategy === 'object' && explanation.executionStrategy
                    ? Object.entries(explanation.executionStrategy).map(([key, value]) => (
                        <p key={key} className="mb-1">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                          {String(value)}
                        </p>
                      ))
                    : String(explanation.executionStrategy)}
              </div>
            </div>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRequestExplanation}
            disabled={isLoadingExplanation}
            className="text-xs"
          >
            {isLoadingExplanation ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-1" />Get Detailed Analysis</>
            )}
          </Button>
        )}

        {/* Feedback Section */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">
            Help train the AI - was this analysis correct?
          </p>
          
          {showFeedback ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Why is this not a valid arbitrage opportunity?"
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
                className="text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleFeedback(false)}
                  disabled={isSubmitting || !feedbackReason.trim()}
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Submit'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setShowFeedback(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-success hover:text-success hover:bg-success/10 gap-1"
                onClick={() => handleFeedback(true)}
                disabled={isSubmitting}
              >
                <ThumbsUp className="w-3 h-3" />
                Correct
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                onClick={() => setShowFeedback(true)}
                disabled={isSubmitting}
              >
                <ThumbsDown className="w-3 h-3" />
                Incorrect
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
