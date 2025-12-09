-- Create user_balances table to track ManiFed balances
CREATE TABLE public.user_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_invested NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_balances
CREATE POLICY "Users can view their own balance" 
ON public.user_balances FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own balance" 
ON public.user_balances FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance" 
ON public.user_balances FOR UPDATE 
USING (auth.uid() = user_id);

-- Create loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_user_id UUID NOT NULL,
  borrower_username TEXT NOT NULL,
  borrower_reputation INTEGER NOT NULL DEFAULT 50,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  funded_amount NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL,
  term_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'seeking_funding',
  funding_deadline TIMESTAMP WITH TIME ZONE,
  maturity_date TIMESTAMP WITH TIME ZONE,
  risk_score TEXT NOT NULL DEFAULT 'medium',
  collateral_description TEXT,
  manifold_market_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for loans
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Everyone can view loans
CREATE POLICY "Anyone can view loans" 
ON public.loans FOR SELECT 
USING (true);

-- Users can create their own loans
CREATE POLICY "Users can create their own loans" 
ON public.loans FOR INSERT 
WITH CHECK (auth.uid() = borrower_user_id);

-- Users can update their own loans
CREATE POLICY "Users can update their own loans" 
ON public.loans FOR UPDATE 
USING (auth.uid() = borrower_user_id);

-- Create investments table
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  investor_user_id UUID NOT NULL,
  investor_username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for investments
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Anyone can view investments on loans
CREATE POLICY "Anyone can view investments" 
ON public.investments FOR SELECT 
USING (true);

-- Users can create their own investments
CREATE POLICY "Users can create their own investments" 
ON public.investments FOR INSERT 
WITH CHECK (auth.uid() = investor_user_id);

-- Create transactions table for history
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdraw', 'invest', 'loan_received', 'repayment'
  amount NUMERIC NOT NULL,
  description TEXT,
  loan_id UUID REFERENCES public.loans(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON public.user_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();