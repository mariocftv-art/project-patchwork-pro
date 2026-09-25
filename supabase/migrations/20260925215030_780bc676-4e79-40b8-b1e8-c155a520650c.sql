ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS doc_type text NOT NULL DEFAULT 'orcamento',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS service_title text,
  ADD COLUMN IF NOT EXISTS customer jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_cpf text,
  ADD COLUMN IF NOT EXISTS customer_cnpj text,
  ADD COLUMN IF NOT EXISTS customer_whatsapp text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS labor_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS validity_days integer,
  ADD COLUMN IF NOT EXISTS show_signatures boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE POLICY "Admins can update quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT INSERT ON public.quotes TO anon;

ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS responsible_name text DEFAULT 'Rogério',
  ADD COLUMN IF NOT EXISTS footer_slogan text DEFAULT 'SEGURANÇA DE VERDADE. TRANQUILIDADE SEMPRE.',
  ADD COLUMN IF NOT EXISTS default_warranty text DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_warranty_text text DEFAULT 'Todos os equipamentos instalados e configurados possuem garantia conforme as condições estabelecidas neste orçamento.';

UPDATE public.company_profile SET name='MR Segurança Máxima', cnpj='45.858.215/0001-86', phone='(11) 96257-9428', whatsapp='5511962579428', responsible_name=COALESCE(NULLIF(responsible_name,''),'Rogério');

CREATE OR REPLACE FUNCTION public.next_quote_number() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y text := to_char(now(),'YYYY'); n int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number, '^MR-'||y||'-',''),quote_number)::int),0)+1 INTO n
  FROM public.quotes WHERE quote_number ~ ('^MR-'||y||'-[0-9]+$');
  RETURN 'MR-'||y||'-'||lpad(n::text,4,'0');
END $$;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO anon, authenticated;