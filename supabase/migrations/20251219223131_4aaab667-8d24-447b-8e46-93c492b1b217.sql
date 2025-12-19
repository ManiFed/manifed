-- Create table for bot configurations
CREATE TABLE public.trading_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMP WITH TIME ZONE,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for bot run history
CREATE TABLE public.bot_run_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES public.trading_bots(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  trades_executed INTEGER NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  markets_analyzed INTEGER NOT NULL DEFAULT 0,
  log TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for product suggestions
CREATE TABLE public.product_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_run_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_bots (admin only)
CREATE POLICY "Admins can manage bots" ON public.trading_bots
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active bots" ON public.trading_bots
  FOR SELECT USING (is_active = true);

-- RLS Policies for bot_run_history (admin only)
CREATE POLICY "Admins can view bot history" ON public.bot_run_history
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for product_suggestions
CREATE POLICY "Users can create suggestions" ON public.product_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own suggestions" ON public.product_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all suggestions" ON public.product_suggestions
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to delete loans
CREATE POLICY "Admins can delete loans" ON public.loans
  FOR DELETE USING (has_role(auth.uid(), 'admin'));