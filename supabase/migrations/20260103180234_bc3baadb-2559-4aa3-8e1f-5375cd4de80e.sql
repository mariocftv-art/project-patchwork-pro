-- Create storage bucket for service photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true);

-- Create table for service photos
CREATE TABLE public.service_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view service photos
CREATE POLICY "Anyone can view service photos"
ON public.service_photos
FOR SELECT
USING (true);

-- Only admins can manage service photos
CREATE POLICY "Admins can insert service photos"
ON public.service_photos
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update service photos"
ON public.service_photos
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete service photos"
ON public.service_photos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for service photos bucket
CREATE POLICY "Anyone can view service photos files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'service-photos');

CREATE POLICY "Admins can upload service photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'service-photos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete service photos files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'service-photos' AND has_role(auth.uid(), 'admin'::app_role));