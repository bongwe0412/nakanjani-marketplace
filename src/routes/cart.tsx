import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useEffect, useState } from "react";
import { Trash2, Minus, Plus, ShoppingBag, ShieldCheck, Store } from "lucide-react";
import { useStore, type CartItem } from "@/lib/store";
import { formatZAR, type Product } from "@/lib/mock-data";
import { loadProductsByIds } from "@/lib/products-data";
import { ProductCard } from "@/components/ProductCard";
import { TrustBadges, TRUST_PRESETS } from "@/components/TrustBadges";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — NAKANJANI Marketplace" }] }),
  component: CartPage,
});

function CartPage() {
  const { cart, updateQty, removeFromCart, cartSubtotal, cartCount, clearCart, recentlyViewed } = useStore();
  const shipping = cartSubtotal > 500 || cartSubtotal === 0 ? 0 : 49;
  const [recentItems, setRecentItems] = useState<Product[]>([]);
  useEffect(() => {
    let active = true;
    if (recentlyViewed.length === 0) { setRecentItems([]); return; }
    loadProductsByIds(recentlyViewed.slice(0, 4)).then((res) => { if (active) setRecentItems(res); });
    return () => { active = false; };
  }, [recentlyViewed]);
  const total = cartSubtotal + shipping;

  // Group items by vendor (slug as a stable display key; vendor name resolved from mock or product.vendor field).
  const groups = useMemo(() => {
    const m = new Map<string, { vendorKey: string; vendorName: string; items: CartItem[] }>();
    for (const item of cart) {
      const slug = item.product.vendor || "unknown";
      const vendorName = item.product.vendorName ?? (slug ? slug.replace(/-/g, " ") : "Vendor");
      if (!m.has(slug)) m.set(slug, { vendorKey: slug, vendorName, items: [] });
      m.get(slug)!.items.push(item);
    }
    return Array.from(m.values());
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 sm:p-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-foreground">
          <ShoppingBag className="h-9 w-9" strokeWidth={1.2} />
        </div>
        <h1 className="mt-5 font-display text-xl sm:text-2xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Discover curated pieces from vendors across South Africa.</p>
        <Link to="/products" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] sm:w-auto sm:px-8">
          Start shopping
        </Link>
        <Link to="/wishlist" className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">View wishlist</Link>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-0">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Your cart</h1>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{cartCount} item{cartCount === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-5 sm:mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {groups.map((group) => {
            const vendorSubtotal = group.items.reduce((a, b) => a + b.qty * b.unitPrice, 0);
            return (
              <div key={group.vendorKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Link to="/vendor/$slug" params={{ slug: group.vendorKey }} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                    <Store className="h-4 w-4" />
                    <span className="capitalize">{group.vendorName}</span>
                  </Link>
                  <span className="text-xs text-muted-foreground tabular-nums">{group.items.length} item{group.items.length === 1 ? "" : "s"} · {formatZAR(vendorSubtotal)}</span>
                </div>

                {group.items.map((item) => {
                  const atMax = item.qty >= item.stock;
                  return (
                    <div key={item.key} className="surface-card p-3 sm:p-4">
                      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4">
                        <Link to="/product/$id" params={{ id: item.product.id }} className="block">
                          <img src={item.product.images[0]} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                        </Link>
                        <div className="flex min-w-0 flex-col">
                          {item.product.brand && (
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.product.brand}</div>
                          )}
                          <Link to="/product/$id" params={{ id: item.product.id }} className="line-clamp-2 text-sm sm:text-[15px] font-medium leading-snug hover:underline">
                            {item.product.name}
                          </Link>
                          {item.variantLabel && (
                            <div className="mt-1 inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                              {item.variantLabel}
                            </div>
                          )}
                          <div className="mt-1 text-sm font-bold sm:hidden tabular-nums">{formatZAR(item.unitPrice * item.qty)}</div>
                          <div className="hidden sm:block mt-1 text-sm font-bold tabular-nums">{formatZAR(item.unitPrice)}</div>
                          {atMax && (
                            <div className="mt-1 text-[11px] text-warning-foreground">Max available stock reached</div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                        <div className="flex h-12 items-center rounded-xl border border-border">
                          <button
                            aria-label="Decrease quantity"
                            onClick={() => updateQty(item.key, item.qty - 1)}
                            className="grid h-12 w-12 place-items-center hover:bg-secondary active:bg-muted">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                          <button
                            aria-label="Increase quantity"
                            disabled={atMax}
                            onClick={() => updateQty(item.key, item.qty + 1)}
                            className="grid h-12 w-12 place-items-center hover:bg-secondary active:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="hidden sm:block text-right">
                            <div className="text-sm font-bold tabular-nums">{formatZAR(item.unitPrice * item.qty)}</div>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.key)}
                            aria-label="Remove item"
                            className="grid h-12 w-12 place-items-center rounded-xl border border-border text-muted-foreground hover:border-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-1">
            <Link to="/products" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Continue shopping</Link>
            <button onClick={clearCart} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive">Clear cart</button>
          </div>
        </div>

        <aside className="surface-card h-fit p-4 sm:p-5 space-y-3 lg:sticky lg:top-24">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order summary</div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatZAR(cartSubtotal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total items</span><span className="tabular-nums">{cartCount}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Estimated shipping</span><span className="tabular-nums">{shipping === 0 ? "Free" : formatZAR(shipping)}</span></div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-semibold">Grand total</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatZAR(total)}</span>
          </div>
          <Link to="/checkout" className="hidden lg:flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)]">
            Proceed to checkout
          </Link>
          <div className="hidden lg:flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure encrypted checkout
          </div>
          <div className="border-t border-border pt-3">
            <TrustBadges items={TRUST_PRESETS.checkout} variant="row" />
          </div>
        </aside>
      </div>

      {/* Mobile sticky checkout */}
      <div className="fixed bottom-14 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur px-3 py-2.5 pb-safe lg:hidden">
        <div className="flex items-center gap-3">
          <div className="leading-tight min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="font-bold tabular-nums">{formatZAR(total)}</div>
          </div>
          <Link
            to="/checkout"
            className="ml-auto inline-flex h-12 flex-1 max-w-[60%] items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold uppercase tracking-wider text-primary-foreground">
            Checkout
          </Link>
        </div>
      </div>

      {recentItems.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">Recently viewed</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {recentItems.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

    </div>
  );
}
