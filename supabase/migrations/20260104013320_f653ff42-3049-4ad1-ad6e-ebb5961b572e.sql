-- Disable RLS completely for the orders table
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Ensure NO FORCE
ALTER TABLE public.orders NO FORCE ROW LEVEL SECURITY;

-- Drop ALL policies and recreate them properly
DROP POLICY IF EXISTS "Allow anyone to insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Create a PERMISSIVE INSERT policy (default is RESTRICTIVE which was causing issues)
CREATE POLICY "Anyone can create orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);

-- Admin view policy
CREATE POLICY "Admins can view orders"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin update policy
CREATE POLICY "Admins can update orders"
ON public.orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));