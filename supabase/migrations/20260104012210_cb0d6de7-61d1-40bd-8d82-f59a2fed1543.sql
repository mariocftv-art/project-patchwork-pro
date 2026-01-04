-- Grant INSERT permission on orders table to anon and authenticated roles
GRANT INSERT ON public.orders TO anon;
GRANT INSERT ON public.orders TO authenticated;