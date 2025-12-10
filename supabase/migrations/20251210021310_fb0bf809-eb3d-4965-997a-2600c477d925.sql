-- Add user profiles table for customization effects
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  equipped_flair text,
  equipped_badge text,
  equipped_background text,
  equipped_effect text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.raw_user_meta_data ->> 'username');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bond listings for tradable bonds
CREATE TABLE public.bond_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bond_id uuid NOT NULL REFERENCES public.bonds(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  asking_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bond_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings" ON public.bond_listings FOR SELECT USING (status = 'active');
CREATE POLICY "Sellers can create listings" ON public.bond_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own listings" ON public.bond_listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can delete own listings" ON public.bond_listings FOR DELETE USING (auth.uid() = seller_id);

-- Bond transactions history
CREATE TABLE public.bond_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bond_id uuid NOT NULL REFERENCES public.bonds(id),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  price numeric NOT NULL,
  transaction_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bond_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.bond_transactions 
FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);