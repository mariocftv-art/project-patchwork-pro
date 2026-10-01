-- Funções internas: só quem precisa pode executar
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_demotion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_products() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_quote_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;

-- Regras de admin valem só para usuários logados
DROP POLICY IF EXISTS "Admins can view quotes" ON public.quotes;
CREATE POLICY "Admins can view quotes" ON public.quotes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins can delete quotes" ON public.quotes;
CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Anyone can create quotes" ON public.quotes;
CREATE POLICY "Visitors create simple quotes" ON public.quotes FOR INSERT TO anon, authenticated
WITH CHECK (
  length(trim(customer_name)) > 0 AND length(customer_name) <= 200
  AND length(customer_email) <= 255
  AND jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 200
  AND total >= 0 AND subtotal >= 0 AND shipping_fee >= 0
  AND (public.has_role(auth.uid(),'admin') OR (doc_type = 'orcamento' AND status = 'rascunho' AND contract_text IS NULL AND show_signatures = false))
);

DROP POLICY IF EXISTS "System can insert logs" ON public.admin_logs;
CREATE POLICY "Admins insert own logs" ON public.admin_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(),'admin'));

-- Inscrições de notificação: só pela função segura
DROP POLICY IF EXISTS "Anyone can delete their subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update their subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can read subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can create push subscription" ON public.push_subscriptions;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.save_push_subscription(_endpoint text, _p256dh text, _auth text, _order_number text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o text := upper(trim(_order_number));
BEGIN
  IF _endpoint !~ '^https://' OR length(_endpoint) > 1000 OR length(_p256dh) > 200 OR length(_auth) > 100 OR o !~ '^MR[0-9]{8,}$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.push_subscriptions(endpoint,p256dh,auth,order_numbers)
  VALUES (_endpoint,_p256dh,_auth,ARRAY[o])
  ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
    order_numbers = (SELECT array_agg(DISTINCT x) FROM unnest(push_subscriptions.order_numbers || ARRAY[o]) x);
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text,text,text,text) TO anon, authenticated;
DELETE FROM public.push_subscriptions a USING public.push_subscriptions b WHERE a.endpoint = b.endpoint AND a.created_at < b.created_at;
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON public.push_subscriptions(endpoint);

-- Arquivos de orçamento: só PDF, sem listar a pasta
DROP POLICY IF EXISTS "Authenticated users can upload quotes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload quotes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to upload quotes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view quotes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to read quotes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view service photos files" ON storage.objects;
CREATE POLICY "Upload quote PDFs" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'quotes' AND name ~ '^[A-Za-z0-9-]+\.pdf$');
CREATE POLICY "Admins list quote files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('quotes','service-photos') AND public.has_role(auth.uid(),'admin'));