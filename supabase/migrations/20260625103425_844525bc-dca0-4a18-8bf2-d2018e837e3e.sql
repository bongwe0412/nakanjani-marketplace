CREATE OR REPLACE FUNCTION public.admin_cron_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  _jobs JSONB;
  _runs JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'jobid', jobid, 'jobname', jobname, 'schedule', schedule, 'active', active
  ) ORDER BY jobname), '[]'::jsonb) INTO _jobs FROM cron.job;

  SELECT COALESCE(jsonb_agg(r ORDER BY r->>'start_time' DESC), '[]'::jsonb) INTO _runs
  FROM (
    SELECT jsonb_build_object(
      'jobid', jobid,
      'status', status,
      'return_message', return_message,
      'start_time', start_time,
      'end_time', end_time
    ) AS r
    FROM cron.job_run_details
    ORDER BY start_time DESC
    LIMIT 20
  ) sub;

  RETURN jsonb_build_object('jobs', _jobs, 'recent_runs', _runs);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cron_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_status() TO authenticated, service_role;