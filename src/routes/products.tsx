import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Filter, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { loadCategories, loadBrands, loadPublicProducts } from "@/lib/products-data";

const search = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  sort: z.enum(["newest", "price-asc", "price-desc"]).optional(),
  inStock: z.boolean().optional(),
});

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "All products — NAKANJANI Marketplace" }] }),
  validateSearch: search,
  component: ProductsPage,
});

function ProductsPage() {
  const s = Route.useSearch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const set = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ to: "/products", search: { ...s, ...patch } as any });

  const cats = useQuery({ queryKey: ["categories"], queryFn: loadCategories, staleTime: 5 * 60_000 });
  const brands = useQuery({ queryKey: ["brands"], queryFn: loadBrands, staleTime: 5 * 60_000 });
  const products = useQuery({
    queryKey: ["products-list", s],
    queryFn: () => loadPublicProducts({
      search: s.q,
      categorySlug: s.category,
      orderBy: s.sort === "price-asc" || s.sort === "price-desc" ? s.sort : "newest",
      limit: 60,
    }),
  });

  let filtered = products.data ?? [];
  if (s.brand) filtered = filtered.filter((p) => p.brand.toLowerCase() === s.brand!.toLowerCase());
  if (s.min != null) filtered = filtered.filter((p) => p.price >= s.min!);
  if (s.max != null) filtered = filtered.filter((p) => p.price <= s.max!);
  if (s.inStock) filtered = filtered.filter((p) => p.stock > 0);

  const Sidebar = (
    <aside className="surface-card h-fit p-5 space-y-6">
      <div>
        <div className="text-sm font-semibold mb-3">Category</div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          <button onClick={() => set({ category: undefined })} className={`block w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-card ${!s.category ? "text-primary font-semibold" : "text-muted-foreground"}`}>All</button>
          {(cats.data ?? []).map((c) => (
            <button key={c.slug} onClick={() => set({ category: c.slug })} className={`block w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-card ${s.category === c.slug ? "text-primary font-semibold" : "text-muted-foreground"}`}>{c.icon ?? ""} {c.name}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold mb-3">Brand</div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          <button onClick={() => set({ brand: undefined })} className={`block w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-card ${!s.brand ? "text-primary font-semibold" : "text-muted-foreground"}`}>All brands</button>
          {(brands.data ?? []).map((b) => (
            <button key={b} onClick={() => set({ brand: b })} className={`block w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-card ${s.brand === b ? "text-primary font-semibold" : "text-muted-foreground"}`}>{b}</button>
          ))}
          {(brands.data ?? []).length === 0 && <div className="text-xs text-muted-foreground px-2">No brands yet</div>}
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold mb-3">Price (ZAR)</div>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" defaultValue={s.min} onBlur={(e) => set({ min: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input type="number" placeholder="Max" defaultValue={s.max} onBlur={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!s.inStock} onChange={(e) => set({ inStock: e.target.checked || undefined })} className="h-4 w-4 accent-primary" />
        In stock only
      </label>
      <button onClick={() => navigate({ to: "/products", search: {} })} className="w-full rounded-lg border border-border py-2 text-sm hover:border-primary">Clear filters</button>
    </aside>
  );

  return (
    <div>
      <div className="surface-card mb-6 flex flex-wrap items-center gap-3 p-4">
        <h1 className="font-display text-xl font-bold">All products</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} results</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            defaultValue={s.q}
            onBlur={(e) => set({ q: e.target.value || undefined })}
            placeholder="Search..."
            className="hidden sm:block rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select value={s.sort || "newest"} onChange={(e) => set({ sort: e.target.value as any })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="newest">Newest</option>
            <option value="price-asc">Lowest price</option>
            <option value="price-desc">Highest price</option>
          </select>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm lg:hidden"><Filter className="h-4 w-4" />Filters</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">{Sidebar}</div>
        <div>
          {products.isLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="surface-card p-12 text-center text-muted-foreground">No products match these filters. <Link to="/products" search={{}} className="text-primary">Reset</Link></div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Filters</div>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-card"><X className="h-4 w-4" /></button>
            </div>
            {Sidebar}
          </div>
        </div>
      )}
    </div>
  );
}