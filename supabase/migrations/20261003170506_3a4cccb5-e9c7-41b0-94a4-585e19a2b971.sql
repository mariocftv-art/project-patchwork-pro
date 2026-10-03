CREATE POLICY "Admins upload quote files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quotes' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update quote files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'quotes' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'quotes' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete quote files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'quotes' AND public.has_role(auth.uid(),'admin'));