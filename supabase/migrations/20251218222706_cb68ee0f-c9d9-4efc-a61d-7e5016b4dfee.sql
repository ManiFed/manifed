-- Add mfai_credits_used column to replace individual usage counters
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS mfai_credits_used integer NOT NULL DEFAULT 0;

-- Add trump_level to user settings (stored in profiles)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trump_level integer NOT NULL DEFAULT 7;

-- Add theme preference to profiles  
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark';

-- Create quester_subscriptions table for the Quester product
CREATE TABLE IF NOT EXISTS public.quester_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  next_trade_at timestamp with time zone,
  last_trade_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quester_subscriptions
ALTER TABLE public.quester_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for quester_subscriptions
CREATE POLICY "Users can view their own quester subscription"
ON public.quester_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quester subscription"
ON public.quester_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quester subscription"
ON public.quester_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quester subscription"
ON public.quester_subscriptions FOR DELETE
USING (auth.uid() = user_id);