import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { useStore } from "@/lib/store";
import {
  loadCategories,
  loadProductsByIds,
  loadPublicProducts,
  loadVendors,
} from "@/lib/products-data";
import type { Product } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "NAKANJANI Marketplace — South Africa's curated multi-vendor store" }] }),
  component: Home,
});

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <div className="surface-card p-8 text-center text-sm text-muted-foreground">{label}</div>;
}

function Home() {
  const { recentlyViewed, userId } = useStore();
  const featured = useQuery({ queryKey: ["home-featured"], queryFn: () => loadPublicProducts({ featured: true, limit: 8 }) });
  const newest = useQuery({ queryKey: ["home-newest"], queryFn: () => loadPublicProducts({ orderBy: "newest", limit: 8 }) });
  const trending = useQuery({ queryKey: ["home-trending"], queryFn: () => loadPublicProducts({ orderBy: "trending", limit: 8 }) });
  const deals = useQuery({ queryKey: ["home-deals"], queryFn: () => loadPublicProducts({ onSale: true, limit: 8 }) });
  const categories = useQuery({ queryKey: ["home-categories"], queryFn: loadCategories });
  const vendors = useQuery({ queryKey: ["home-vendors"], queryFn: () => loadVendors(6) });

  const [recentItems, setRecentItems] = useState<Product[]>([]);
  useEffect(() => {
    let active = true;
    if (!userId || recentlyViewed.length === 0) { setRecentItems([]); return; }
    loadProductsByIds(recentlyViewed.slice(0, 8)).then((res) => { if (active) setRecentItems(res); });
    return () => { active = false; };
  }, [userId, recentlyViewed]);

  return (
    <div className="space-y-2">
      <section className="relative overflow-hidden rounded-2xl border border-border md:rounded-3xl" style={{ background: "var(--gradient-hero)" }}>
        <div className="grid gap-6 px-5 py-10 md:px-12 md:py-16">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> NAKANJANI Marketplace
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl md:text-6xl">Discover South African brands you'll love</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-lg">Independent vendors. Verified storefronts. Secure checkout.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/products" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground btn-glow hover:bg-[var(--primary-hover)]">
                Shop all products <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/vendors" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 px-5 py-3 text-sm font-semibold hover:border-primary">
                Browse vendors
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Section title="Shop by category" subtitle="Browse curated departments">
        {(categories.data ?? []).length === 0 ? <EmptyHint label="No categories yet." /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {categories.data!.map((c) => (
              <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="surface-card group hover-lift overflow-hidden">
                <div className="aspect-square overflow-hidden bg-surface">
                  {c.image && <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                </div>
                <div className="p-2.5 text-center">
                  {c.icon && <div className="text-lg">{c.icon}</div>}
                  <div className="mt-0.5 truncate text-xs font-medium">{c.name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="Featured products" subtitle="Hand-picked by vendors" action={<Link to="/products" className="text-sm text-primary hover:underline">View all</Link>}>
        {(featured.data ?? []).length === 0 ? <EmptyHint label="No featured products yet." /> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </Section>

      <Section title="New arrivals" subtitle="The latest from our vendors">
        {(newest.data ?? []).length === 0 ? <EmptyHint label="No products yet — check back soon." /> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newest.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </Section>

      <Section title="Trending now" subtitle="What shoppers are viewing">
        {(trending.data ?? []).length === 0 ? <EmptyHint label="No trending products yet." /> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trending.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </Section>

      <Section title="On sale" subtitle="Discounted right now" action={<Link to="/deals" className="text-sm text-primary hover:underline">All deals</Link>}>
        {(deals.data ?? []).length === 0 ? <EmptyHint label="No deals right now." /> : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {deals.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </Section>

      <Section title="Featured vendors" subtitle="Verified storefronts you can trust" action={<Link to="/vendors" className="text-sm text-primary hover:underline">All vendors</Link>}>
        {(vendors.data ?? []).length === 0 ? <EmptyHint label="No vendors yet." /> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendors.data!.map((v) => (
              <Link key={v.slug} to="/vendor/$slug" params={{ slug: v.slug }} className="surface-card hover-lift overflow-hidden flex">
                <img src={v.logo} alt="" className="h-24 w-24 shrink-0 object-cover" />
                <div className="min-w-0 p-4">
                  <div className="font-display text-base font-bold truncate">{v.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {recentItems.length > 0 && (
        <Section title="Recently viewed" subtitle="Pick up where you left off">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentItems.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </Section>
      )}
    </div>
  );
}