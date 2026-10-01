ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS theme_primary text DEFAULT '#FFD600',
  ADD COLUMN IF NOT EXISTS theme_dark text DEFAULT '#1A1A1A',
  ADD COLUMN IF NOT EXISTS theme_price text DEFAULT '#1D4ED8',
  ADD COLUMN IF NOT EXISTS theme_price_old text DEFAULT '#DC2626';

-- garante que a linha atual mantenha os dados do dono
INSERT INTO public.company_profile (name)
SELECT 'MR Segurança Máxima' WHERE NOT EXISTS (SELECT 1 FROM public.company_profile);

ALTER TABLE public.company_profile
  ALTER COLUMN name SET DEFAULT 'Minha Empresa',
  ALTER COLUMN tagline SET DEFAULT '',
  ALTER COLUMN cnpj SET DEFAULT '',
  ALTER COLUMN phone SET DEFAULT '',
  ALTER COLUMN whatsapp SET DEFAULT '',
  ALTER COLUMN email SET DEFAULT '',
  ALTER COLUMN city SET DEFAULT '',
  ALTER COLUMN state SET DEFAULT '',
  ALTER COLUMN responsible_name SET DEFAULT '',
  ALTER COLUMN instagram SET DEFAULT '',
  ALTER COLUMN footer_slogan SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;