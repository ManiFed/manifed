-- Create trigger function to automatically update loan funded_amount when investments are inserted
CREATE OR REPLACE FUNCTION public.update_loan_funding()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.loans 
  SET 
    funded_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.investments
      WHERE loan_id = NEW.loan_id
    ),
    status = CASE 
      WHEN (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.investments
        WHERE loan_id = NEW.loan_id
      ) >= amount THEN 'active'
      ELSE 'seeking_funding'
    END,
    updated_at = now()
  WHERE id = NEW.loan_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to fire after investment insert
CREATE TRIGGER investment_updates_loan_funding
AFTER INSERT ON public.investments
FOR EACH ROW
EXECUTE FUNCTION public.update_loan_funding();