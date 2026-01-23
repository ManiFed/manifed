export type MarketType = 'binary' | 'multiple_choice' | 'numeric' | 'poll';
export type ResolutionType = 'manual' | 'api' | 'oracle';
export type DraftStatus = 'draft' | 'review' | 'live' | 'resolved';

export interface MarketDraft {
  id: string;
  title: string;
  description: string;
  resolutionCriteria: string;
  marketType: MarketType;
  resolutionType: ResolutionType;
  closeDate: Date | null;
  status: DraftStatus;
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  clarityScore: number;
  issues: ClarityIssue[];
}

export interface ClarityIssue {
  id: string;
  type: 'ambiguity' | 'timeline' | 'criteria' | 'scope' | 'measurability';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
  field: 'title' | 'description' | 'resolutionCriteria';
  highlight?: { start: number; end: number };
}

export interface MarketTemplate {
  id: string;
  name: string;
  category: string;
  tags: string[];
  title: string;
  description: string;
  resolutionCriteria: string;
  marketType: MarketType;
}

export interface CreatorStats {
  averageClarityScore: number;
  totalMarkets: number;
  disputeRate: number;
  recentPerformance: 'improving' | 'stable' | 'declining';
}

export interface LiquidityGuidance {
  expectedEngagement: 'low' | 'medium' | 'high';
  suggestedSubsidyMin: number;
  suggestedSubsidyMax: number;
  reasoning: string;
  similarMarkets?: string[];
}
