CREATE TABLE public.company_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Assinatura',
  storage_path text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  includes_brand boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_signatures TO authenticated;
GRANT ALL ON public.company_signatures TO service_role;
ALTER TABLE public.company_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage company signatures" ON public.company_signatures FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS responsible_role text;
ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS method text NOT NULL DEFAULT 'desenhada',
  ADD COLUMN IF NOT EXISTS saved_signature_name text,
  ADD COLUMN IF NOT EXISTS includes_brand boolean NOT NULL DEFAULT false;