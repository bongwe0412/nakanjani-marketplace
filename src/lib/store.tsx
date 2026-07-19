import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { type Product } from "./mock-data";
import { supabase } from "@/integrations/supabase/client";
import { loadProductsByIds } from "./products-data";

export type CartItem = {
  /** Stable composite key: `${product.id}::${variantId ?? ''}` */
  key: string;
  product: Product;
  variantId: string | null;
  variantLabel: string | null;
  vendorId: string | null;
  unitPrice: number;
  stock: number;
  qty: number;
  /** DB row id when this line is persisted in `cart_items`. */
  dbId?: string | null;
};

export type AddToCartOpts = {
  variantId?: string | null;
  variantLabel?: string | null;
  vendorId?: string | null;
  price?: number;
  stock?: number;
};

type StoreCtx = {
  cart: CartItem[];
  wishlist: string[];
  recentlyViewed: string[];
  addToCart: (p: Product, qty?: number, opts?: AddToCartOpts) => void;
  removeFromCart: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
  toggleWishlist: (id: string) => void;
  trackView: (id: string) => void;
  cartCount: number;
  cartSubtotal: number;
  userId: string | null;
};

const Ctx = createContext<StoreCtx | null>(null);

const isBrowser = typeof window !== "undefined";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | null | undefined): s is string => !!s && UUID_RE.test(s);
const cartKey = (productId: string, variantId: string | null | undefined) =>
  `${productId}::${variantId ?? ""}`;

const read = <T,>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

type StoredCart = {
  id: string;
  qty: number;
  variantId?: string | null;
  variantLabel?: string | null;
  vendorId?: string | null;
  unitPrice?: number;
  stock?: number;
}[];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const hydratedForUser = useRef<string | null>(null);

  // Hydrate from localStorage once (guests + initial paint)
  useEffect(() => {
    const raw = read<StoredCart>("sm_cart", []);
    const hydrated: CartItem[] = [];
    for (const c of raw) {
      if (isUuid(c.id)) {
        // Defer — will resolve from DB during sign-in merge or async fetch below
        hydrated.push({
          key: cartKey(c.id, c.variantId ?? null),
          product: { id: c.id, slug: c.id, name: "Loading…", brand: "", category: "", vendor: "", price: c.unitPrice ?? 0, rating: 0, reviews: 0, stock: c.stock ?? 0, images: ["/placeholder.svg"], description: "", specs: {}, tags: [] } as Product,
          variantId: c.variantId ?? null,
          variantLabel: c.variantLabel ?? null,
          vendorId: c.vendorId ?? null,
          unitPrice: c.unitPrice ?? 0,
          stock: c.stock ?? 0,
          qty: c.qty,
        });
      }
    }
    setCart(hydrated);
    setWishlist(read("sm_wish", []));
    setRecentlyViewed(read("sm_recent", []));

    // Resolve placeholder products from DB (guest may have UUID products in local cart)
    const placeholderIds = hydrated.filter((i) => i.product.name === "Loading…").map((i) => i.product.id);
    if (placeholderIds.length > 0) {
      void loadProductsByIds(placeholderIds).then((resolved) => {
        if (resolved.length === 0) return;
        const map = new Map(resolved.map((p) => [p.id, p]));
        setCart((cur) => cur.map((i) => {
          const p = map.get(i.product.id);
          return p ? { ...i, product: p, unitPrice: i.unitPrice || p.price, stock: i.stock || p.stock } : i;
        }));
      });
    }
  }, []);

  // Track auth
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (active) setUserId(error ? null : data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Per-user hydration: wishlist, recently viewed, AND cart merge.
  useEffect(() => {
    if (!userId) { hydratedForUser.current = null; return; }
    if (hydratedForUser.current === userId) return;
    hydratedForUser.current = userId;
    (async () => {
      const [{ data: wl }, { data: rv }, { data: dbCart }] = await Promise.all([
        supabase.from("wishlists").select("product_id"),
        supabase.from("recently_viewed").select("product_id").order("viewed_at", { ascending: false }).limit(12),
        supabase.from("cart_items").select("id, product_id, variant_id, vendor_id, quantity"),
      ]);
      const dbWish = (wl ?? []).map((r) => r.product_id);
      const dbRecent = (rv ?? []).map((r) => r.product_id);
      setWishlist((local) => Array.from(new Set([...dbWish, ...local])));
      setRecentlyViewed((local) => Array.from(new Set([...dbRecent, ...local.filter((id) => !dbRecent.includes(id))])).slice(0, 12));

      // Merge cart: union of local + DB, summing quantities for same key, clamped to stock.
      const localSnapshot = (await new Promise<CartItem[]>((res) => setCart((c) => { res(c); return c; })));

      const dbRows = dbCart ?? [];
      const productIdsNeeded = Array.from(new Set([
        ...dbRows.map((r) => r.product_id),
        ...localSnapshot.filter((i) => isUuid(i.product.id) && i.product.name === "Loading…").map((i) => i.product.id),
      ]));
      const resolved = productIdsNeeded.length ? await loadProductsByIds(productIdsNeeded) : [];
      const productMap = new Map(resolved.map((p) => [p.id, p]));

      // Build map by key
      const merged = new Map<string, CartItem>();
      for (const li of localSnapshot) {
        const product = productMap.get(li.product.id) ?? li.product;
        merged.set(li.key, { ...li, product, unitPrice: li.unitPrice || product.price, stock: li.stock || product.stock });
      }
      for (const r of dbRows) {
        const k = cartKey(r.product_id, r.variant_id);
        const product = productMap.get(r.product_id);
        if (!product) continue;
        const existing = merged.get(k);
        if (existing) {
          merged.set(k, { ...existing, dbId: r.id, qty: Math.min(existing.qty + r.quantity, existing.stock || r.quantity + existing.qty) });
        } else {
          merged.set(k, {
            key: k,
            product,
            variantId: r.variant_id,
            variantLabel: null,
            vendorId: r.vendor_id,
            unitPrice: product.price,
            stock: product.stock,
            qty: r.quantity,
            dbId: r.id,
          });
        }
      }

      // Persist back any local rows not yet in DB, and update qty where it changed.
      const finalRows: CartItem[] = [];
      for (const item of merged.values()) {
        if (isUuid(item.product.id) && isUuid(item.vendorId)) {
          if (item.dbId) {
            // Update qty if differs from DB original
            const dbRow = dbRows.find((d) => d.id === item.dbId);
            if (dbRow && dbRow.quantity !== item.qty) {
              await supabase.from("cart_items").update({ quantity: item.qty }).eq("id", item.dbId);
            }
            finalRows.push(item);
          } else {
            const { data: inserted } = await supabase
              .from("cart_items")
              .insert({ user_id: userId, product_id: item.product.id, variant_id: item.variantId, vendor_id: item.vendorId, quantity: item.qty })
              .select("id")
              .single();
            finalRows.push({ ...item, dbId: inserted?.id ?? null });
          }
        } else {
          finalRows.push(item);
        }
      }
      setCart(finalRows);
    })();
  }, [userId]);

  // Persist cart to localStorage on every change
  useEffect(() => {
    if (!isBrowser) return;
    const payload: StoredCart = cart.map((c) => ({
      id: c.product.id,
      qty: c.qty,
      variantId: c.variantId,
      variantLabel: c.variantLabel,
      vendorId: c.vendorId,
      unitPrice: c.unitPrice,
      stock: c.stock,
    }));
    localStorage.setItem("sm_cart", JSON.stringify(payload));
  }, [cart]);
  useEffect(() => { if (isBrowser) localStorage.setItem("sm_wish", JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { if (isBrowser) localStorage.setItem("sm_recent", JSON.stringify(recentlyViewed)); }, [recentlyViewed]);

  const persistAdd = async (item: CartItem, addQty: number) => {
    if (!userId || !isUuid(item.product.id) || !isUuid(item.vendorId)) return null;
    if (item.dbId) {
      await supabase.from("cart_items").update({ quantity: item.qty }).eq("id", item.dbId);
      return item.dbId;
    }
    const { data, error } = await supabase
      .from("cart_items")
      .insert({ user_id: userId, product_id: item.product.id, variant_id: item.variantId, vendor_id: item.vendorId, quantity: item.qty })
      .select("id")
      .single();
    if (error) return null;
    void addQty; // qty already reflected in item.qty
    return data?.id ?? null;
  };

  const addToCart = (p: Product, qty = 1, opts: AddToCartOpts = {}) => {
    const variantId = opts.variantId ?? null;
    const vendorId = opts.vendorId ?? null;
    const unitPrice = opts.price ?? p.price;
    const stock = opts.stock ?? p.stock;
    const key = cartKey(p.id, variantId);

    setCart((c) => {
      const idx = c.findIndex((x) => x.key === key);
      if (idx >= 0) {
        const ex = c[idx];
        const newQty = Math.min(ex.qty + qty, Math.max(stock, 1));
        const updated: CartItem = { ...ex, qty: newQty, unitPrice, stock };
        void persistAdd(updated, qty).then((id) => {
          if (id && id !== updated.dbId) {
            setCart((cur) => cur.map((x) => (x.key === key ? { ...x, dbId: id } : x)));
          }
        });
        return c.map((x, i) => (i === idx ? updated : x));
      }
      const fresh: CartItem = {
        key,
        product: p,
        variantId,
        variantLabel: opts.variantLabel ?? null,
        vendorId,
        unitPrice,
        stock,
        qty: Math.min(Math.max(qty, 1), Math.max(stock, 1)),
      };
      void persistAdd(fresh, qty).then((id) => {
        if (id) setCart((cur) => cur.map((x) => (x.key === key ? { ...x, dbId: id } : x)));
      });
      return [...c, fresh];
    });
  };

  const removeFromCart = (key: string) => {
    setCart((c) => {
      const target = c.find((x) => x.key === key);
      if (target?.dbId) void supabase.from("cart_items").delete().eq("id", target.dbId);
      return c.filter((x) => x.key !== key);
    });
  };

  const updateQty = (key: string, qty: number) => {
    setCart((c) =>
      c.map((x) => {
        if (x.key !== key) return x;
        const next = Math.min(Math.max(1, qty), Math.max(x.stock, 1));
        if (next !== x.qty && x.dbId) {
          void supabase.from("cart_items").update({ quantity: next }).eq("id", x.dbId);
        }
        return { ...x, qty: next };
      }),
    );
  };

  const clearCart = () => {
    if (userId) void supabase.from("cart_items").delete().eq("user_id", userId);
    setCart([]);
  };

  const toggleWishlist = (id: string) => {
    const willAdd = !wishlist.includes(id);
    setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
    if (userId && isUuid(id)) {
      if (willAdd) {
        void supabase.from("wishlists").upsert({ user_id: userId, product_id: id }, { onConflict: "user_id,product_id" });
      } else {
        void supabase.from("wishlists").delete().eq("user_id", userId).eq("product_id", id);
      }
    }
  };

  const trackView = (id: string) => {
    setRecentlyViewed((r) => [id, ...r.filter((x) => x !== id)].slice(0, 12));
    if (userId && isUuid(id)) {
      void supabase.from("recently_viewed").upsert(
        { user_id: userId, product_id: id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,product_id" },
      );
    }
  };

  const cartCount = cart.reduce((a, b) => a + b.qty, 0);
  const cartSubtotal = cart.reduce((a, b) => a + b.qty * b.unitPrice, 0);

  return (
    <Ctx.Provider value={{ cart, wishlist, recentlyViewed, addToCart, removeFromCart, updateQty, clearCart, toggleWishlist, trackView, cartCount, cartSubtotal, userId }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be inside StoreProvider");
  return c;
};
