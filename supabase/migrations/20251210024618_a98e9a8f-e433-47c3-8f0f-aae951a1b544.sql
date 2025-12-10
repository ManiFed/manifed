-- Allow anyone to view bonds that are listed for sale in the bond marketplace
CREATE POLICY "Anyone can view listed bonds"
ON public.bonds
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bond_listings 
    WHERE bond_listings.bond_id = bonds.id 
    AND bond_listings.status = 'active'
  )
);