-- Add manifold_username and deposit verification fields to navloc_applications
ALTER TABLE public.navloc_applications 
ADD COLUMN IF NOT EXISTS manifold_username TEXT,
ADD COLUMN IF NOT EXISTS deposit_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_transaction_id UUID,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 10;