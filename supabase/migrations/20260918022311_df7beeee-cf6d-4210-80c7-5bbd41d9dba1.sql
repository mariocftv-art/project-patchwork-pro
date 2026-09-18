CREATE TABLE IF NOT EXISTS public.company_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'MR Segurança Máxima',
  tagline text DEFAULT 'Sistemas de Segurança Eletrônica',
  cnpj text DEFAULT '45.858.215/0001-86',
  phone text DEFAULT '(11) 96257-9428',
  whatsapp text DEFAULT '5511962579428',
  email text DEFAULT 'contato@mrseguranca.com',
  address text DEFAULT '',
  city text DEFAULT 'São Paulo',
  state text DEFAULT 'SP',
  website text DEFAULT '',
  logo_url text,
  primary_color text DEFAULT '#1E3A8A',
  secondary_color text DEFAULT '#0F172A',
  accent_color text DEFAULT '#2563EB',
  pdf_footer_text text DEFAULT '',
  pdf_notes_text text DEFAULT '',
  quote_validity_days integer NOT NULL DEFAULT 15,
  whatsapp_customer_template text DEFAULT '',
  whatsapp_admin_template text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.company_profile TO anon;
GRANT SELECT, INSERT, UPDATE ON public.company_profile TO authenticated;
GRANT ALL ON public.company_profile TO service_role;

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_profile_public_read" ON public.company_profile;
CREATE POLICY "company_profile_public_read" ON public.company_profile
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "company_profile_admin_insert" ON public.company_profile;
CREATE POLICY "company_profile_admin_insert" ON public.company_profile
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "company_profile_admin_update" ON public.company_profile;
CREATE POLICY "company_profile_admin_update" ON public.company_profile
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER company_profile_updated_at
  BEFORE UPDATE ON public.company_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.company_profile (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.company_profile);