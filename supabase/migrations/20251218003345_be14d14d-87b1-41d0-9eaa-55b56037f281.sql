-- Add comment_posts_used column to user_subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS comment_posts_used integer NOT NULL DEFAULT 0;