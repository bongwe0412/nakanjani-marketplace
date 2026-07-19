
-- wishlists
CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wishlist"
ON public.wishlists FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all wishlists"
ON public.wishlists FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- recently_viewed
CREATE TABLE public.recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX idx_recently_viewed_user_time ON public.recently_viewed(user_id, viewed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;
GRANT ALL ON public.recently_viewed TO service_role;

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recently viewed"
ON public.recently_viewed FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own recently viewed"
ON public.recently_viewed FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own recently viewed"
ON public.recently_viewed FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own recently viewed"
ON public.recently_viewed FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all recently viewed"
ON public.recently_viewed FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
