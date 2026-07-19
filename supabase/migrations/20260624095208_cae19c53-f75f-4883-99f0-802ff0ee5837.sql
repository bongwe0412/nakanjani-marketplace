
CREATE OR REPLACE FUNCTION public.cancel_payment(_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _owner UUID;
  _status public.payment_txn_status;
BEGIN
  SELECT p.order_id, p.status, o.user_id
    INTO _order_id, _status, _owner
  FROM public.payments p
  JOIN public.orders o ON o.id = p.order_id
  WHERE p.id = _payment_id;

  IF _order_id IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', _payment_id;
  END IF;

  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to cancel this payment';
  END IF;

  IF _status IN ('successful','refunded') THEN
    RAISE EXCEPTION 'Cannot cancel a % payment', _status;
  END IF;

  UPDATE public.payments
    SET status = 'cancelled', updated_at = now()
    WHERE id = _payment_id;

  UPDATE public.orders
    SET payment_status = 'unpaid', updated_at = now()
    WHERE id = _order_id;

  PERFORM public.release_order_reservations(_order_id);
  PERFORM public.record_payment_event(_payment_id, 'payment_cancelled', NULL);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment(UUID) TO authenticated;
