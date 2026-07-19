
-- Verification status enum
CREATE TYPE public.vendor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  verification_status public.vendor_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX vendors_slug_idx ON public.vendors (slug);
CREATE INDEX vendors_status_idx ON public.vendors (verification_status);

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Public can view approved vendors only
CREATE POLICY "Public can view approved vendors"
  ON public.vendors FOR SELECT
  TO anon, authenticated
  USING (verification_status = 'approved');

-- Vendors can view their own vendor profile (regardless of status)
CREATE POLICY "Vendors can view their own vendor profile"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Vendors can create their own application (forced to pending, can't self-promote)
CREATE POLICY "Users can create their own vendor application"
  ON public.vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND verification_status = 'pending'
  );

-- Vendors can update their own profile, but cannot change verification_status or user_id
CREATE POLICY "Vendors can update their own vendor profile"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all vendor records
CREATE POLICY "Admins can view all vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert vendors"
  ON public.vendors FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vendors"
  ON public.vendors FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete vendors"
  ON public.vendors FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: prevent vendors from changing their own verification_status or user_id
CREATE OR REPLACE FUNCTION public.protect_vendor_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION 'Only admins can change verification_status';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change vendor owner';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_vendor_fields() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER vendors_protect_fields
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.protect_vendor_fields();

-- Auto-update updated_at
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
