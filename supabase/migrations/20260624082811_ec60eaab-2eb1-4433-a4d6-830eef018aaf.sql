
-- ENUMS
CREATE TYPE public.inventory_movement_type AS ENUM ('stock_in', 'stock_out', 'adjustment');

-- product_variants
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  option_1_name text,
  option_1_value text,
  option_2_name text,
  option_2_value text,
  option_3_name text,
  option_3_value text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  compare_at_price numeric(12,2),
  cost_price numeric(12,2),
  stock_quantity integer NOT NULL DEFAULT 0,
  weight numeric(10,3),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Helper: owns product via vendor
CREATE OR REPLACE FUNCTION public.owns_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON v.id = p.vendor_id
    WHERE p.id = _product_id AND v.user_id = auth.uid()
  )
$$;

-- Policies: public can view active variants of active products from approved vendors
CREATE POLICY "Public view active variants"
ON public.product_variants FOR SELECT
USING (
  active = true AND EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON v.id = p.vendor_id
    WHERE p.id = product_variants.product_id
      AND p.status = 'active'
      AND v.verification_status = 'approved'
  )
);

CREATE POLICY "Vendors view own variants"
ON public.product_variants FOR SELECT
TO authenticated
USING (public.owns_product(product_id));

CREATE POLICY "Vendors insert own variants"
ON public.product_variants FOR INSERT
TO authenticated
WITH CHECK (public.owns_product(product_id));

CREATE POLICY "Vendors update own variants"
ON public.product_variants FOR UPDATE
TO authenticated
USING (public.owns_product(product_id))
WITH CHECK (public.owns_product(product_id));

CREATE POLICY "Vendors delete own variants"
ON public.product_variants FOR DELETE
TO authenticated
USING (public.owns_product(product_id));

CREATE POLICY "Admins manage variants"
ON public.product_variants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- inventory_movements
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  movement_type public.inventory_movement_type NOT NULL,
  quantity integer NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_variant_id ON public.inventory_movements(variant_id);

GRANT SELECT, INSERT ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own movements"
ON public.inventory_movements FOR SELECT
TO authenticated
USING (public.owns_product(product_id));

CREATE POLICY "Vendors insert own movements"
ON public.inventory_movements FOR INSERT
TO authenticated
WITH CHECK (public.owns_product(product_id) AND created_by = auth.uid());

CREATE POLICY "Admins view all movements"
ON public.inventory_movements FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage movements"
ON public.inventory_movements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
