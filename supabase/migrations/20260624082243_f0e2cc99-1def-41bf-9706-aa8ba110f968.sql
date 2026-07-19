
-- Status enum
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'out_of_stock', 'archived');

-- Helper: is the caller the vendor owning this vendor_id?
CREATE OR REPLACE FUNCTION public.owns_vendor(_vendor_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = _vendor_id AND v.user_id = auth.uid()
  )
$$;
REVOKE EXECUTE ON FUNCTION public.owns_vendor(UUID) FROM PUBLIC, anon, authenticated;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  sku TEXT,
  brand TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(10,3),
  dimensions JSONB,
  status public.product_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX products_vendor_idx ON public.products (vendor_id);
CREATE INDEX products_category_idx ON public.products (category_id);
CREATE INDEX products_subcategory_idx ON public.products (subcategory_id);
CREATE INDEX products_status_idx ON public.products (status);
CREATE INDEX products_featured_idx ON public.products (featured) WHERE featured = true;

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public: active products from approved vendors
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = products.vendor_id AND v.verification_status = 'approved'
    )
  );

-- Vendor: full access to their own products
CREATE POLICY "Vendors can view their own products"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.owns_vendor(vendor_id));

CREATE POLICY "Vendors can insert products for their store"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.owns_vendor(vendor_id));

CREATE POLICY "Vendors can update their own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.owns_vendor(vendor_id))
  WITH CHECK (public.owns_vendor(vendor_id));

CREATE POLICY "Vendors can delete their own products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.owns_vendor(vendor_id));

-- Admin: full access
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert any product"
  ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any product"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any product"
  ON public.products FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_idx ON public.product_images (product_id, sort_order);

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public: images of publicly-viewable products
CREATE POLICY "Public can view images of active products"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.vendors v ON v.id = p.vendor_id
      WHERE p.id = product_images.product_id
        AND p.status = 'active'
        AND v.verification_status = 'approved'
    )
  );

CREATE POLICY "Vendors can view images for their products"
  ON public.product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND public.owns_vendor(p.vendor_id)
    )
  );

CREATE POLICY "Vendors can insert images for their products"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND public.owns_vendor(p.vendor_id)
    )
  );

CREATE POLICY "Vendors can update images for their products"
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND public.owns_vendor(p.vendor_id)
    )
  );

CREATE POLICY "Vendors can delete images for their products"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND public.owns_vendor(p.vendor_id)
    )
  );

CREATE POLICY "Admins manage all product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
