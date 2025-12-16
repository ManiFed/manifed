-- Add INSERT policy for bond_interest_payments (service role will insert)
CREATE POLICY "Service role can insert interest payments"
ON public.bond_interest_payments FOR INSERT
WITH CHECK (true);