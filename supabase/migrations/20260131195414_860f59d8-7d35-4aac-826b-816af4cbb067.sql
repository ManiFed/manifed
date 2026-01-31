-- Wipe all escrow balances to 0
UPDATE public.user_balances
SET escrow_balance = 0, updated_at = now()
WHERE escrow_balance > 0;