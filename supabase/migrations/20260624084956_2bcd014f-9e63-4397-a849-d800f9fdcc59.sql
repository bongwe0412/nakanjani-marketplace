
-- Enums
CREATE TYPE public.order_status AS ENUM ('pending','processing','completed','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','pending','paid','refunded','failed');
CREATE TYPE public.vendor_order_status AS ENUM ('pending','processing','shipped','delivered','cancelled');

-- =========================================================
-- TABLES (create all first, then policies)
-- =========================================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status);

CREATE TABLE public.vendor_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status public.vendor_order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, vendor_id)
);
CREATE INDEX vendor_orders_vendor_idx ON public.vendor_orders (vendor_id, created_at DESC);
CREATE INDEX vendor_orders_order_idx ON public.vendor_orders (order_id);

CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_order_id UUID NOT NULL REFERENCES public.vendor_orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items (order_id);
CREATE INDEX order_items_vendor_order_idx ON public.order_items (vendor_order_id);
CREATE INDEX order_items_vendor_idx ON public.order_items (vendor_id);

CREATE TABLE public.order_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  suburb TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'ZA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_addresses_order_idx ON public.order_addresses (order_id);

-- =========================================================
-- GRANTS
-- =========================================================
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vendor_orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT, INSERT ON public.order_addresses TO authenticated;
GRANT ALL ON public.orders, public.vendor_orders, public.order_items, public.order_addresses TO service_role;

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE POLICY "Customers view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Customers create own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Vendors view orders containing their store"
  ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vendor_orders vo
    WHERE vo.order_id = orders.id AND public.owns_vendor(vo.vendor_id)
  ));
CREATE POLICY "Admins manage all orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Vendor orders
CREATE POLICY "Customers view vendor orders on their orders"
  ON public.vendor_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = vendor_orders.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Vendors view their vendor orders"
  ON public.vendor_orders FOR SELECT TO authenticated
  USING (public.owns_vendor(vendor_id));
CREATE POLICY "Vendors update their vendor orders"
  ON public.vendor_orders FOR UPDATE TO authenticated
  USING (public.owns_vendor(vendor_id))
  WITH CHECK (public.owns_vendor(vendor_id));
CREATE POLICY "Customers create vendor orders on their orders"
  ON public.vendor_orders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = vendor_orders.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage all vendor orders"
  ON public.vendor_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Order items
CREATE POLICY "Customers view items on their orders"
  ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Vendors view items for their store"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.owns_vendor(vendor_id));
CREATE POLICY "Customers create items on their orders"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage all order items"
  ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Order addresses
CREATE POLICY "Customers view their order addresses"
  ON public.order_addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_addresses.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Customers create addresses on their orders"
  ON public.order_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_addresses.order_id AND o.user_id = auth.uid()));
CREATE POLICY "Vendors view shipping addresses for their orders"
  ON public.order_addresses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vendor_orders vo
    WHERE vo.order_id = order_addresses.order_id AND public.owns_vendor(vo.vendor_id)
  ));
CREATE POLICY "Admins manage all order addresses"
  ON public.order_addresses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendor_orders_updated_at
  BEFORE UPDATE ON public.vendor_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate human readable order_number: NK-YYYYMMDD-XXXXXX (global daily sequence).
CREATE SEQUENCE public.order_number_seq;
REVOKE ALL ON SEQUENCE public.order_number_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role;

CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'NK-' || to_char(now(), 'YYYYMMDD') || '-' ||
                        lpad(nextval('public.order_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_order_number() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_assign_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_number();
