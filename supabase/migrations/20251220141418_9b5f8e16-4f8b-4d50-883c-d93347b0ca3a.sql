-- Create a table to control the trading bots emergency stop
CREATE TABLE IF NOT EXISTS public.trading_bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert the emergency stop setting (default: bots are enabled)
INSERT INTO public.trading_bot_settings (setting_key, setting_value)
VALUES ('emergency_stop', 'false')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.trading_bot_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify settings
CREATE POLICY "Admins can view bot settings"
ON public.trading_bot_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bot settings"
ON public.trading_bot_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert bot settings"
ON public.trading_bot_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));