-- Fix security issue: Require authentication to view loans
-- This prevents anonymous data scraping while maintaining marketplace functionality for authenticated users

DROP POLICY IF EXISTS "Anyone can view loans" ON public.loans;

CREATE POLICY "Authenticated users can view loans" 
ON public.loans FOR SELECT 
USING (auth.uid() IS NOT NULL);