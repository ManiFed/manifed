-- Create table for limit sell orders (hedge orders)
CREATE TABLE public.limit_sell_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  market_url text NOT NULL,
  position_type text NOT NULL CHECK (position_type IN ('YES', 'NO')),
  shares_held numeric NOT NULL,
  entry_price numeric NOT NULL,
  target_exit_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'expired')),
  limit_order_id text,
  cash_required numeric NOT NULL,
  expected_profit numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  filled_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- Create table for conditional buy orders
CREATE TABLE public.conditional_buy_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  market_id text NOT NULL,
  market_question text NOT NULL,
  market_url text NOT NULL,
  target_probability numeric NOT NULL CHECK (target_probability > 0 AND target_probability < 1),
  trigger_direction text NOT NULL CHECK (trigger_direction IN ('above', 'below')),
  amount numeric NOT NULL CHECK (amount > 0),
  outcome text NOT NULL CHECK (outcome IN ('YES', 'NO')),
  status text NOT NULL DEFAULT 'monitoring' CHECK (status IN ('monitoring', 'triggered', 'filled', 'cancelled', 'failed')),
  current_probability numeric,
  bet_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_at timestamp with time zone,
  filled_at timestamp with time zone,
  last_checked_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.limit_sell_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conditional_buy_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for limit_sell_orders
CREATE POLICY "Users can view their own limit sell orders"
ON public.limit_sell_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own limit sell orders"
ON public.limit_sell_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own limit sell orders"
ON public.limit_sell_orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own limit sell orders"
ON public.limit_sell_orders FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for conditional_buy_orders
CREATE POLICY "Users can view their own conditional buy orders"
ON public.conditional_buy_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conditional buy orders"
ON public.conditional_buy_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conditional buy orders"
ON public.conditional_buy_orders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conditional buy orders"
ON public.conditional_buy_orders FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_limit_sell_orders_updated_at
BEFORE UPDATE ON public.limit_sell_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conditional_buy_orders_updated_at
BEFORE UPDATE ON public.conditional_buy_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();