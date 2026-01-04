-- Drop all INSERT policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create INSERT policy that explicitly includes anon and authenticated roles
CREATE POLICY "Anyone can create orders"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also grant table permissions explicitly
GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.orders TO authenticated;