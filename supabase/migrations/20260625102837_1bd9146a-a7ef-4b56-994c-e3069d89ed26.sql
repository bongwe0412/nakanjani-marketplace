-- B5: Payment reconciliation lock + cron
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS payments_pending_recon_idx
  ON public.payments (created_at)
  WHERE status IN ('pending','processing');

-- Claim a batch of stale pending payments for reconciliation.
-- Returns the rows we locked; caller is responsible for finishing them.
CREATE OR REPLACE FUNCTION public.claim_payments_for_reconciliation(_max INTEGER DEFAULT 25)
RETURNS TABLE (id UUID, provider TEXT, provider_reference TEXT, amount NUMERIC, order_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT p.id
    FROM public.payments p
    WHERE p.status IN ('pending','processing')
      AND p.created_at < now() - interval '10 minutes'
      AND (p.processing_at IS NULL OR p.processing_at < now() - interval '5 minutes')
      AND p.provider_reference IS NOT NULL
    ORDER BY p.created_at ASC
    LIMIT _max
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.payments p
     SET processing_at = now()
    FROM cte
   WHERE p.id = cte.id
  RETURNING p.id, p.provider::text, p.provider_reference, p.amount, p.order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_payments_for_reconciliation(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payments_for_reconciliation(INTEGER) TO service_role;

-- Ensure cron extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- (Re)schedule reconciliation every 5 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-pending-payments');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reconcile-pending-payments',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nakanjani.co.za/api/public/cron/reconcile-payments',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyanRqcHJwemZra25zemZ0dnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjEzNjgsImV4cCI6MjA5NzkzNzM2OH0.6CRI5s15bP4gp-1Nk7BLIfEfpTnq3HhDZs2WIr7AozA'
    ),
    body := '{}'::jsonb
  );
  $$
);