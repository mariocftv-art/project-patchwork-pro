-- Fotos otimizadas (WebP 400/800/1600). Originais continuam no armazenamento.
UPDATE public.products SET image_url = regexp_replace(image_url, '/service-photos/(?:products/)?([^/]+)\.(png|jpe?g)$', '/service-photos/opt/\1-1600.webp')
WHERE image_url ~ '/service-photos/(products/)?(1791548465212-o4unma)\.png$';
UPDATE public.service_photos SET image_url = regexp_replace(image_url, '/service-photos/([^/]+)\.(png|jpe?g)$', '/service-photos/opt/\1-1600.webp')
WHERE image_url ~ '/service-photos/(1791391094083-95q4qt|1790646237689-j78c3|1767464197659-iho0dd|realizado-16-cameras|realizado-monitoramento-24h|realizado-monitor-lg-v2|realizado-cftv-celular-v2|realizado-portao-v2)\.(png|jpe?g)$';
UPDATE public.installation_services SET image_url = regexp_replace(image_url, '/service-photos/([^/]+)\.png$', '/service-photos/opt/\1-1600.webp')
WHERE image_url ~ '/service-photos/1790705789744-y0x0d8\.png$';
-- Índices para busca e filtros
CREATE INDEX IF NOT EXISTS idx_products_status_category ON public.products (status, category, subcategory);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_created ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_list ON public.quotes (doc_type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_appointments_starts ON public.appointments (starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_tech ON public.appointments (technician_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_created ON public.whatsapp_contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_photos_order ON public.service_photos (display_order) WHERE is_active;