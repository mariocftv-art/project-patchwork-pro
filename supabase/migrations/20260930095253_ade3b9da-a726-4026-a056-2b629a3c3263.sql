CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  party text NOT NULL CHECK (party IN ('contratante','contratada')),
  signer_name text NOT NULL,
  signer_document text,
  signature_image text NOT NULL,
  doc_hash text NOT NULL,
  user_agent text,
  consent_text text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_email text,
  UNIQUE (quote_id, version, party)
);
GRANT SELECT, INSERT ON public.contract_signatures TO authenticated;
GRANT ALL ON public.contract_signatures TO service_role;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view signatures" ON public.contract_signatures FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins add signatures" ON public.contract_signatures FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins read signed contracts" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'signed-contracts' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins upload signed contracts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signed-contracts' AND public.has_role(auth.uid(),'admin'));