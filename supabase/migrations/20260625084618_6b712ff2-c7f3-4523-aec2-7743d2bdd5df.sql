
-- 1. View counts
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS products_view_count_idx ON public.products (view_count DESC);

CREATE OR REPLACE FUNCTION public.increment_product_views(_product_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.products SET view_count = view_count + 1 WHERE id = _product_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_product_views(UUID) TO anon, authenticated;

-- 2. Product reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_product_idx ON public.product_reviews (product_id);
CREATE INDEX IF NOT EXISTS product_reviews_user_idx ON public.product_reviews (user_id);

GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read reviews" ON public.product_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users insert own reviews" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reviews" ON public.product_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reviews" ON public.product_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON public.product_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Vendor rating sync trigger
CREATE OR REPLACE FUNCTION public.refresh_vendor_rating(_vendor_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.vendors v SET rating = COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 2)
    FROM public.product_reviews r
    JOIN public.products p ON p.id = r.product_id
    WHERE p.vendor_id = _vendor_id
  ), 0)
  WHERE v.id = _vendor_id;
$$;

CREATE OR REPLACE FUNCTION public.product_reviews_sync_vendor_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vid UUID;
BEGIN
  SELECT vendor_id INTO _vid FROM public.products WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  IF _vid IS NOT NULL THEN
    PERFORM public.refresh_vendor_rating(_vid);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER product_reviews_vendor_rating
AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.product_reviews_sync_vendor_rating();

-- 4. Vendor followers
CREATE TABLE IF NOT EXISTS public.vendor_followers (
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, user_id)
);
CREATE INDEX IF NOT EXISTS vendor_followers_user_idx ON public.vendor_followers (user_id);

GRANT SELECT ON public.vendor_followers TO anon;
GRANT SELECT, INSERT, DELETE ON public.vendor_followers TO authenticated;
GRANT ALL ON public.vendor_followers TO service_role;

ALTER TABLE public.vendor_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read followers" ON public.vendor_followers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users follow as self" ON public.vendor_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unfollow self" ON public.vendor_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.vendor_followers_sync_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vid UUID;
BEGIN
  _vid := COALESCE(NEW.vendor_id, OLD.vendor_id);
  UPDATE public.vendors
    SET followers_count = (SELECT count(*) FROM public.vendor_followers WHERE vendor_id = _vid)
    WHERE id = _vid;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER vendor_followers_count
AFTER INSERT OR DELETE ON public.vendor_followers
FOR EACH ROW EXECUTE FUNCTION public.vendor_followers_sync_count();
