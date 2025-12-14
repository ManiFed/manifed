-- Create table for scan history/past results
CREATE TABLE public.arbitrage_scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running',
  markets_scanned INTEGER DEFAULT 0,
  tradeable_markets INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  high_confidence INTEGER DEFAULT 0,
  medium_confidence INTEGER DEFAULT 0,
  low_confidence INTEGER DEFAULT 0,
  scan_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for market watchlist
CREATE TABLE public.arbitrage_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  market_id TEXT NOT NULL,
  market_question TEXT NOT NULL,
  market_url TEXT NOT NULL,
  initial_probability NUMERIC,
  current_probability NUMERIC,
  liquidity NUMERIC,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  alert_threshold NUMERIC DEFAULT 0.05,
  UNIQUE(user_id, market_id)
);

-- Create table for scheduled scans
CREATE TABLE public.arbitrage_scan_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cron_expression TEXT NOT NULL DEFAULT '0 */6 * * *',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  scan_config JSONB,
  email_on_completion BOOLEAN DEFAULT true,
  email_on_opportunities BOOLEAN DEFAULT true,
  min_opportunity_threshold NUMERIC DEFAULT 0.03,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for notifications
CREATE TABLE public.arbitrage_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.arbitrage_scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbitrage_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbitrage_scan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbitrage_notifications ENABLE ROW LEVEL SECURITY;

-- Scan history policies
CREATE POLICY "Users can view their own scan history" ON public.arbitrage_scan_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan history" ON public.arbitrage_scan_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Watchlist policies
CREATE POLICY "Users can view their own watchlist" ON public.arbitrage_watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own watchlist" ON public.arbitrage_watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist" ON public.arbitrage_watchlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist" ON public.arbitrage_watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Scan schedules policies
CREATE POLICY "Users can view their own schedules" ON public.arbitrage_scan_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedules" ON public.arbitrage_scan_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedules" ON public.arbitrage_scan_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedules" ON public.arbitrage_scan_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.arbitrage_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.arbitrage_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Drop the scan locks table (removing queue)
DROP TABLE IF EXISTS public.arbitrage_scan_locks;