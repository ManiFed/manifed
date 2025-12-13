-- Create table for storing arbitrage opportunity feedback for AI learning
CREATE TABLE public.arbitrage_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  opportunity_id TEXT NOT NULL,
  market_1_id TEXT NOT NULL,
  market_1_question TEXT NOT NULL,
  market_2_id TEXT NOT NULL,
  market_2_question TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,
  expected_profit NUMERIC NOT NULL,
  is_valid_opportunity BOOLEAN NOT NULL,
  feedback_reason TEXT,
  actual_outcome TEXT,
  actual_profit NUMERIC,
  ai_confidence_score NUMERIC,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.arbitrage_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view all feedback to improve AI learning
CREATE POLICY "Users can view all arbitrage feedback" 
ON public.arbitrage_feedback 
FOR SELECT 
TO authenticated
USING (true);

-- Users can create feedback on their own analyses
CREATE POLICY "Users can create their own feedback" 
ON public.arbitrage_feedback 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_arbitrage_feedback_valid ON public.arbitrage_feedback(is_valid_opportunity);
CREATE INDEX idx_arbitrage_feedback_type ON public.arbitrage_feedback(opportunity_type);