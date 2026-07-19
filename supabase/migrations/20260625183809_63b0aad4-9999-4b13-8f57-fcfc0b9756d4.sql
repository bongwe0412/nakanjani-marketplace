-- Allow customers to release reservations on a pending unpaid order they own.
CREATE OR REPLACE FUNCTION public.cancel_pending_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _payment_status text;
  _status text;
BEGIN
  SELECT user_id, payment_status::text, status::text
    INTO _owner, _payment_status, _status
  FROM public.orders WHERE id = _order_id;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Order % not found', _order_id;
  END IF;

  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to cancel this order';
  END IF;

  IF _payment_status = 'paid' THEN
    RAISE EXCEPTION 'Cannot cancel a paid order';
  END IF;

  DELETE FROM public.inventory_reservations WHERE order_id = _order_id;

  UPDATE public.orders
     SET status = 'cancelled', payment_status = 'unpaid', updated_at = now()
   WHERE id = _order_id;

  UPDATE public.vendor_orders
     SET status = 'cancelled', updated_at = now()
   WHERE order_id = _order_id AND status = 'pending';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_pending_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pending_order(uuid) TO authenticated, service_role;

-- Re-grant read-only stock helper to authenticated users so checkout can pre-check.
GRANT EXECUTE ON FUNCTION public.available_stock(uuid, uuid) TO authenticated;