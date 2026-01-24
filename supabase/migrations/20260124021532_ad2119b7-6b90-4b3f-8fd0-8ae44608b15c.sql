-- Smart Money Watchlist
CREATE TABLE public.smart_money_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trader_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, trader_id)
);

ALTER TABLE public.smart_money_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their smart money watchlist"
ON public.smart_money_watchlist
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Correlation Watchlist
CREATE TABLE public.correlation_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pair_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, pair_id)
);

ALTER TABLE public.correlation_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their correlation watchlist"
ON public.correlation_watchlist
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Correlation Alerts
CREATE TABLE public.correlation_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pair_id TEXT NOT NULL,
  message TEXT NOT NULL,
  divergence NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.correlation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their correlation alerts"
ON public.correlation_alerts
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Conditional Trade Rules
CREATE TABLE public.conditional_trade_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  condition_logic TEXT NOT NULL DEFAULT 'AND',
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conditional_trade_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their conditional trade rules"
ON public.conditional_trade_rules
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_conditional_trade_rules_updated_at
BEFORE UPDATE ON public.conditional_trade_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();