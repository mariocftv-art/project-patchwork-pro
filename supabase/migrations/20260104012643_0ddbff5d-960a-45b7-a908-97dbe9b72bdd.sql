-- Reset all permissions on orders table
GRANT ALL ON public.orders TO postgres;
GRANT ALL ON public.orders TO service_role;

-- Grant specific permissions to anon and authenticated
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Make sure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Force RLS to apply to table owner as well
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;
DROP POLICY IF EXISTS "Only admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Only admins can update orders" ON public.orders;

-- Create new policies
CREATE POLICY "Allow public to insert orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));