-- Add original_price column to installation_services
ALTER TABLE public.installation_services 
ADD COLUMN original_price numeric DEFAULT NULL;