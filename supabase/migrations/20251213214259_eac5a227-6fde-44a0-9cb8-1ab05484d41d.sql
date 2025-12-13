-- Add INSERT policy to bond_transactions to prevent transaction forgery
-- Only allow inserts where the authenticated user is a participant in the transaction
CREATE POLICY "Users can create valid transactions"
ON public.bond_transactions
FOR INSERT
WITH CHECK (auth.uid() IN (from_user_id, to_user_id));