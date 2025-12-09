-- Create bonds table
CREATE TABLE public.bonds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  term_weeks INTEGER NOT NULL,
  annual_yield NUMERIC NOT NULL DEFAULT 6.0,
  monthly_yield NUMERIC NOT NULL DEFAULT 0.5,
  purchase_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  maturity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  total_return NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bonds ENABLE ROW LEVEL SECURITY;

-- Users can view their own bonds
CREATE POLICY "Users can view their own bonds"
ON public.bonds
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own bonds
CREATE POLICY "Users can create their own bonds"
ON public.bonds
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create bond_rates table for rate history
CREATE TABLE public.bond_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term_weeks INTEGER NOT NULL,
  annual_yield NUMERIC NOT NULL,
  monthly_yield NUMERIC NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bond rates are public
ALTER TABLE public.bond_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bond rates"
ON public.bond_rates
FOR SELECT
USING (true);

-- Create treasury_news table
CREATE TABLE public.treasury_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Treasury news is public
ALTER TABLE public.treasury_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view treasury news"
ON public.treasury_news
FOR SELECT
USING (true);

-- Insert initial bond rates
INSERT INTO public.bond_rates (term_weeks, annual_yield, monthly_yield, effective_date) VALUES
(4, 6.0, 0.5, now()),
(13, 6.0, 0.5, now()),
(26, 6.0, 0.5, now()),
(52, 6.0, 0.5, now());

-- Insert welcome treasury news
INSERT INTO public.treasury_news (title, content, published_at) VALUES
('ManiFed Bonds Launch', 'Welcome to ManiFed Bonds! We are excited to offer fixed-income instruments for the Manifold prediction market ecosystem. Start earning stable yields today with our Treasury Bills.', now());