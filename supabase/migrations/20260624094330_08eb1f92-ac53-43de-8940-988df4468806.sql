
-- Enums (payment_status already exists for orders, use distinct names)
CREATE TYPE public.payment_txn_status AS ENUM ('pending','processing','successful','failed','cancelled','refunded');
CREATE TYPE public.payment_provider AS ENUM ('payfast','ozow');

-- payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  provider_reference TEXT,
  provider_transaction_id TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  status public.payment_txn_status NOT NULL DEFAULT 'pending',
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_provider_ref ON public.payments(provider, provider_reference);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own order payments" ON public.payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payments.order_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admins full access on payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payment_events table
CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_payment ON public.payment_events(payment_id);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own order payment events" ON public.payment_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payments p
    JOIN public.orders o ON o.id = p.order_id
    WHERE p.id = payment_events.payment_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admins full access on payment_events" ON public.payment_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: record_payment_event
CREATE OR REPLACE FUNCTION public.record_payment_event(
  _payment_id UUID,
  _event_type TEXT,
  _payload JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO public.payment_events (payment_id, event_type, payload)
  VALUES (_payment_id, _event_type, _payload)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_payment_event(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- Helper: create_payment (callable by the order's owner)
CREATE OR REPLACE FUNCTION public.create_payment(
  _order_id UUID,
  _provider public.payment_provider,
  _amount NUMERIC,
  _provider_reference TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment_id UUID;
  _owner UUID;
BEGIN
  SELECT user_id INTO _owner FROM public.orders WHERE id = _order_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Order % not found', _order_id;
  END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized to create payment for this order';
  END IF;

  INSERT INTO public.payments (order_id, provider, amount, provider_reference, status)
  VALUES (_order_id, _provider, _amount, _provider_reference, 'pending')
  RETURNING id INTO _payment_id;

  PERFORM public.record_payment_event(_payment_id, 'payment_created',
    jsonb_build_object('order_id', _order_id, 'amount', _amount, 'provider', _provider));

  RETURN _payment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_payment(UUID, public.payment_provider, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment(UUID, public.payment_provider, NUMERIC, TEXT) TO authenticated;

-- Helper: mark_payment_success (admin or system/service-role only)
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

  PERFORM public.record_payment_event(_payment_id, 'payment_success', _gateway_response);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_payment_success(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- Helper: mark_payment_failed (admin or system/service-role only)
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

  PERFORM public.record_payment_event(_payment_id, 'payment_failed', _gateway_response);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_payment_failed(UUID, JSONB) FROM PUBLIC, anon, authenticated;
