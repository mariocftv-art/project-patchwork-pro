-- Completely disable RLS for orders table and use application-level security instead
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Grant all necessary permissions
GRANT ALL ON public.orders TO anon;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;