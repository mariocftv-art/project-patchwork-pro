-- O preço de custo só fica invisível se a permissão for por coluna
REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT ON public.products FROM authenticated;

GRANT SELECT (id, title, description, price, original_price, category, subcategory,
  brand, model, sku, image_url, gallery_urls, stock, featured, on_sale, status,
  created_at, updated_at) ON public.products TO anon;

GRANT SELECT (id, title, description, price, original_price, category, subcategory,
  brand, model, sku, image_url, gallery_urls, stock, featured, on_sale, status,
  created_at, updated_at) ON public.products TO authenticated;

GRANT SELECT ON public.products TO service_role;