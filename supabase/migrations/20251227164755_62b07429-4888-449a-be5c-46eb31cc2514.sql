-- Add trial period columns to fintech_subscriptions table
ALTER TABLE public.fintech_subscriptions 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;

-- Update existing records to have is_trial = false
UPDATE public.fintech_subscriptions SET is_trial = false WHERE is_trial IS NULL;