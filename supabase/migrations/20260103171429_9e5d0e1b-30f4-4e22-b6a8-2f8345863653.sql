
-- =============================================
-- FIX 1: Protect orders table - customer PII
-- =============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create secure policies for orders
-- Only admins can view orders (contains PII)
CREATE POLICY "Only admins can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update orders
CREATE POLICY "Only admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can create their own orders
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Anonymous users can also create orders (guest checkout)
CREATE POLICY "Anonymous users can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- =============================================
-- FIX 2: Protect user_roles table
-- =============================================

-- Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recreate secure policies for user_roles
-- Users can only view their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles (uses security definer function)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert new roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Revoke public access to ensure no leaks
-- =============================================
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

-- Grant only necessary permissions
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
