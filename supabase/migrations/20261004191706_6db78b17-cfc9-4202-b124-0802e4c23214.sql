ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_menu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS icon text;

UPDATE public.categories SET name='Interfones', icon='phone', display_order=5 WHERE slug='interfones';
UPDATE public.categories SET name='Cabos e Acessórios', icon='cable', display_order=8, show_in_menu=true WHERE slug='cabos';
UPDATE public.categories SET icon='camera', display_order=1, show_in_menu=true WHERE slug='câmeras';
UPDATE public.categories SET icon='hard-drive', display_order=2, show_in_menu=true WHERE slug='dvr';
UPDATE public.categories SET icon='zap', display_order=3, show_in_menu=true WHERE slug='cercas';
UPDATE public.categories SET icon='bell', display_order=4, show_in_menu=true WHERE slug='alarmes';
UPDATE public.categories SET icon='settings', display_order=7 WHERE slug='automação';
UPDATE public.categories SET icon='wrench', display_order=9, show_in_menu=true WHERE slug='instalacoes';
UPDATE public.categories SET is_active=false, display_order=20 WHERE slug IN ('proteção','ofertas');

INSERT INTO public.categories (name, slug, display_order, icon, show_in_menu)
VALUES ('Porteiros','porteiros',6,'door-open',false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (name, slug, display_order, parent_slug) VALUES
 ('Cabos','cabos-cabos',1,'cabos'),
 ('Conectores','cabos-conectores',2,'cabos'),
 ('Caixas e Proteção','cabos-caixas',3,'cabos'),
 ('Fontes','cabos-fontes',4,'cabos'),
 ('Racks e Gabinetes','cabos-racks',5,'cabos')
ON CONFLICT (slug) DO NOTHING;

-- Mover produtos (nada é apagado)
UPDATE public.products SET subcategory='cabos-cabos' WHERE category='cabos' AND title ILIKE 'Cabo %';
UPDATE public.products SET subcategory='cabos-conectores' WHERE category='cabos' AND title ILIKE '%Conector%';
UPDATE public.products SET category='cabos', subcategory='cabos-caixas' WHERE category='dvr' AND title ILIKE '%Caixinha de Proteção%';
UPDATE public.products SET category='cabos', subcategory='cabos-fontes' WHERE category='dvr' AND title ILIKE 'Fonte %';
UPDATE public.products SET category='cabos', subcategory='cabos-racks' WHERE category='dvr' AND (title ILIKE 'Rack %' OR title ILIKE 'Caixa Metálica%');
UPDATE public.products SET category='porteiros' WHERE category='interfones' AND (
  title ILIKE 'AGL Porteiro%' OR title ILIKE 'Kit Porteiro Coletivo%' OR title ILIKE 'Porteiro Eletrônico Interfone Intelbras IPR 8010%');