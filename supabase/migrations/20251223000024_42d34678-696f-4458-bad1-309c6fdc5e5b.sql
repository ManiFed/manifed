-- Drop the overly permissive UPDATE policy that allows any authenticated user to update memecoins
DROP POLICY IF EXISTS "Authenticated users can update memecoin pools" ON public.memecoins;

-- Add restrictive policy that denies direct user updates
-- Pool updates will only occur through edge functions using service role (which bypasses RLS)
CREATE POLICY "Deny direct memecoin pool updates"
ON public.memecoins FOR UPDATE
USING (false)
WITH CHECK (false);