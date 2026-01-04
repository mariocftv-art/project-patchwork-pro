-- Create storage bucket for quotes PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotes', 'quotes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read quotes (public bucket)
CREATE POLICY "Anyone can view quotes"
ON storage.objects
FOR SELECT
USING (bucket_id = 'quotes');

-- Allow authenticated users to upload quotes
CREATE POLICY "Authenticated users can upload quotes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'quotes');

-- Allow anyone to upload quotes (for anonymous users generating quotes)
CREATE POLICY "Anyone can upload quotes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'quotes');