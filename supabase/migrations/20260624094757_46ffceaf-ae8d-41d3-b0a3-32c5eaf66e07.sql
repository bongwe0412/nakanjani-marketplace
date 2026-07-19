
REVOKE EXECUTE ON FUNCTION public.mark_payment_success(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_payment_failed(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.commit_order_reservations(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_order_reservations(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_reservations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.available_stock(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_reservation_for_order_item() FROM PUBLIC, anon, authenticated;
