CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'sandbox' CHECK (mode IN ('sandbox','live')),
  public_key text,
  methods text[] NOT NULL DEFAULT ARRAY['credit_card','pix'],
  token_last4 text,
  account_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads payment settings" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins insert payment settings" ON public.payment_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update payment settings" ON public.payment_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.payment_settings (enabled) VALUES (false);

CREATE TABLE public.payment_secrets (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.payment_secrets FROM anon, authenticated;
GRANT ALL ON public.payment_secrets TO service_role;
ALTER TABLE public.payment_secrets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_id text;