
CREATE OR REPLACE FUNCTION public.user_owns_any_vendor_in_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_orders vo
    JOIN public.vendors v ON v.id = vo.vendor_id
    WHERE vo.order_id = _order_id
      AND v.user_id = auth.uid()
  )
$$;

DROP POLICY IF EXISTS "Vendors view orders containing their store" ON public.orders;
CREATE POLICY "Vendors view orders containing their store"
ON public.orders
FOR SELECT
TO authenticated
USING (public.user_owns_any_vendor_in_order(id));
