ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS awareness_accepted boolean,
  ADD COLUMN IF NOT EXISTS awareness_text text,
  ADD COLUMN IF NOT EXISTS image_use_authorized boolean;