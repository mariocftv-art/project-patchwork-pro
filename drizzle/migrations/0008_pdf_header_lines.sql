ALTER TABLE public.company_profile
  ADD COLUMN IF NOT EXISTS pdf_headline text NOT NULL DEFAULT 'SEGURANÇA ELETRÔNICA PROFISSIONAL DESDE 2011',
  ADD COLUMN IF NOT EXISTS pdf_subline text NOT NULL DEFAULT 'CFTV · Alarmes · Cerca Elétrica · Automação · Interfonia';