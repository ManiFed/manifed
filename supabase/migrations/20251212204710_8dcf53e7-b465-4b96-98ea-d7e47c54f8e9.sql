-- Add funding_period_days column to loans table
-- This allows borrowers to set how long people can add mana to the loan
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS funding_period_days integer NOT NULL DEFAULT 7;

-- Update funding_deadline to be calculated from created_at + funding_period_days
-- (This will be done at the application level when creating loans)