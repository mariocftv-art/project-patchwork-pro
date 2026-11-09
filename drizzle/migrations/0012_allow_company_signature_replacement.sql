ALTER TABLE public.contract_signatures DROP CONSTRAINT contract_signatures_quote_id_version_party_key;
CREATE UNIQUE INDEX contract_signatures_one_client_per_version ON public.contract_signatures (quote_id, version) WHERE party = 'contratante';
CREATE INDEX contract_signatures_lookup ON public.contract_signatures (quote_id, version, party, signed_at DESC);
INSERT INTO public.company_signatures (name, storage_path, is_default, includes_brand)
SELECT 'Assinatura do Rogério', 'assinatura.png', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.company_signatures);