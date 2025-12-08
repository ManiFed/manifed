-- Create table for storing user Manifold settings
CREATE TABLE public.user_manifold_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  manifold_api_key TEXT,
  manifold_user_id TEXT,
  manifold_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_manifold_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - users can only access their own settings
CREATE POLICY "Users can view their own manifold settings"
  ON public.user_manifold_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own manifold settings"
  ON public.user_manifold_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manifold settings"
  ON public.user_manifold_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manifold settings"
  ON public.user_manifold_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_manifold_settings_updated_at
  BEFORE UPDATE ON public.user_manifold_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();