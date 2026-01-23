import { useState, useCallback, useRef, useEffect } from 'react';
import { ClarityIssue, MarketDraft } from '@/types/market-creator';

interface AnalysisResult {
  score: number;
  issues: ClarityIssue[];
  isAnalyzing: boolean;
}

// Regex-based rules for instant feedback
const instantRules = [
  {
    pattern: /\b(soon|later|eventually|maybe|probably|might)\b/gi,
    type: 'ambiguity' as const,
    severity: 'medium' as const,
    message: 'Vague timing or probability language detected',
    suggestion: 'Replace with specific dates or measurable criteria',
  },
  {
    pattern: /\b(significant|substantial|major|important|big)\b/gi,
    type: 'measurability' as const,
    severity: 'medium' as const,
    message: 'Subjective magnitude terms may lead to disputes',
    suggestion: 'Define specific thresholds or metrics',
  },
  {
    pattern: /\b(etc\.?|and so on|and more|among others)\b/gi,
    type: 'scope' as const,
    severity: 'high' as const,
    message: 'Open-ended lists create resolution ambiguity',
    suggestion: 'Enumerate all relevant items explicitly',
  },
  {
    pattern: /\b(success|fail|win|lose)\b(?![^(]*\))/gi,
    type: 'criteria' as const,
    severity: 'low' as const,
    message: 'Outcome terms without explicit definition',
    suggestion: 'Define what constitutes success or failure',
  },
  {
    pattern: /\?{2,}|\!{2,}/g,
    type: 'ambiguity' as const,
    severity: 'low' as const,
    message: 'Multiple punctuation marks suggest uncertainty in phrasing',
    suggestion: 'Clarify the question with confident phrasing',
  },
  {
    pattern: /\b(I think|in my opinion|IMO|IMHO)\b/gi,
    type: 'criteria' as const,
    severity: 'high' as const,
    message: 'Personal opinion language has no place in resolution criteria',
    suggestion: 'Use objective, verifiable criteria only',
  },
  {
    pattern: /\b(around|approximately|about|roughly)\s+\d/gi,
    type: 'measurability' as const,
    severity: 'medium' as const,
    message: 'Approximate numbers lead to edge-case disputes',
    suggestion: 'Use exact thresholds with clear boundaries',
  },
  {
    pattern: /\b(by end of|by the end of)\b/gi,
    type: 'timeline' as const,
    severity: 'low' as const,
    message: 'End-of-period deadlines need timezone specification',
    suggestion: 'Specify timezone (e.g., "by 11:59 PM ET on...")',
  },
];

function runInstantAnalysis(draft: MarketDraft): ClarityIssue[] {
  const issues: ClarityIssue[] = [];
  const fieldsToCheck: Array<{ key: 'title' | 'description' | 'resolutionCriteria'; content: string }> = [
    { key: 'title', content: draft.title },
    { key: 'description', content: draft.description },
    { key: 'resolutionCriteria', content: draft.resolutionCriteria },
  ];

  for (const { key, content } of fieldsToCheck) {
    for (const rule of instantRules) {
      let match;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        issues.push({
          id: `${key}-${rule.type}-${match.index}`,
          type: rule.type,
          severity: rule.severity,
          message: rule.message,
          suggestion: rule.suggestion,
          field: key,
          highlight: { start: match.index, end: match.index + match[0].length },
        });
      }
    }
  }

  // Check for missing resolution criteria
  if (draft.resolutionCriteria.trim().length < 20) {
    issues.push({
      id: 'missing-resolution',
      type: 'criteria',
      severity: 'high',
      message: 'Resolution criteria is too brief or missing',
      suggestion: 'Describe exactly how this market will be resolved, including edge cases',
      field: 'resolutionCriteria',
    });
  }

  // Check for missing close date
  if (!draft.closeDate) {
    issues.push({
      id: 'missing-close-date',
      type: 'timeline',
      severity: 'high',
      message: 'No close date specified',
      suggestion: 'Set a specific date and time for market resolution',
      field: 'title',
    });
  }

  return issues;
}

function calculateScore(issues: ClarityIssue[], draft: MarketDraft): number {
  let score = 100;

  // Deduct for issues
  for (const issue of issues) {
    switch (issue.severity) {
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 8;
        break;
      case 'low':
        score -= 3;
        break;
    }
  }

  // Bonus for completeness
  if (draft.title.length > 10) score += 5;
  if (draft.description.length > 50) score += 5;
  if (draft.resolutionCriteria.length > 100) score += 10;
  if (draft.closeDate) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function useClarityAnalysis() {
  const [result, setResult] = useState<AnalysisResult>({
    score: 0,
    issues: [],
    isAnalyzing: false,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const analyze = useCallback((draft: MarketDraft) => {
    // Clear any pending analysis
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce: wait for user to pause typing
    debounceRef.current = setTimeout(() => {
      const issues = runInstantAnalysis(draft);
      const score = calculateScore(issues, draft);

      setResult({
        score,
        issues,
        isAnalyzing: false,
      });
    }, 500);

    setResult((prev) => ({ ...prev, isAnalyzing: true }));
  }, []);

  const requestAIAnalysis = useCallback(async (draft: MarketDraft) => {
    setResult((prev) => ({ ...prev, isAnalyzing: true }));

    // For now, just run enhanced instant analysis
    // In production, this would call an edge function
    const issues = runInstantAnalysis(draft);
    const score = calculateScore(issues, draft);

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    setResult({
      score,
      issues,
      isAnalyzing: false,
    });

    return { score, issues };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    ...result,
    analyze,
    requestAIAnalysis,
  };
}
