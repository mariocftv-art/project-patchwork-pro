-- Add price column to installation_services
ALTER TABLE public.installation_services 
ADD COLUMN price numeric DEFAULT NULL;