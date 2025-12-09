-- Drop the existing overly permissive investments SELECT policy
DROP POLICY IF EXISTS "Anyone can view investments" ON public.investments;

-- Create a new restrictive policy that only allows:
-- 1. The investor to see their own investments
-- 2. The borrower of the associated loan to see investments in their loan
CREATE POLICY "Users can view relevant investments" ON public.investments
FOR SELECT USING (
  auth.uid() = investor_user_id OR
  auth.uid() IN (SELECT borrower_user_id FROM public.loans WHERE id = loan_id)
);