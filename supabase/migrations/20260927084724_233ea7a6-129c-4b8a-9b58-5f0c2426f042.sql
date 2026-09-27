ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS orders_public_insert ON public.orders;
CREATE POLICY orders_public_insert ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(customer_name)) > 0 AND length(trim(customer_email)) > 3
  AND jsonb_typeof(items) = 'array' AND jsonb_array_length(items) > 0
  AND total > 0 AND subtotal >= 0 AND shipping_fee >= 0
  AND coalesce(status,'pending') = 'pending'
  AND order_number ~ '^MR[0-9]{8,}$'
);
CREATE POLICY orders_admin_select ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY orders_admin_delete ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.get_order_by_number(_order_number text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', id, 'order_number', order_number, 'customer_name', split_part(customer_name,' ',1),
    'items', items, 'subtotal', subtotal, 'shipping_fee', shipping_fee, 'total', total,
    'payment_method', payment_method, 'status', status, 'created_at', created_at,
    'shipping_address', CASE WHEN shipping_address IS NULL THEN NULL ELSE jsonb_build_object(
      'neighborhood', shipping_address->>'neighborhood', 'city', shipping_address->>'city', 'state', shipping_address->>'state') END)
  FROM public.orders WHERE order_number = upper(trim(_order_number)) LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_order_statuses(_order_numbers text[])
RETURNS TABLE(order_number text, status text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.order_number, o.status FROM public.orders o
  WHERE o.order_number = ANY(_order_numbers[1:20])
$$;
GRANT EXECUTE ON FUNCTION public.get_order_by_number(text), public.get_order_statuses(text[]) TO anon, authenticated;