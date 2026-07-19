import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { loadCategories, loadPublicProducts } from "@/lib/products-data";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Search — NAKANJANI Marketplace" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const results = useQuery({
    queryKey: ["search", q ?? ""],
    queryFn: () => loadPublicProducts({ search: q, limit: 60 }),
    enabled: !!q,
  });
  const cats = useQuery({ queryKey: ["categories"], queryFn: loadCategories, staleTime: 5 * 60_000, enabled: !q });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Search results</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {q ? `"${q}" — ${results.data?.length ?? 0} matches` : "Enter a query above"}
      </p>

      {!q && (cats.data ?? []).length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          {cats.data!.slice(0, 8).map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="surface-card hover-lift p-5 text-center">
              {c.icon && <div className="text-3xl">{c.icon}</div>}
              <div className="mt-2 text-sm font-semibold">{c.name}</div>
            </Link>
          ))}
        </div>
      )}

      {q && (
        results.isLoading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (results.data ?? []).length === 0 ? (
          <div className="surface-card mt-8 p-12 text-center text-muted-foreground">No matches for "{q}".</div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )
      )}
    </div>
  );
}