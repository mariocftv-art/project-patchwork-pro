CREATE TABLE public.service_defaults (
  name text PRIMARY KEY,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_defaults TO authenticated;
GRANT ALL ON public.service_defaults TO service_role;
ALTER TABLE public.service_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage service defaults" ON public.service_defaults FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_service_defaults_updated_at BEFORE UPDATE ON public.service_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();