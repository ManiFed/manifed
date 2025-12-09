-- Create memecoins table
CREATE TABLE public.memecoins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  creator_id UUID NOT NULL,
  pool_mana NUMERIC NOT NULL DEFAULT 0,
  pool_tokens NUMERIC NOT NULL DEFAULT 0,
  total_supply NUMERIC NOT NULL DEFAULT 1000000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on memecoins
ALTER TABLE public.memecoins ENABLE ROW LEVEL SECURITY;

-- Anyone can view memecoins
CREATE POLICY "Anyone can view memecoins" ON public.memecoins
  FOR SELECT USING (true);

-- Users can create memecoins
CREATE POLICY "Authenticated users can create memecoins" ON public.memecoins
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Create memecoin_holdings table for user token balances
CREATE TABLE public.memecoin_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memecoin_id UUID NOT NULL REFERENCES public.memecoins(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, memecoin_id)
);

-- Enable RLS on memecoin_holdings
ALTER TABLE public.memecoin_holdings ENABLE ROW LEVEL SECURITY;

-- Users can view their own holdings
CREATE POLICY "Users can view their own holdings" ON public.memecoin_holdings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own holdings
CREATE POLICY "Users can insert their own holdings" ON public.memecoin_holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own holdings
CREATE POLICY "Users can update their own holdings" ON public.memecoin_holdings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create memecoin_trades table for price history
CREATE TABLE public.memecoin_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memecoin_id UUID NOT NULL REFERENCES public.memecoins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  mana_amount NUMERIC NOT NULL,
  token_amount NUMERIC NOT NULL,
  price_per_token NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on memecoin_trades
ALTER TABLE public.memecoin_trades ENABLE ROW LEVEL SECURITY;

-- Anyone can view trades
CREATE POLICY "Anyone can view trades" ON public.memecoin_trades
  FOR SELECT USING (true);

-- Users can insert their own trades
CREATE POLICY "Users can insert their own trades" ON public.memecoin_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create market_items table for profile customization
CREATE TABLE public.market_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('flair', 'badge', 'background', 'effect')),
  image_url TEXT,
  price NUMERIC NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on market_items
ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view market items
CREATE POLICY "Anyone can view market items" ON public.market_items
  FOR SELECT USING (true);

-- Create user_items table for purchased items
CREATE TABLE public.user_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.market_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, item_id)
);

-- Enable RLS on user_items
ALTER TABLE public.user_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own items
CREATE POLICY "Users can view their own items" ON public.user_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own items
CREATE POLICY "Users can insert their own items" ON public.user_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own items
CREATE POLICY "Users can update their own items" ON public.user_items
  FOR UPDATE USING (auth.uid() = user_id);

-- Create fee_pool table to track collected fees for bundled payouts
CREATE TABLE public.fee_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_out BOOLEAN NOT NULL DEFAULT false,
  paid_out_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on fee_pool
ALTER TABLE public.fee_pool ENABLE ROW LEVEL SECURITY;

-- Only service role can access fee_pool
CREATE POLICY "Service role can view fee pool" ON public.fee_pool
  FOR SELECT USING (true);

-- Insert some default market items
INSERT INTO public.market_items (name, description, category, price, rarity) VALUES
-- Flairs (profile effects)
('Diamond Trader', 'Sparkle effect on your profile', 'flair', 200, 'rare'),
('Fire Investor', 'Flame animation on your name', 'flair', 150, 'uncommon'),
('Golden Crown', 'A golden crown above your name', 'flair', 300, 'epic'),
('Rainbow Aura', 'Prismatic glow around your profile', 'flair', 250, 'rare'),
('Lightning Strike', 'Electric effect on hover', 'flair', 175, 'uncommon'),

-- Badges
('Early Adopter', 'For the first 100 users', 'badge', 50, 'common'),
('Whale', 'Invested over M$10,000', 'badge', 100, 'rare'),
('Market Maker', 'Created 10+ loans', 'badge', 75, 'uncommon'),
('Diamond Hands', 'Held bonds to maturity 5 times', 'badge', 60, 'common'),
('Top Lender', 'Ranked in top 10 lenders', 'badge', 100, 'rare'),
('Memecoin Creator', 'Created a memecoin', 'badge', 50, 'common'),

-- Backgrounds
('Starfield', 'Animated star background', 'background', 100, 'rare'),
('Gradient Wave', 'Flowing gradient animation', 'background', 50, 'common'),
('Matrix Rain', 'Green code rain effect', 'background', 75, 'uncommon'),
('Northern Lights', 'Aurora borealis effect', 'background', 100, 'rare'),
('Cosmic Nebula', 'Space nebula background', 'background', 60, 'uncommon'),

-- Effects
('Particle Trail', 'Particles follow your cursor', 'effect', 125, 'uncommon'),
('Confetti Burst', 'Confetti on profile visits', 'effect', 100, 'uncommon'),
('Glitch Effect', 'Occasional glitch animation', 'effect', 75, 'common'),
('Holographic', 'Holographic shimmer on cards', 'effect', 200, 'epic'),
('Neon Glow', 'Neon outline on your cards', 'effect', 150, 'rare');