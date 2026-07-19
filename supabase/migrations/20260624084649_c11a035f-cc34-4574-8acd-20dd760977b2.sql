
-- 1. Drop the writable `role` column on profiles. Source of truth is public.user_roles + has_role().
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 2. Lock down owns_product (used by RLS, never called directly).
REVOKE EXECUTE ON FUNCTION public.owns_product(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Re-assert hardening on every helper. CREATE OR REPLACE keeps signatures stable
--    and ensures search_path is explicit. Body is unchanged from current definitions.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_vendor(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = _vendor_id AND v.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendors v ON v.id = p.vendor_id
    WHERE p.id = _product_id AND v.user_id = auth.uid()
  )
$$;

-- Re-revoke after CREATE OR REPLACE (Postgres resets grants to PUBLIC EXECUTE on replace).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_vendor(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_product(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger functions: not callable through the API; ensure no public EXECUTE either.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_vendor_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cart_validate_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
