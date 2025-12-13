-- Fix memecoin_trades: Restrict to authenticated users viewing their own trades
DROP POLICY IF EXISTS "Anyone can view trades" ON public.memecoin_trades;

CREATE POLICY "Users can view their own trades"
ON public.memecoin_trades
FOR SELECT
USING (auth.uid() = user_id);

-- Fix fee_pool: Restrict to service role only (block all user access)
DROP POLICY IF EXISTS "Service role can view fee pool" ON public.fee_pool;

-- No SELECT policy means only service role can read
-- This is the intended behavior for internal financial data