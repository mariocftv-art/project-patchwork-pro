ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS cost_price numeric,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON public.products (sku) WHERE sku IS NOT NULL AND sku <> '';
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);
CREATE INDEX IF NOT EXISTS products_subcategory_idx ON public.products (subcategory);
CREATE INDEX IF NOT EXISTS products_brand_idx ON public.products (brand);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_featured_idx ON public.products (featured);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_slug text;

CREATE INDEX IF NOT EXISTS categories_parent_slug_idx ON public.categories (parent_slug);