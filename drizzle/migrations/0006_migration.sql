-- Logo em WebP (a PNG original continua guardada em logos/)
UPDATE public.company_profile SET logo_url = replace(logo_url, '/service-photos/logos/logo-mr-original.png', '/service-photos/opt/logo-mr-original-1600.webp')
WHERE logo_url LIKE '%/service-photos/logos/logo-mr-original.png';