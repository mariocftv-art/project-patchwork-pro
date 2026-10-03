CREATE TABLE public.appointment_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_hour integer NOT NULL DEFAULT 7 CHECK (reminder_hour BETWEEN 0 AND 23),
  on_the_way_template text NOT NULL DEFAULT 'Olá, {CLIENTE}! Aqui é da {EMPRESA}. O técnico está saindo agora para o seu endereço ({ENDERECO}). Previsão de chegada: {CHEGADA}. Até já!',
  last_sent_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.appointment_settings TO authenticated;
GRANT ALL ON public.appointment_settings TO service_role;
ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage appointment settings" ON public.appointment_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.appointment_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.admin_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_push_subscriptions TO authenticated;
GRANT ALL ON public.admin_push_subscriptions TO service_role;
ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage own push subscriptions" ON public.admin_push_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') AND user_id = auth.uid());

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;