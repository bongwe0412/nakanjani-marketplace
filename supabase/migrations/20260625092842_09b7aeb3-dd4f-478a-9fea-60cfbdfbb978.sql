REVOKE EXECUTE ON FUNCTION public.record_payment_event(uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_payment_event(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_payment_event(uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_event(uuid, text, jsonb) TO service_role;