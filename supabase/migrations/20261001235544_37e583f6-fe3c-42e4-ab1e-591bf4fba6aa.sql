ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_illustrative boolean NOT NULL DEFAULT false;
GRANT SELECT (image_illustrative) ON public.products TO anon, authenticated;
GRANT INSERT (image_illustrative), UPDATE (image_illustrative) ON public.products TO authenticated;