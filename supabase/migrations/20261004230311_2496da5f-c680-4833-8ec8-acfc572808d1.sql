CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  photo_url text,
  phone text,
  on_the_way_template text,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_hour integer NOT NULL DEFAULT 7,
  reminder_last_sent date,
  show_header_shortcut boolean NOT NULL DEFAULT true,
  theme text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read own profile" ON public.staff_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Staff insert own profile" ON public.staff_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico')));
CREATE POLICY "Staff update own profile" ON public.staff_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.technicians ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Técnicos também podem guardar aparelhos para avisos (só os próprios)
DROP POLICY IF EXISTS "Admins manage own push subscriptions" ON public.admin_push_subscriptions;
CREATE POLICY "Staff manage own push subscriptions" ON public.admin_push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico')))
  WITH CHECK (user_id = auth.uid() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico')));

CREATE OR REPLACE FUNCTION public.staff_shortcut()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r text; n int; show boolean; d0 timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF has_role(auth.uid(),'admin') THEN r := 'admin';
  ELSIF has_role(auth.uid(),'tecnico') THEN r := 'tecnico';
  ELSE RETURN NULL; END IF;
  SELECT show_header_shortcut INTO show FROM staff_profiles WHERE user_id = auth.uid();
  d0 := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  SELECT count(*) INTO n FROM appointments
   WHERE starts_at >= d0 AND starts_at < d0 + interval '1 day'
     AND status NOT IN ('concluido','cancelado','faltou')
     AND (r='admin' OR technician_id=auth.uid());
  RETURN json_build_object('role', r, 'today', n, 'show', COALESCE(show,true));
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_shortcut() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_shortcut() TO authenticated;