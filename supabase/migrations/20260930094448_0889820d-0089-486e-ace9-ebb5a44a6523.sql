CREATE TABLE public.quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  change_type text NOT NULL DEFAULT 'edicao',
  change_note text,
  status text,
  snapshot jsonb NOT NULL,
  total numeric,
  pdf_url text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, version)
);
GRANT SELECT, INSERT ON public.quote_versions TO authenticated;
GRANT ALL ON public.quote_versions TO service_role;
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view versions" ON public.quote_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins add versions" ON public.quote_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX quote_versions_quote_idx ON public.quote_versions(quote_id, version DESC);