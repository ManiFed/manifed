-- Add RLS policies to fee_pool table
CREATE POLICY "Admins can view fee pool"
ON public.fee_pool
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage fee pool"
ON public.fee_pool
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Service role needs insert access for verify-transactions
CREATE POLICY "Service can insert fee pool"
ON public.fee_pool
FOR INSERT
WITH CHECK (true);