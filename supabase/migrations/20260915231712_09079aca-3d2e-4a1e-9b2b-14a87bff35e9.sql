-- Proteger o preço de custo: ninguém do público (nem clientes logados) pode lê-lo
REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (cost_price) ON public.products FROM authenticated;
GRANT SELECT (cost_price) ON public.products TO service_role;

-- Leitura administrativa dos produtos (inclui custo) apenas para admins
CREATE OR REPLACE FUNCTION public.admin_list_products()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO result
  FROM public.products p;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO service_role;