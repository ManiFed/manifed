-- Add loan_type to distinguish between loan requests and loan offers
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS loan_type TEXT NOT NULL DEFAULT 'request' CHECK (loan_type IN ('request', 'offer'));

-- Add is_verified flag and research_fee_paid for trustworthy badge
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS research_fee_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS research_fee_amount INTEGER;

-- Create loan_negotiations table for negotiation workflow
CREATE TABLE IF NOT EXISTS public.loan_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  negotiator_user_id UUID NOT NULL,
  negotiator_username TEXT NOT NULL,
  proposed_amount INTEGER NOT NULL,
  proposed_interest_rate NUMERIC NOT NULL,
  proposed_term_days INTEGER NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on loan_negotiations
ALTER TABLE public.loan_negotiations ENABLE ROW LEVEL SECURITY;

-- RLS policies for loan_negotiations
CREATE POLICY "Users can view negotiations on their loans or their own negotiations"
  ON public.loan_negotiations FOR SELECT
  USING (
    negotiator_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.loans WHERE loans.id = loan_negotiations.loan_id AND loans.borrower_user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create negotiations"
  ON public.loan_negotiations FOR INSERT
  WITH CHECK (auth.uid() = negotiator_user_id);

CREATE POLICY "Users can update their own negotiations or negotiations on their loans"
  ON public.loan_negotiations FOR UPDATE
  USING (
    negotiator_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.loans WHERE loans.id = loan_negotiations.loan_id AND loans.borrower_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at on loan_negotiations
CREATE TRIGGER update_loan_negotiations_updated_at
  BEFORE UPDATE ON public.loan_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();