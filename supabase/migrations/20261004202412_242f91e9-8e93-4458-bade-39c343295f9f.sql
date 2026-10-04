ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS technician_id uuid,
  ADD COLUMN IF NOT EXISTS confirm_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_way_sent_at timestamptz;
ALTER TABLE public.appointment_settings ADD COLUMN IF NOT EXISTS show_header_shortcut boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.technicians (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage technicians" ON public.technicians FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Technician reads self" ON public.technicians FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Technicians read own appointments" ON public.appointments FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'tecnico') AND technician_id = auth.uid());
CREATE POLICY "Technicians read appointment settings" ON public.appointment_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'tecnico'));

-- Técnico só muda status e marca envio de mensagem, nos agendamentos dele
CREATE OR REPLACE FUNCTION public.tech_update_appointment(_id uuid, _status text, _mark text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM appointments WHERE id=_id AND technician_id=auth.uid() AND has_role(auth.uid(),'tecnico'))) THEN
    RETURN false;
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('agendado','confirmado','acaminho','andamento','concluido','faltou') THEN RETURN false; END IF;
  UPDATE appointments SET
    status = COALESCE(_status, status),
    confirm_sent_at = CASE WHEN _mark='confirm' THEN now() ELSE confirm_sent_at END,
    on_way_sent_at = CASE WHEN _mark='onway' THEN now() ELSE on_way_sent_at END,
    confirm_pending_at = CASE WHEN _mark='confirm' THEN NULL ELSE confirm_pending_at END,
    updated_at = now()
  WHERE id=_id;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.tech_update_appointment(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tech_update_appointment(uuid,text,text) TO authenticated;

-- Atalho do cabeçalho: papel + contagem de hoje (fuso SP); nulo para quem não é da equipe
CREATE OR REPLACE FUNCTION public.staff_shortcut()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r text; n int; show boolean; d0 timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF has_role(auth.uid(),'admin') THEN r := 'admin';
  ELSIF has_role(auth.uid(),'tecnico') THEN r := 'tecnico';
  ELSE RETURN NULL; END IF;
  SELECT COALESCE(show_header_shortcut,true) INTO show FROM appointment_settings WHERE id=1;
  d0 := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo';
  SELECT count(*) INTO n FROM appointments
   WHERE starts_at >= d0 AND starts_at < d0 + interval '1 day'
     AND status NOT IN ('concluido','cancelado','faltou')
     AND (r='admin' OR technician_id=auth.uid());
  RETURN json_build_object('role', r, 'today', n, 'show', COALESCE(show,true));
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_shortcut() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_shortcut() TO authenticated;