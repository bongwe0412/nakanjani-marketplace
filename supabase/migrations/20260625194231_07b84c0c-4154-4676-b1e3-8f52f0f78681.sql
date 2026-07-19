
-- 1) Vault-stored secret for the cron reconcile endpoint
DO $$
DECLARE
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'cron_reconcile_secret';
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'cron_reconcile_secret',
      'Shared secret for /api/public/cron/reconcile-payments'
    );
  END IF;
END $$;

-- Verifier RPC: only service_role can invoke (server uses supabaseAdmin)
CREATE OR REPLACE FUNCTION public.verify_cron_secret(_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT decrypted_secret INTO v_expected
  FROM vault.decrypted_secrets
  WHERE name = 'cron_reconcile_secret'
  LIMIT 1;
  IF v_expected IS NULL OR _secret IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_expected = _secret;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

-- 2) Reschedule the cron job to send the secret in x-cron-secret instead of the public anon key
SELECT cron.unschedule('reconcile-pending-payments');
SELECT cron.schedule(
  'reconcile-pending-payments',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nakanjani.co.za/api/public/cron/reconcile-payments',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_reconcile_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);

-- 3) Force product_reviews.verified to require a paid purchase by the reviewer
CREATE OR REPLACE FUNCTION public.enforce_review_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may set verified freely
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For everyone else, verified=true only if they actually paid for this product.
  IF NEW.verified IS TRUE THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.product_id = NEW.product_id
        AND o.user_id = NEW.user_id
        AND o.payment_status = 'paid'
    ) THEN
      NEW.verified := false;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_reviews_enforce_verified ON public.product_reviews;
CREATE TRIGGER product_reviews_enforce_verified
  BEFORE INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_verified();
