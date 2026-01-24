import { useState, useCallback, useRef, useEffect } from 'react';
import { ClarityIssue, MarketDraft } from '@/types/market-creator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AnalysisResult {
  score: number;
  issues: ClarityIssue[];
  isAnalyzing: boolean;
  aiSuggestions?: AISuggestion[];
}

interface AISuggestion {
  priority: 'high' | 'medium' | 'low';
  field: 'title' | 'description' | 'resolutionCriteria' | 'general';
  suggestion: string;
  example?: string;
}

interface AIRewrite {
  title: string;
  description: string;
  resolutionCriteria: string;
  changes: string[];
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
  {
    pattern: /\b(will|should|could|would)\s+\w+\s+(increase|decrease|grow|shrink)\b/gi,
    type: 'measurability' as const,
    severity: 'medium' as const,
    message: 'Direction without magnitude is hard to verify',
    suggestion: 'Specify exact thresholds (e.g., "increase by at least 10%")',
  },
  {
    pattern: /\b(everyone|nobody|always|never)\b/gi,
    type: 'scope' as const,
    severity: 'low' as const,
    message: 'Absolute terms are rarely accurate and invite edge cases',
    suggestion: 'Use specific quantifiers instead',
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

  // Check for placeholder brackets
  if (/\[[^\]]+\]/.test(draft.title) || /\[[^\]]+\]/.test(draft.resolutionCriteria)) {
    issues.push({
      id: 'placeholder-brackets',
      type: 'ambiguity',
      severity: 'high',
      message: 'Placeholder brackets detected - fill in the specific details',
      suggestion: 'Replace [bracketed text] with actual values',
      field: draft.title.includes('[') ? 'title' : 'resolutionCriteria',
    });
  }

  // Check for missing source specification
  if (draft.resolutionCriteria.length > 30 && 
      !/(source|according to|based on|per|via|from)\b/i.test(draft.resolutionCriteria)) {
    issues.push({
      id: 'missing-source',
      type: 'criteria',
      severity: 'medium',
      message: 'No resolution source specified',
      suggestion: 'Specify what source will be used to verify the outcome (e.g., "according to Reuters")',
      field: 'resolutionCriteria',
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
    aiSuggestions: undefined,
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

      setResult((prev) => ({
        ...prev,
        score,
        issues,
        isAnalyzing: false,
      }));
    }, 500);

    setResult((prev) => ({ ...prev, isAnalyzing: true }));
  }, []);

  const requestAIAnalysis = useCallback(async (draft: MarketDraft): Promise<{ score: number; issues: ClarityIssue[] }> => {
    setResult((prev) => ({ ...prev, isAnalyzing: true }));

    try {
      const { data, error } = await supabase.functions.invoke('market-clarity-ai', {
        body: { draft, action: 'analyze' }
      });

      if (error) throw error;

      if (data?.success && data.result) {
        const aiIssues: ClarityIssue[] = data.result.issues.map((issue: any, index: number) => ({
          id: `ai-${issue.type}-${index}`,
          type: issue.type,
          severity: issue.severity,
          message: issue.message,
          suggestion: issue.suggestion,
          field: issue.field,
        }));

        // Merge with instant analysis, preferring AI for duplicates
        const instantIssues = runInstantAnalysis(draft);
        const mergedIssues = [...aiIssues];
        
        // Add instant issues that AI didn't catch
        for (const instant of instantIssues) {
          if (!aiIssues.some(ai => ai.message.toLowerCase().includes(instant.message.toLowerCase().slice(0, 20)))) {
            mergedIssues.push(instant);
          }
        }

        const finalScore = data.result.score ?? calculateScore(mergedIssues, draft);

        setResult({
          score: finalScore,
          issues: mergedIssues,
          isAnalyzing: false,
        });

        return { score: finalScore, issues: mergedIssues };
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
      toast.error('AI analysis failed, using local analysis');
    }

    // Fallback to instant analysis
    const issues = runInstantAnalysis(draft);
    const score = calculateScore(issues, draft);
    setResult({ score, issues, isAnalyzing: false });
    return { score, issues };
  }, []);

  const requestAISuggestions = useCallback(async (draft: MarketDraft): Promise<AISuggestion[]> => {
    setResult((prev) => ({ ...prev, isAnalyzing: true }));

    try {
      const { data, error } = await supabase.functions.invoke('market-clarity-ai', {
        body: { draft, action: 'suggest' }
      });

      if (error) throw error;

      if (data?.success && data.result?.suggestions) {
        setResult((prev) => ({
          ...prev,
          isAnalyzing: false,
          aiSuggestions: data.result.suggestions,
        }));
        return data.result.suggestions;
      }
    } catch (err) {
      console.error('AI suggestions failed:', err);
      toast.error('Failed to get AI suggestions');
    }

    setResult((prev) => ({ ...prev, isAnalyzing: false }));
    return [];
  }, []);

  const requestAIRewrite = useCallback(async (draft: MarketDraft): Promise<AIRewrite | null> => {
    setResult((prev) => ({ ...prev, isAnalyzing: true }));

    try {
      const { data, error } = await supabase.functions.invoke('market-clarity-ai', {
        body: { draft, action: 'rewrite' }
      });

      if (error) throw error;

      if (data?.success && data.result) {
        setResult((prev) => ({ ...prev, isAnalyzing: false }));
        return data.result;
      }
    } catch (err) {
      console.error('AI rewrite failed:', err);
      toast.error('Failed to get AI rewrite');
    }

    setResult((prev) => ({ ...prev, isAnalyzing: false }));
    return null;
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
    requestAISuggestions,
    requestAIRewrite,
  };
}
