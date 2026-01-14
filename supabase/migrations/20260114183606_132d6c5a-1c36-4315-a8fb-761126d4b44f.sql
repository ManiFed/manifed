-- Add unique constraint on user_id for navloc_credit_lines to enable upsert
ALTER TABLE public.navloc_credit_lines 
ADD CONSTRAINT navloc_credit_lines_user_id_unique UNIQUE (user_id);

-- Also add index for better performance
CREATE INDEX IF NOT EXISTS idx_navloc_credit_lines_user_id ON public.navloc_credit_lines(user_id);

-- Allow admins to update navloc_applications
DROP POLICY IF EXISTS "Admins can update NAVLOC applications" ON public.navloc_applications;
CREATE POLICY "Admins can update NAVLOC applications" 
ON public.navloc_applications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to insert navloc_credit_lines
DROP POLICY IF EXISTS "Admins can insert NAVLOC credit lines" ON public.navloc_credit_lines;
CREATE POLICY "Admins can insert NAVLOC credit lines" 
ON public.navloc_credit_lines 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update navloc_credit_lines
DROP POLICY IF EXISTS "Admins can update NAVLOC credit lines" ON public.navloc_credit_lines;
CREATE POLICY "Admins can update NAVLOC credit lines" 
ON public.navloc_credit_lines 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);