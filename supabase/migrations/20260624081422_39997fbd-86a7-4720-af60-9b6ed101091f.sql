
-- vendor-logos policies
CREATE POLICY "Public can read vendor logos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vendor-logos');

CREATE POLICY "Vendors can upload their own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Vendors can update their own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vendor-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Vendors can delete their own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vendor-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can manage vendor logos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'vendor-logos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'vendor-logos' AND public.has_role(auth.uid(), 'admin'));

-- vendor-banners policies
CREATE POLICY "Public can read vendor banners"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vendor-banners');

CREATE POLICY "Vendors can upload their own banner"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Vendors can update their own banner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vendor-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Vendors can delete their own banner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vendor-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can manage vendor banners"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'vendor-banners' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'vendor-banners' AND public.has_role(auth.uid(), 'admin'));
