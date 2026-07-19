
-- 1) Hide sensitive columns from anonymous role
REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (cost_price) ON public.product_variants FROM anon;
REVOKE SELECT (email, phone, whatsapp) ON public.vendors FROM anon;

-- 2) Lock down SECURITY DEFINER functions that should not be client-callable.
-- Revoke from PUBLIC, anon, authenticated; service_role keeps access.
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'mark_payment_success(uuid, text, jsonb)',
    'mark_payment_failed(uuid, jsonb)',
    'commit_order_reservations(uuid)',
    'release_order_reservations(uuid)',
    'release_expired_reservations()',
    'record_payment_event(uuid, text, jsonb)',
    'claim_payments_for_reconciliation(integer)',
    'refresh_vendor_rating(uuid)',
    'assign_order_number()',
    'handle_new_user()',
    'update_updated_at_column()',
    'vendor_followers_sync_count()',
    'product_reviews_sync_vendor_rating()',
    'create_reservation_for_order_item()',
    'cart_validate_stock()',
    'protect_vendor_fields()',
    'owns_product(uuid)',
    'owns_vendor(uuid)',
    'user_owns_any_vendor_in_order(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;

-- 3) Client-callable SECURITY DEFINER functions: keep available to authenticated only
DO $$
DECLARE
  fn text;
  client_fns text[] := ARRAY[
    'has_role(uuid, app_role)',
    'create_payment(uuid, payment_provider, numeric, text)',
    'cancel_payment(uuid)',
    'cancel_pending_order(uuid)',
    'available_stock(uuid, uuid)',
    'increment_product_views(uuid)',
    'admin_cron_status()'
  ];
BEGIN
  FOREACH fn IN ARRAY client_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;
