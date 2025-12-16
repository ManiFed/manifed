-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add bond_code to bonds table
ALTER TABLE public.bonds ADD COLUMN bond_code TEXT UNIQUE;

-- Add next_interest_date for monthly payment tracking
ALTER TABLE public.bonds ADD COLUMN next_interest_date TIMESTAMP WITH TIME ZONE;

-- Create function to generate unique bond code
CREATE OR REPLACE FUNCTION public.generate_bond_code()
RETURNS TRIGGER AS $$
DECLARE
  term_prefix TEXT;
BEGIN
  CASE NEW.term_weeks
    WHEN 4 THEN term_prefix := 'TB4W';
    WHEN 13 THEN term_prefix := 'TB3M';
    WHEN 26 THEN term_prefix := 'TB6M';
    WHEN 52 THEN term_prefix := 'TB1Y';
    ELSE term_prefix := 'TB';
  END CASE;
  
  NEW.bond_code := term_prefix || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for bond code generation
CREATE TRIGGER set_bond_code
BEFORE INSERT ON public.bonds
FOR EACH ROW
EXECUTE FUNCTION public.generate_bond_code();

-- Create table for tracking interest payments
CREATE TABLE public.bond_interest_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bond_id UUID REFERENCES public.bonds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on interest payments
ALTER TABLE public.bond_interest_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interest payments"
ON public.bond_interest_payments FOR SELECT
USING (auth.uid() = user_id);

-- Allow admins to manage bond_rates
CREATE POLICY "Admins can insert bond rates"
ON public.bond_rates FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bond rates"
ON public.bond_rates FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete bond rates"
ON public.bond_rates FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage treasury_news
CREATE POLICY "Admins can insert treasury news"
ON public.treasury_news FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update treasury news"
ON public.treasury_news FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete treasury news"
ON public.treasury_news FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));