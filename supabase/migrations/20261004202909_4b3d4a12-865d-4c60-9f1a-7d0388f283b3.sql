ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK (status = ANY (ARRAY['agendado','confirmado','acaminho','andamento','concluido','cancelado','faltou']));
ALTER TABLE public.appointments DROP CONSTRAINT appointments_kind_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_kind_check CHECK (kind = ANY (ARRAY['visita','instalacao','manutencao','garantia','retirada','orcamento']));