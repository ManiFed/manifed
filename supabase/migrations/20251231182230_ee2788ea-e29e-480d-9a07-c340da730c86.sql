-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all arbitrage feedback" ON public.arbitrage_feedback;

-- Create restricted policy: users can only view their own feedback
CREATE POLICY "Users can view their own feedback" 
ON public.arbitrage_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admins to view all feedback
CREATE POLICY "Admins can view all arbitrage feedback" 
ON public.arbitrage_feedback 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));