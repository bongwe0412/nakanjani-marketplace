
-- Cart Items
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per user/product/variant. NULL variant_id requires a separate unique index since NULLs are distinct.
CREATE UNIQUE INDEX cart_items_user_product_variant_uidx
  ON public.cart_items (user_id, product_id, variant_id)
  WHERE variant_id IS NOT NULL;
CREATE UNIQUE INDEX cart_items_user_product_novariant_uidx
  ON public.cart_items (user_id, product_id)
  WHERE variant_id IS NULL;

CREATE INDEX cart_items_user_idx ON public.cart_items (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own cart"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all carts"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quantity stock-check trigger: validate against variant stock when variant_id is set,
-- otherwise against the base product's stock_quantity.
CREATE OR REPLACE FUNCTION public.cart_validate_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available INTEGER;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO available FROM public.product_variants WHERE id = NEW.variant_id;
  ELSE
    SELECT stock_quantity INTO available FROM public.products WHERE id = NEW.product_id;
  END IF;

  IF available IS NULL THEN
    RAISE EXCEPTION 'Product or variant not found';
  END IF;

  IF NEW.quantity > available THEN
    RAISE EXCEPTION 'Quantity (%) exceeds available stock (%)', NEW.quantity, available;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cart_items_validate_stock
  BEFORE INSERT OR UPDATE OF quantity, variant_id, product_id ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.cart_validate_stock();
