
-- 1) Table
CREATE TABLE public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_res_product ON public.inventory_reservations(product_id);
CREATE INDEX idx_inv_res_variant ON public.inventory_reservations(variant_id);
CREATE INDEX idx_inv_res_order ON public.inventory_reservations(order_id);
CREATE INDEX idx_inv_res_expires ON public.inventory_reservations(expires_at);

GRANT SELECT ON public.inventory_reservations TO authenticated;
GRANT ALL ON public.inventory_reservations TO service_role;

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own order reservations" ON public.inventory_reservations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = inventory_reservations.order_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admins full access on inventory_reservations" ON public.inventory_reservations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Helper: available stock net of active reservations
CREATE OR REPLACE FUNCTION public.available_stock(_product_id UUID, _variant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base INTEGER;
  reserved INTEGER;
BEGIN
  IF _variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO base FROM public.product_variants WHERE id = _variant_id;
    SELECT COALESCE(SUM(quantity), 0) INTO reserved
      FROM public.inventory_reservations
      WHERE variant_id = _variant_id AND expires_at > now();
  ELSE
    SELECT stock_quantity INTO base FROM public.products WHERE id = _product_id;
    SELECT COALESCE(SUM(quantity), 0) INTO reserved
      FROM public.inventory_reservations
      WHERE product_id = _product_id AND variant_id IS NULL AND expires_at > now();
  END IF;
  RETURN COALESCE(base, 0) - COALESCE(reserved, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.available_stock(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 3) Update cart_validate_stock to account for reservations
CREATE OR REPLACE FUNCTION public.cart_validate_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available INTEGER;
BEGIN
  available := public.available_stock(NEW.product_id, NEW.variant_id);

  IF available IS NULL THEN
    RAISE EXCEPTION 'Product or variant not found';
  END IF;

  IF NEW.quantity > available THEN
    RAISE EXCEPTION 'Quantity (%) exceeds available stock (%)', NEW.quantity, available;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Auto-create reservation when an order_item is inserted
CREATE OR REPLACE FUNCTION public.create_reservation_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available INTEGER;
BEGIN
  available := public.available_stock(NEW.product_id, NEW.variant_id);
  IF available < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product % (requested %, available %)',
      NEW.product_id, NEW.quantity, available;
  END IF;

  INSERT INTO public.inventory_reservations (
    order_id, product_id, variant_id, quantity, expires_at
  ) VALUES (
    NEW.order_id, NEW.product_id, NEW.variant_id, NEW.quantity, now() + interval '30 minutes'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_reserve_stock ON public.order_items;
CREATE TRIGGER order_items_reserve_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.create_reservation_for_order_item();

-- 5) Commit reservations (called on payment success)
CREATE OR REPLACE FUNCTION public.commit_order_reservations(_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.inventory_reservations WHERE order_id = _order_id LOOP
    IF r.variant_id IS NOT NULL THEN
      UPDATE public.product_variants
        SET stock_quantity = GREATEST(stock_quantity - r.quantity, 0)
        WHERE id = r.variant_id;
    ELSE
      UPDATE public.products
        SET stock_quantity = GREATEST(stock_quantity - r.quantity, 0)
        WHERE id = r.product_id;
    END IF;

    INSERT INTO public.inventory_movements (
      product_id, variant_id, quantity_change, movement_type, reference_id, notes
    ) VALUES (
      r.product_id, r.variant_id, -r.quantity, 'sale', _order_id, 'Order payment successful'
    );
  END LOOP;

  DELETE FROM public.inventory_reservations WHERE order_id = _order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.commit_order_reservations(UUID) FROM PUBLIC, anon, authenticated;

-- 6) Release reservations (failed/cancelled)
CREATE OR REPLACE FUNCTION public.release_order_reservations(_order_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.inventory_reservations WHERE order_id = _order_id;
$$;

REVOKE EXECUTE ON FUNCTION public.release_order_reservations(UUID) FROM PUBLIC, anon, authenticated;

-- 7) Expired reservation cleanup (called by pg_cron)
CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed INTEGER;
BEGIN
  WITH del AS (
    DELETE FROM public.inventory_reservations
    WHERE expires_at <= now()
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM del;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;

-- 8) Wire mark_payment_success / mark_payment_failed to reservations
CREATE OR REPLACE FUNCTION public.mark_payment_success(
  _payment_id UUID,
  _provider_transaction_id TEXT DEFAULT NULL,
  _gateway_response JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins or system can mark payment success';
  END IF;

  UPDATE public.payments
  SET status = 'successful',
      provider_transaction_id = COALESCE(_provider_transaction_id, provider_transaction_id),
      gateway_response = COALESCE(_gateway_response, gateway_response),
      updated_at = now()
  WHERE id = _payment_id
  RETURNING order_id INTO _order_id;

  IF _order_id IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', _payment_id;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
      updated_at = now()
  WHERE id = _order_id;

  PERFORM public.commit_order_reservations(_order_id);
  PERFORM public.record_payment_event(_payment_id, 'payment_success', _gateway_response);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_payment_failed(
  _payment_id UUID,
  _gateway_response JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins or system can mark payment failed';
  END IF;

  UPDATE public.payments
  SET status = 'failed',
      gateway_response = COALESCE(_gateway_response, gateway_response),
      updated_at = now()
  WHERE id = _payment_id
  RETURNING order_id INTO _order_id;

  IF _order_id IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', _payment_id;
  END IF;

  UPDATE public.orders
  SET payment_status = 'failed',
      updated_at = now()
  WHERE id = _order_id;

  PERFORM public.release_order_reservations(_order_id);
  PERFORM public.record_payment_event(_payment_id, 'payment_failed', _gateway_response);
END;
$$;

-- 9) Schedule cleanup every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-expired-reservations') THEN
    PERFORM cron.unschedule('release-expired-reservations');
  END IF;
END $$;

SELECT cron.schedule(
  'release-expired-reservations',
  '* * * * *',
  $cron$ SELECT public.release_expired_reservations(); $cron$
);
