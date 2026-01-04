-- Remove FORCE RLS to allow table operations
ALTER TABLE public.orders NO FORCE ROW LEVEL SECURITY;

-- Drop and recreate the INSERT policy with proper settings
DROP POLICY IF EXISTS "Allow public to insert orders" ON public.orders;

-- Create INSERT policy that truly allows anyone
CREATE POLICY "Allow anyone to insert orders"
ON public.orders
FOR INSERT
WITH CHECK (true);