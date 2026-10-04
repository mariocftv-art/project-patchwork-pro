CREATE TABLE IF NOT EXISTS public.quote_drafts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  doc_type text NOT NULL DEFAULT 'orcamento',
  customer_name text,
  record_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_drafts TO authenticated;
GRANT ALL ON public.quote_drafts TO service_role;
ALTER TABLE public.quote_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own drafts" ON public.quote_drafts FOR ALL TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(),'admin'));