CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  customer_doc jsonb NOT NULL DEFAULT '{}'::jsonb,
  address text,
  reference_point text,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  kind text NOT NULL DEFAULT 'visita' CHECK (kind IN ('visita','instalacao','manutencao','garantia','retirada')),
  technician text,
  expected_value numeric(12,2),
  notes text,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','andamento','concluido','cancelado','faltou')),
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX appointments_starts_at_idx ON public.appointments (starts_at);