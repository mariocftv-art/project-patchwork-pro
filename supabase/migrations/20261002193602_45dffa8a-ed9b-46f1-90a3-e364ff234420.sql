CREATE POLICY "Admins manage company signature" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'company-signature' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'company-signature' AND public.has_role(auth.uid(), 'admin'));