import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tag, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { loadPublicProducts } from "@/lib/products-data";

export const Route = createFileRoute("/deals")({
  head: () => ({ meta: [{ title: "Deals — NAKANJANI Marketplace" }] }),
  component: DealsPage,
});

function DealsPage() {
  const deals = useQuery({ queryKey: ["deals"], queryFn: () => loadPublicProducts({ onSale: true, limit: 60 }) });

  return (
    <div>
      <section className="surface-card relative overflow-hidden p-8 md:p-12">
        <div className="absolute inset-0 bg-secondary" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-1 text-xs font-semibold text-destructive"><Tag className="h-3 w-3" /> Live deals</span>
          <h1 className="mt-4 font-display text-4xl font-bold md:text-5xl">Deals & discounts</h1>
          <p className="mt-3 text-muted-foreground">Every product here is marked down right now.</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold">All deals</h2>
        {deals.isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (deals.data ?? []).length === 0 ? (
          <div className="surface-card mt-4 p-12 text-center text-muted-foreground">No deals right now — check back soon.</div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {deals.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}