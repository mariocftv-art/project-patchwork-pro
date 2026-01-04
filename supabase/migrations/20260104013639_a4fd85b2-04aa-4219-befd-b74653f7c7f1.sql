-- Re-enable RLS for orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Create INSERT policy - allow anyone to create orders (public checkout)
CREATE POLICY "Anyone can create orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create SELECT policy - only admins can view orders
CREATE POLICY "Admins can view orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create UPDATE policy - only admins can update orders
CREATE POLICY "Admins can update orders"
ON public.orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));