-- Remove the vulnerable INSERT and UPDATE RLS policies from user_balances
DROP POLICY IF EXISTS "Users can insert their own balance" ON public.user_balances;
DROP POLICY IF EXISTS "Users can update their own balance" ON public.user_balances;

-- Create a SECURITY DEFINER function to safely modify balances (only callable by service role)
CREATE OR REPLACE FUNCTION public.modify_user_balance(
  p_user_id uuid,
  p_amount numeric,
  p_operation text -- 'add' or 'subtract'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_operation = 'add' THEN
    INSERT INTO public.user_balances (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = user_balances.balance + p_amount,
      updated_at = now();
  ELSIF p_operation = 'subtract' THEN
    UPDATE public.user_balances 
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND balance >= p_amount;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient balance or user not found';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid operation. Use add or subtract';
  END IF;
END;
$$;

-- Revoke direct execute from public, only service role can call this
REVOKE EXECUTE ON FUNCTION public.modify_user_balance FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.modify_user_balance FROM anon;
REVOKE EXECUTE ON FUNCTION public.modify_user_balance FROM authenticated;