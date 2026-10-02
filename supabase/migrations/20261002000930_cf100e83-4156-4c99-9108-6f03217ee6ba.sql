-- Pedido 5: serviços como vitrine
ALTER TABLE public.installation_services
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS excluded text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_type text NOT NULL DEFAULT 'consulta',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'servico',
  ADD COLUMN IF NOT EXISTS min_qty integer,
  ADD COLUMN IF NOT EXISTS promo_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_price numeric,
  ADD COLUMN IF NOT EXISTS promo_until timestamptz,
  ADD COLUMN IF NOT EXISTS related_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_illustrative boolean NOT NULL DEFAULT false;
GRANT SELECT ON public.installation_services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.installation_services TO authenticated;
GRANT ALL ON public.installation_services TO service_role;

UPDATE public.installation_services SET summary = description WHERE summary IS NULL;
UPDATE public.installation_services SET price_type = 'a_partir' WHERE price IS NOT NULL AND price > 0;

-- Junta os serviços de câmera no "Instalação de Câmeras"
UPDATE public.installation_services t SET
  title = 'Instalação de Câmeras', price = 130, price_type = 'fixo', unit = 'camera', active = true,
  summary = 'Serviço Técnico Especializado de instalação de câmeras de segurança, cobrado por câmera instalada. Configuração do acesso pelo celular incluída.',
  features = (SELECT array_agg(DISTINCT f) FROM installation_services s, unnest(coalesce(s.features,'{}')) f
              WHERE s.id IN ('63020a53-6ea9-4809-8875-36afcd0fc670','ba7e704c-f199-4454-b140-d43881fb1ee7','9280650c-7c4f-4ad0-9cc5-38eda196202e'))
WHERE t.id = '63020a53-6ea9-4809-8875-36afcd0fc670';
UPDATE public.installation_services SET active = false
WHERE id IN ('ba7e704c-f199-4454-b140-d43881fb1ee7','9280650c-7c4f-4ad0-9cc5-38eda196202e');
UPDATE public.installation_services SET display_order = 0 WHERE id = '63020a53-6ea9-4809-8875-36afcd0fc670';

-- Serviço sai da vitrine de produtos (fica inativo, não apagado)
UPDATE public.products SET status = 'inactive' WHERE category = 'instalacoes';

-- Pedido 6: links de contrato
CREATE TABLE public.contract_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('sign','download')),
  version integer,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_email text,
  opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  signed_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT, UPDATE ON public.contract_links TO authenticated;
GRANT ALL ON public.contract_links TO service_role;
ALTER TABLE public.contract_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view links" ON public.contract_links FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins revoke links" ON public.contract_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS signer_ip text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS remote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_id uuid;
GRANT ALL ON public.contract_signatures TO service_role;