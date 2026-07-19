
CREATE POLICY "Public can read category images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'category-images');

CREATE POLICY "Admins can manage category images"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));
