-- Allow authenticated users to update memecoin pools (needed for trades)
CREATE POLICY "Authenticated users can update memecoin pools"
ON public.memecoins
FOR UPDATE
USING (true)
WITH CHECK (true);