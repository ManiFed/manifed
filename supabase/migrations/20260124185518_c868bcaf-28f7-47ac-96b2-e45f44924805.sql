-- Add escrow_balance to user_balances to track locked funds
ALTER TABLE public.user_balances 
ADD COLUMN IF NOT EXISTS escrow_balance NUMERIC NOT NULL DEFAULT 0;

-- Add expires_at to loan_negotiations for timeframe
ALTER TABLE public.loan_negotiations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add escrow tracking column
ALTER TABLE public.loan_negotiations 
ADD COLUMN IF NOT EXISTS escrow_held BOOLEAN NOT NULL DEFAULT false;

-- For loan offers, track escrowed amount on the loan itself
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS offer_escrowed BOOLEAN NOT NULL DEFAULT false;

-- Function to calculate available balance (balance minus escrow)
CREATE OR REPLACE FUNCTION public.get_available_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_escrow NUMERIC;
BEGIN
  SELECT COALESCE(balance, 0), COALESCE(escrow_balance, 0)
  INTO v_balance, v_escrow
  FROM user_balances
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_balance - v_escrow, 0);
END;
$$;

-- Function to escrow funds (move from available to escrow)
CREATE OR REPLACE FUNCTION public.escrow_funds(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  -- Get available balance
  v_available := get_available_balance(p_user_id);
  
  IF v_available < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Add to escrow (doesn't change total balance, just locks it)
  UPDATE user_balances
  SET escrow_balance = escrow_balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to release escrow back to available
CREATE OR REPLACE FUNCTION public.release_escrow(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_balances
  SET escrow_balance = GREATEST(0, escrow_balance - p_amount),
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to transfer escrowed funds to another user
CREATE OR REPLACE FUNCTION public.transfer_escrowed_funds(p_from_user_id UUID, p_to_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove from sender's escrow AND balance
  UPDATE user_balances
  SET escrow_balance = GREATEST(0, escrow_balance - p_amount),
      balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_from_user_id;
  
  -- Add to receiver's balance
  INSERT INTO user_balances (user_id, balance, escrow_balance)
  VALUES (p_to_user_id, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_balances.balance + p_amount,
      updated_at = now();
  
  RETURN TRUE;
END;
$$;