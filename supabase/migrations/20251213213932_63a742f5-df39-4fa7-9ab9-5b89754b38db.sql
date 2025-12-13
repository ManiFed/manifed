-- Add RLS policies to prevent direct user manipulation of balances
-- Balances should only be modified via the modify_user_balance SECURITY DEFINER function

-- Users can only insert their own balance record (for initial creation)
CREATE POLICY "Users can insert their own balance"
ON public.user_balances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users cannot directly update balances (must use modify_user_balance RPC)
-- This policy allows users to only update non-balance fields if needed
-- But in practice, all updates go through the SECURITY DEFINER function
CREATE POLICY "Users cannot directly update balances"
ON public.user_balances
FOR UPDATE
USING (false)
WITH CHECK (false);

-- Users cannot delete balance records
CREATE POLICY "Users cannot delete balances"
ON public.user_balances
FOR DELETE
USING (false);