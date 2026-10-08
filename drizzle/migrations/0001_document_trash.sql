ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid, ADD COLUMN IF NOT EXISTS delete_reason text;

CREATE TABLE public.document_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL,
  quote_number text,
  doc_type text,
  customer_name text,
  action text NOT NULL DEFAULT 'excluir',
  reason text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.document_deletions TO authenticated;
GRANT ALL ON public.document_deletions TO service_role;
ALTER TABLE public.document_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read deletions" ON public.document_deletions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert deletions" ON public.document_deletions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());