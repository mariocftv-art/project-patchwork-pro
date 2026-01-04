-- First, let's revoke and re-grant all necessary permissions
REVOKE ALL ON public.orders FROM anon, authenticated;

-- Grant SELECT to admins only (via RLS)
GRANT SELECT ON public.orders TO authenticated;

-- Grant INSERT to both anon and authenticated
GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.orders TO authenticated;

-- Grant UPDATE to admins only (via RLS)  
GRANT UPDATE ON public.orders TO authenticated;

-- Drop all existing INSERT policies on orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;

-- Create a simple INSERT policy that allows anyone (anon or authenticated) to create orders
CREATE POLICY "Public can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);