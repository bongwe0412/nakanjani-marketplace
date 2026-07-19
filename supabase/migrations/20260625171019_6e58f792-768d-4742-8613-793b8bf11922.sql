
-- Hide vendor cost_price from anonymous visitors via column-level grants
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, vendor_id, category_id, subcategory_id, name, slug, short_description, description, sku, brand, price, compare_at_price, stock_quantity, weight, dimensions, status, featured, created_at, updated_at, view_count) ON public.products TO anon;

REVOKE SELECT ON public.product_variants FROM anon;
GRANT SELECT (id, product_id, sku, option_1_name, option_1_value, option_2_name, option_2_value, option_3_name, option_3_value, price, compare_at_price, stock_quantity, weight, active, created_at, updated_at) ON public.product_variants TO anon;

-- Hide vendor contact details (email, phone, whatsapp) from anonymous visitors
REVOKE SELECT ON public.vendors FROM anon;
GRANT SELECT (id, user_id, store_name, slug, description, logo_url, banner_url, rating, followers_count, verification_status, created_at, updated_at) ON public.vendors TO anon;

-- Lock down SECURITY DEFINER helpers that are only invoked from triggers / other definer functions
REVOKE EXECUTE ON FUNCTION public.available_stock(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_cron_status() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_any_vendor_in_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_payment_success(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_payment_failed(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_payment_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.commit_order_reservations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_reservations(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_vendor_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_payments_for_reconciliation(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_payment(uuid, payment_provider, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_payment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_product_views(uuid) FROM PUBLIC;
