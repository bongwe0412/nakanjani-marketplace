
-- 1) Orders: terms acceptance timestamp
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- 2) Webhook idempotency: unique on payload event_id (when present)
-- Wrapped in DO block so an existing index from a prior run is preserved.
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_event_id_uidx
  ON public.payment_events ((payload->>'event_id'))
  WHERE payload ? 'event_id';

-- 3) mark_payment_success: also flip vendor_orders to 'processing'
CREATE OR REPLACE FUNCTION public.mark_payment_success(_payment_id uuid, _provider_transaction_id text DEFAULT NULL::text, _gateway_response jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.vendor_orders
  SET status = 'processing', updated_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  PERFORM public.commit_order_reservations(_order_id);
  PERFORM public.record_payment_event(_payment_id, 'payment_success', _gateway_response);
END;
$function$;

-- 4) mark_payment_failed: also cancel pending vendor_orders
CREATE OR REPLACE FUNCTION public.mark_payment_failed(_payment_id uuid, _gateway_response jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.vendor_orders
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = _order_id AND status = 'pending';

  PERFORM public.release_order_reservations(_order_id);
  PERFORM public.record_payment_event(_payment_id, 'payment_failed', _gateway_response);
END;
$function$;

-- 5) cancel_payment: also cancel pending vendor_orders
CREATE OR REPLACE FUNCTION public.cancel_payment(_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE public.vendor_orders
    SET status = 'cancelled', updated_at = now()
    WHERE order_id = _order_id AND status = 'pending';

  PERFORM public.release_order_reservations(_order_id);
  PERFORM public.record_payment_event(_payment_id, 'payment_cancelled', NULL);
END;
$function$;

-- 6) Schedule reservation expiry sweep every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'release-expired-reservations'
  ) THEN
    PERFORM cron.schedule(
      'release-expired-reservations',
      '* * * * *',
      $cron$ SELECT public.release_expired_reservations(); $cron$
    );
  END IF;
END$$;
