-- NAVLOC (Net Account Value Line of Credit) System

-- Credit applications table
CREATE TABLE public.credit_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  manifold_username TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications"
ON public.credit_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
ON public.credit_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON public.credit_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
ON public.credit_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- NAVLOC credit lines table
CREATE TABLE public.navloc_credit_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  credit_grade TEXT NOT NULL CHECK (credit_grade IN ('AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C')),
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  available_credit NUMERIC GENERATED ALWAYS AS (credit_limit - current_balance) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_interest_payment TIMESTAMP WITH TIME ZONE,
  interest_due NUMERIC NOT NULL DEFAULT 0,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.navloc_credit_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit line"
ON public.navloc_credit_lines FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit lines"
ON public.navloc_credit_lines FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage credit lines"
ON public.navloc_credit_lines FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- NAVLOC transactions (drawdowns and repayments)
CREATE TABLE public.navloc_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credit_line_id UUID NOT NULL REFERENCES public.navloc_credit_lines(id),
  type TEXT NOT NULL CHECK (type IN ('drawdown', 'repayment', 'interest_charge', 'interest_payment')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.navloc_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own NAVLOC transactions"
ON public.navloc_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all NAVLOC transactions"
ON public.navloc_transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Net worth history for tracking over time
CREATE TABLE public.net_worth_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  basic_net_worth NUMERIC NOT NULL DEFAULT 0,
  liquidity_adjusted_net_worth NUMERIC NOT NULL DEFAULT 0,
  total_net_worth NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.net_worth_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own net worth history"
ON public.net_worth_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own net worth history"
ON public.net_worth_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updating timestamps on credit lines
CREATE TRIGGER update_navloc_credit_lines_updated_at
BEFORE UPDATE ON public.navloc_credit_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bond issuers table for entity bonds (ManiFed, RISK, etc.)
CREATE TABLE public.bond_issuers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bond_issuers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bond issuers"
ON public.bond_issuers FOR SELECT
USING (true);

CREATE POLICY "Admins can manage bond issuers"
ON public.bond_issuers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default bond issuers
INSERT INTO public.bond_issuers (name, description, is_verified) VALUES
('ManiFed', 'Manifold Federal Reserve - Official treasury bonds', true),
('ManiFed Trading', 'ManiFed Trading Division - Trading desk bonds', true);

-- Add issuer_id to bonds table
ALTER TABLE public.bonds ADD COLUMN IF NOT EXISTS issuer_id UUID REFERENCES public.bond_issuers(id);