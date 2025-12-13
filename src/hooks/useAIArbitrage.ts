import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MarketPair {
  market1: {
    id: string;
    question: string;
    probability: number;
    liquidity?: number;
  };
  market2: {
    id: string;
    question: string;
    probability: number;
    liquidity?: number;
  };
  expectedProfit: number;
  matchReason?: string;
}

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

export function useAIArbitrage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AIAnalysis>>({});
  const [explanations, setExplanations] = useState<Record<string, AIExplanation>>({});

  const analyzePairs = async (pairs: MarketPair[]): Promise<AIAnalysis[]> => {
    if (pairs.length === 0) return [];
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-arbitrage', {
        body: { action: 'analyze_pairs', pairs }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const results = data.results as Array<AIAnalysis & { pairIndex: number }>;
      
      // Store results indexed by pair
      const newResults: Record<string, AIAnalysis> = {};
      results.forEach((result) => {
        const pair = pairs[result.pairIndex];
        const key = `${pair.market1.id}_${pair.market2.id}`;
        newResults[key] = {
          isValidArbitrage: result.isValidArbitrage,
          confidence: result.confidence,
          reason: result.reason,
          suggestedAction: result.suggestedAction,
        };
      });
      
      setAnalysisResults(prev => ({ ...prev, ...newResults }));
      return results;
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: 'AI Analysis Failed',
        description: error instanceof Error ? error.message : 'Could not analyze opportunities',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  };

  const explainOpportunity = async (pair: MarketPair): Promise<AIExplanation | null> => {
    const key = `${pair.market1.id}_${pair.market2.id}`;
    
    // Return cached explanation if available
    if (explanations[key]) {
      return explanations[key];
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-arbitrage', {
        body: { action: 'explain_opportunity', pairs: [pair] }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const explanation = data.explanation as AIExplanation;
      setExplanations(prev => ({ ...prev, [key]: explanation }));
      return explanation;
    } catch (error) {
      console.error('AI explanation error:', error);
      toast({
        title: 'AI Explanation Failed',
        description: error instanceof Error ? error.message : 'Could not generate explanation',
        variant: 'destructive',
      });
      return null;
    }
  };

  const submitFeedback = async (
    opportunityId: string,
    market1: { id: string; question: string },
    market2: { id: string; question: string },
    opportunityType: string,
    expectedProfit: number,
    isValid: boolean,
    reason: string,
    aiConfidence?: number,
    aiAnalysis?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-arbitrage', {
        body: {
          action: 'submit_feedback',
          feedback: {
            opportunityId,
            market1Id: market1.id,
            market1Question: market1.question,
            market2Id: market2.id,
            market2Question: market2.question,
            opportunityType,
            expectedProfit,
            isValid,
            reason,
            aiConfidence,
            aiAnalysis,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: 'Feedback Submitted',
        description: 'Thank you! Your feedback helps improve AI accuracy.',
      });
      return true;
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: 'Feedback Failed',
        description: error instanceof Error ? error.message : 'Could not submit feedback',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getAnalysis = (market1Id: string, market2Id: string): AIAnalysis | undefined => {
    return analysisResults[`${market1Id}_${market2Id}`] || analysisResults[`${market2Id}_${market1Id}`];
  };

  const clearAnalysis = () => {
    setAnalysisResults({});
    setExplanations({});
  };

  return {
    isAnalyzing,
    analysisResults,
    explanations,
    analyzePairs,
    explainOpportunity,
    submitFeedback,
    getAnalysis,
    clearAnalysis,
  };
}
