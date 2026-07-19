
-- 1. Hide sensitive vendor contact columns from anonymous visitors
REVOKE SELECT (email, phone, whatsapp) ON public.vendors FROM anon;

-- 2. Explicit admin-only write policies on user_roles (prevent privilege escalation)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Revoke EXECUTE on every SECURITY DEFINER function from PUBLIC + anon
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END $$;

-- service_role keeps full access (used by edge functions / admin)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Re-grant the small set of functions intentionally callable from the app
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_vendor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.available_stock(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment(uuid, public.payment_provider, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_event(uuid, text, jsonb) TO authenticated;

-- Product page is public, so anon needs to bump the view counter
GRANT EXECUTE ON FUNCTION public.increment_product_views(uuid) TO anon, authenticated;
