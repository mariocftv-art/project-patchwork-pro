ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS whatsapp_support_template text,
  ADD COLUMN IF NOT EXISTS whatsapp_sales_template text;

CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('suporte','orcamento','produto','busca')),
  page text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.whatsapp_contacts TO anon, authenticated;
GRANT SELECT ON public.whatsapp_contacts TO authenticated;
GRANT ALL ON public.whatsapp_contacts TO service_role;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs own contact" ON public.whatsapp_contacts FOR INSERT TO anon, authenticated
  WITH CHECK ((user_id IS NULL AND auth.uid() IS NULL) OR user_id = auth.uid());
CREATE POLICY "Admins read contacts" ON public.whatsapp_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.my_support_info()
RETURNS TABLE(customer_name text, customer_address text, contract_number text, contract_date timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.customer_name, q.customer_address, q.quote_number, q.created_at
  FROM public.quotes q
  WHERE auth.uid() IS NOT NULL
    AND lower(q.customer_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND q.doc_type = 'contrato'
  ORDER BY q.created_at DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.my_support_info() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_support_info() TO authenticated;