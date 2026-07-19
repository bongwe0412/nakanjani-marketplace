import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Star, Heart, ShoppingCart, ShieldCheck, Zap, ChevronRight, BadgeCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatZAR } from "@/lib/mock-data";
import { loadProductReviews, loadPublicProduct, type PublicVariant } from "@/lib/products-data";
import { TrustBadges, TRUST_PRESETS } from "@/components/TrustBadges";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { incrementProductViews } from "@/lib/secure-rpc.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const result = await loadPublicProduct(params.id);
    if (!result) throw notFound();
    return { product: result.product, vendor: result.vendor, vendorId: result.vendorId, variants: result.variants };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.product.name} — NAKANJANI Marketplace` },
      { name: "description", content: (loaderData.product.description || "").slice(0, 155) },
      { property: "og:image", content: loaderData.product.images[0] },
    ] : [],
  }),
  errorComponent: ({ error }) => (
    <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
      <h2 className="font-display text-lg font-bold">Couldn't load product</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
      <h2 className="font-display text-lg font-bold">Product not found</h2>
      <p className="mt-1 text-sm text-muted-foreground">It may have been removed or is no longer active.</p>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product, vendor, vendorId, variants } = Route.useLoaderData() as { product: any; vendor: any; vendorId: string; variants: PublicVariant[] };
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "spec" | "rev">("desc");
  const { addToCart, toggleWishlist, wishlist, trackView } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    trackView(product.id);
    void incrementProductViews({ data: { product_id: product.id } });
  }, [product.id]);

  const optionGroups = useMemo(() => {
    const groups: { name: string; values: string[]; key: "option_1_value" | "option_2_value" | "option_3_value" }[] = [];
    for (const key of ["option_1", "option_2", "option_3"] as const) {
      const nameKey = `${key}_name` as const;
      const valKey = `${key}_value` as const;
      const name = variants.find((v) => v[nameKey])?.[nameKey];
      if (!name) continue;
      const values = Array.from(new Set(variants.map((v) => v[valKey]).filter((x): x is string => Boolean(x))));
      if (values.length === 0) continue;
      groups.push({ name, values, key: valKey });
    }
    return groups;
  }, [variants]);

  const hasVariants = variants.length > 0 && optionGroups.length > 0;
  const [selected, setSelected] = useState<Record<string, string>>({});
  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => optionGroups.every((g) => selected[g.name] && v[g.key] === selected[g.name])) ?? null;
  }, [variants, optionGroups, selected, hasVariants]);

  const selectionComplete = !hasVariants || matchedVariant !== null;
  const displayPrice = matchedVariant ? matchedVariant.price : product.price;
  const displayCompare = matchedVariant?.compare_at_price ?? product.originalPrice ?? null;
  const displayStock = matchedVariant ? matchedVariant.stock_quantity : product.stock;
  const variantLabel = matchedVariant ? optionGroups.map((g) => `${g.name}: ${matchedVariant[g.key]}`).join(" · ") : null;
  const addOpts = { variantId: matchedVariant?.id ?? null, variantLabel, vendorId, price: displayPrice, stock: displayStock };

  const reviews = useQuery({ queryKey: ["product-reviews", product.id], queryFn: () => loadProductReviews(product.id) });
  const reviewItems = reviews.data ?? [];

  const dist = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviewItems.forEach((r) => { counts[Math.min(4, Math.max(0, Math.round(r.rating) - 1))]++; });
    const total = reviewItems.length || 1;
    return [5, 4, 3, 2, 1].map((star) => ({ star, count: counts[star - 1], pct: Math.round((counts[star - 1] / total) * 100) }));
  }, [reviewItems]);
  const avgRating = reviewItems.length ? reviewItems.reduce((a, b) => a + b.rating, 0) / reviewItems.length : 0;

  return (
    <div className="pb-28 lg:pb-0">
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground overflow-hidden">
        <Link to="/" className="hover:text-foreground shrink-0">Home</Link><ChevronRight className="h-3 w-3 shrink-0" />
        {product.category && product.category !== "uncategorized" && (
          <>
            <Link to="/category/$slug" params={{ slug: product.category }} className="hover:text-foreground capitalize shrink-0">{product.category.replace("-", " & ")}</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
          </>
        )}
        <span className="text-foreground truncate min-w-0">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
        <div>
          <div className="lg:hidden relative">
            <div className="snap-x snap-mandatory flex overflow-x-auto no-scrollbar rounded-md surface-card" onScroll={(e) => {
              const el = e.currentTarget; const i = Math.round(el.scrollLeft / el.clientWidth); if (i !== active) setActive(i);
            }}>
              {product.images.map((src: string, i: number) => (
                <div key={i} className="snap-center shrink-0 w-full aspect-square">
                  <img src={src} alt={`${product.name} ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="surface-card aspect-square overflow-hidden">
              <img src={product.images[active]} alt={product.name} className="h-full w-full object-cover" />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {product.images.map((src: string, i: number) => (
                  <button key={i} onClick={() => setActive(i)} className={`surface-card aspect-square overflow-hidden ${active === i ? "ring-2 ring-primary" : ""}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mt-2 text-sm text-muted-foreground">
            {product.brand}{product.brand && product.vendor && " · "}
            {product.vendor && (
              <Link to="/vendor/$slug" params={{ slug: product.vendor }} className="inline-flex items-center gap-1 text-primary hover:underline">
                <span className="capitalize">{product.vendorName ?? product.vendor.replace(/-/g, " ")}</span>
                {vendor?.verified && <BadgeCheck className="h-3.5 w-3.5 text-foreground" />}
              </Link>
            )}
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold break-words">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm flex-wrap">
            {reviewItems.length > 0 && (
              <>
                <div className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" /><span className="font-semibold">{avgRating.toFixed(1)}</span></div>
                <button onClick={() => setTab("rev")} className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">({reviewItems.length} review{reviewItems.length === 1 ? "" : "s"})</button>
              </>
            )}
            <span className={displayStock > 0 ? "text-success" : "text-destructive"}>{displayStock > 0 ? `In stock · ${displayStock} left` : "Out of stock"}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl sm:text-4xl font-bold tabular-nums">{formatZAR(displayPrice)}</span>
            {displayCompare != null && displayCompare > displayPrice && (
              <>
                <span className="text-muted-foreground line-through tabular-nums">{formatZAR(displayCompare)}</span>
                <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">-{Math.round(100 - (displayPrice / displayCompare) * 100)}%</span>
              </>
            )}
          </div>
          {product.description && <p className="mt-4 text-muted-foreground text-sm sm:text-base">{product.description}</p>}

          {hasVariants && (
            <div className="mt-5 space-y-3">
              {optionGroups.map((g) => (
                <div key={g.name}>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {selected[g.name] ? `${g.name}: ${selected[g.name]}` : `Select ${g.name}`}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.values.map((val) => (
                      <button key={val} type="button" onClick={() => setSelected((s) => ({ ...s, [g.name]: val }))} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${selected[g.name] === val ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"}`}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-border bg-surface">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-12 w-12 hover:bg-card">−</button>
              <input value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="h-12 w-12 bg-transparent text-center outline-none" />
              <button onClick={() => setQty((q) => Math.min(displayStock || q + 1, q + 1))} className="h-12 w-12 hover:bg-card">+</button>
            </div>
            <button
              onClick={() => { addToCart(product, qty, addOpts); toast.success("Added to cart"); }}
              disabled={!selectionComplete || displayStock <= 0}
              className="flex-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold uppercase tracking-wider text-primary-foreground btn-glow hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" /> Add to cart
            </button>
            <button onClick={() => toggleWishlist(product.id)} aria-label="Wishlist" className="grid h-12 w-12 place-items-center rounded-xl border border-border hover:border-destructive hover:text-destructive">
              <Heart className={`h-5 w-5 ${wishlist.includes(product.id) ? "fill-destructive text-destructive" : ""}`} />
            </button>
          </div>
          <button
            onClick={() => { addToCart(product, qty, addOpts); navigate({ to: "/checkout" }); }}
            disabled={!selectionComplete || displayStock <= 0}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl border border-foreground bg-foreground/5 text-sm font-semibold uppercase tracking-wider hover:bg-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="inline h-4 w-4 mr-1" /> Buy now
          </button>

          <div className="mt-6">
            <TrustBadges items={TRUST_PRESETS.product} variant="grid" />
          </div>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex gap-1 border-b border-border overflow-x-auto no-scrollbar">
          {[["desc", "Description"], ["spec", "Specifications"], ["rev", `Reviews (${reviewItems.length})`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)} className={`shrink-0 px-4 py-3 text-sm font-medium uppercase tracking-wider transition ${tab === k ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="surface-card mt-4 p-4 sm:p-6">
          {tab === "desc" && (product.description ? <p className="leading-relaxed text-muted-foreground">{product.description}</p> : <p className="text-sm text-muted-foreground">No description provided.</p>)}
          {tab === "spec" && (Object.keys(product.specs).length > 0 ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border py-2 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
              ))}
            </dl>
          ) : <p className="text-sm text-muted-foreground">No specifications listed.</p>)}
          {tab === "rev" && (
            <div className="space-y-6">
              {reviewItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:gap-6 items-center">
                    <div className="text-center">
                      <div className="font-display text-4xl font-bold">{avgRating.toFixed(1)}</div>
                      <div className="flex justify-center mt-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? "fill-warning text-warning" : "text-muted"}`} />)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{reviewItems.length} review{reviewItems.length === 1 ? "" : "s"}</div>
                    </div>
                    <div className="space-y-1.5">
                      {dist.map((d) => (
                        <div key={d.star} className="flex items-center gap-3 text-xs">
                          <span className="w-6 text-muted-foreground">{d.star}★</span>
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-warning" style={{ width: `${d.pct}%` }} /></div>
                          <span className="w-8 text-right text-muted-foreground tabular-nums">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-5">
                    {reviewItems.map((r) => (
                      <div key={r.id} className="border-b border-border pb-5 last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{r.user}</span>
                          {r.verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                              <BadgeCheck className="h-3 w-3" /> Verified purchase
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />)}</span>
                          <span>{r.date}</span>
                        </div>
                        {r.title && <div className="mt-2 font-medium text-sm">{r.title}</div>}
                        {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {vendor && (
        <section className="mt-12">
          <h2 className="font-display text-xl sm:text-2xl font-bold">Sold by</h2>
          <Link to="/vendor/$slug" params={{ slug: vendor.slug }} className="surface-card mt-4 p-4 sm:p-5 hover-lift flex items-center gap-3">
            <img src={vendor.logo} alt={vendor.name} className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{vendor.name}</span>
                {vendor.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-foreground" />}
              </div>
              {vendor.description && <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{vendor.description}</div>}
            </div>
            <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Visit store</span>
          </Link>
        </section>
      )}

      <div className="fixed bottom-14 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur px-3 py-2.5 pb-safe lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-tight min-w-0 mr-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</span>
            <span className="font-bold truncate text-sm">{formatZAR(displayPrice)}</span>
          </div>
          <button onClick={() => { addToCart(product, qty, addOpts); toast.success("Added to cart"); }} disabled={!selectionComplete || displayStock <= 0} className="flex-1 inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-foreground bg-background px-3 text-sm font-semibold disabled:opacity-50">
            <ShoppingCart className="h-4 w-4" /> Add to cart
          </button>
          <button onClick={() => { addToCart(product, qty, addOpts); navigate({ to: "/checkout" }); }} disabled={!selectionComplete || displayStock <= 0} className="flex-1 inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Zap className="h-4 w-4" /> Buy now
          </button>
        </div>
      </div>
    </div>
  );
}