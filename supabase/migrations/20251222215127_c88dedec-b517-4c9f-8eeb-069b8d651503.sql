-- Add account_code to user_balances for unique user identification
ALTER TABLE public.user_balances 
ADD COLUMN IF NOT EXISTS account_code TEXT UNIQUE;

-- Generate unique account codes for existing users
UPDATE public.user_balances 
SET account_code = 'MF-' || UPPER(SUBSTR(MD5(user_id::text || now()::text), 1, 8))
WHERE account_code IS NULL;

-- Make account_code not null and add default for new records
ALTER TABLE public.user_balances 
ALTER COLUMN account_code SET DEFAULT 'MF-' || UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 8));

-- Add withdrawal_username to user_manifold_settings for withdrawal destination
ALTER TABLE public.user_manifold_settings
ADD COLUMN IF NOT EXISTS withdrawal_username TEXT;

-- Create fintech_subscriptions table for ManiFed Fintech billing
CREATE TABLE IF NOT EXISTS public.fintech_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'none', -- 'none', 'monthly', 'quarterly', 'yearly'
  mana_price INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_gifted BOOLEAN NOT NULL DEFAULT false,
  gifted_by UUID,
  discount_percent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription_rates table for admin-configurable rates
CREATE TABLE IF NOT EXISTS public.subscription_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE, -- 'monthly', 'quarterly', 'yearly'
  mana_price INTEGER NOT NULL,
  is_on_sale BOOLEAN NOT NULL DEFAULT false,
  sale_price INTEGER,
  sale_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default subscription rates
INSERT INTO public.subscription_rates (plan_type, mana_price) VALUES
  ('monthly', 40),
  ('quarterly', 109),
  ('yearly', 400)
ON CONFLICT (plan_type) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.fintech_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_rates ENABLE ROW LEVEL SECURITY;

-- RLS for fintech_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.fintech_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.fintech_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update subscriptions"
  ON public.fintech_subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.fintech_subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS for subscription_rates (anyone can view, admins can manage)
CREATE POLICY "Anyone can view subscription rates"
  ON public.subscription_rates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage subscription rates"
  ON public.subscription_rates FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_fintech_subscriptions_updated_at
  BEFORE UPDATE ON public.fintech_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_rates_updated_at
  BEFORE UPDATE ON public.subscription_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();