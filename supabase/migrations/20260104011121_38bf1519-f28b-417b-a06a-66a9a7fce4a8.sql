-- Create policies for quotes bucket to allow public uploads and reads
CREATE POLICY "Allow public to upload quotes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'quotes');

CREATE POLICY "Allow public to read quotes"
ON storage.objects
FOR SELECT
USING (bucket_id = 'quotes');