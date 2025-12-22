-- Create pending_transactions table for the new transaction code system
CREATE TABLE public.pending_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_code TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL, -- 'loan_funding', 'loan_repayment', 'loan_cancellation', 'bond_purchase'
  amount NUMERIC NOT NULL,
  related_id UUID, -- loan_id or bond_id depending on type
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'refunded'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  from_manifold_user_id TEXT, -- who sent the mana
  from_manifold_username TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending transactions
CREATE POLICY "Users can view their own pending transactions"
ON public.pending_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own pending transactions
CREATE POLICY "Users can insert their own pending transactions"
ON public.pending_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update all (for verification process)
CREATE POLICY "Service role can update pending transactions"
ON public.pending_transactions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_pending_transactions_code ON public.pending_transactions(transaction_code);
CREATE INDEX idx_pending_transactions_status ON public.pending_transactions(status, expires_at);

-- Create public arbitrage opportunities table (admin-controlled)
CREATE TABLE public.public_arbitrage_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_1_id TEXT NOT NULL,
  market_1_question TEXT NOT NULL,
  market_1_url TEXT NOT NULL,
  market_1_prob NUMERIC NOT NULL,
  market_1_position TEXT NOT NULL,
  market_2_id TEXT NOT NULL,
  market_2_question TEXT NOT NULL,
  market_2_url TEXT NOT NULL,
  market_2_prob NUMERIC NOT NULL,
  market_2_position TEXT NOT NULL,
  expected_profit NUMERIC NOT NULL,
  confidence TEXT NOT NULL, -- 'high', 'medium', 'low'
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_by UUID, -- user who executed this opportunity
  executed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' -- 'active', 'executed', 'expired'
);

-- Enable RLS
ALTER TABLE public.public_arbitrage_opportunities ENABLE ROW LEVEL SECURITY;

-- Anyone can view active opportunities
CREATE POLICY "Anyone can view active opportunities"
ON public.public_arbitrage_opportunities
FOR SELECT
USING (true);

-- Admins can manage opportunities
CREATE POLICY "Admins can manage opportunities"
ON public.public_arbitrage_opportunities
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Authenticated users can update to mark as executed (only if status is active)
CREATE POLICY "Users can mark opportunities as executed"
ON public.public_arbitrage_opportunities
FOR UPDATE
USING (auth.uid() IS NOT NULL AND status = 'active')
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_public_arb_status ON public.public_arbitrage_opportunities(status);