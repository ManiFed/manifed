-- Create arbitrage scan queue/lock table
CREATE TABLE public.arbitrage_scan_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'scanning', -- 'scanning', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER DEFAULT 0, -- 0-100 progress percentage
  markets_scanned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only one active scan at a time
CREATE UNIQUE INDEX idx_arbitrage_scan_active ON public.arbitrage_scan_locks (status) WHERE status = 'scanning';

-- Enable RLS
ALTER TABLE public.arbitrage_scan_locks ENABLE ROW LEVEL SECURITY;

-- Users can view all scan statuses (to see queue position)
CREATE POLICY "Users can view scan locks"
ON public.arbitrage_scan_locks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own scan requests
CREATE POLICY "Users can insert their own scan locks"
ON public.arbitrage_scan_locks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scans
CREATE POLICY "Users can update their own scan locks"
ON public.arbitrage_scan_locks
FOR UPDATE
USING (auth.uid() = user_id);

-- Auto-cleanup old completed scans (keep only last 24 hours)
-- This will be handled by the edge function