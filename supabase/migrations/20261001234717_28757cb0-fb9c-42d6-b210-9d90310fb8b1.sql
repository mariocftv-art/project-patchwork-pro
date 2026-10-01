ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promo_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_price numeric,
  ADD COLUMN IF NOT EXISTS promo_until timestamptz,
  ADD COLUMN IF NOT EXISTS includes_installation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS related_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bundle_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS box_items text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ideal_for text;