DROP POLICY IF EXISTS "admins manage product files" ON storage.objects;
CREATE POLICY "admins manage product files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-files' AND public.has_role(auth.uid(), 'admin'));