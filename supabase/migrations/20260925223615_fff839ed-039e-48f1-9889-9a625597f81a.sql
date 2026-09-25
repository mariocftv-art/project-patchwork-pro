ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS instagram text DEFAULT '@linkmrstore';
UPDATE public.company_profile SET instagram='@linkmrstore' WHERE instagram IS NULL OR instagram='';