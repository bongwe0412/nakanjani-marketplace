import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { loadCategories, loadPublicProducts } from "@/lib/products-data";
import { supabase } from "@/integrations/supabase/client";

async function loadCategory(slug: string) {
  const { data } = await supabase
    .from("categories")
    .select("slug, name, icon, image_url, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const cat = await loadCategory(params.slug);
    if (!cat) throw notFound();
    return { category: cat };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.category.name} — NAKANJANI Marketplace` },
      { name: "description", content: loaderData.category.description ?? `Shop ${loaderData.category.name} from trusted vendors.` },
    ] : [],
  }),
  notFoundComponent: () => (
    <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
      <h2 className="font-display text-lg font-bold">Category not found</h2>
      <p className="mt-1 text-sm text-muted-foreground">It may have been removed.</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
      <h2 className="font-display text-lg font-bold">Couldn't load category</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const products = useQuery({
    queryKey: ["category-products", category.slug],
    queryFn: () => loadPublicProducts({ categorySlug: category.slug, limit: 60 }),
  });
  const others = useQuery({ queryKey: ["categories"], queryFn: loadCategories, staleTime: 5 * 60_000 });

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-border" style={{ background: "var(--gradient-hero)" }}>
        <div className="grid gap-6 px-6 py-10 md:px-12 md:py-16">
          <div className="flex flex-col justify-center">
            {category.icon && <div className="text-5xl">{category.icon}</div>}
            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{category.name}</h1>
            {category.description && <p className="mt-3 max-w-md text-muted-foreground">{category.description}</p>}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold">All {category.name}</h2>
        {products.isLoading ? (
          <div className="flex min-h-[20vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (products.data ?? []).length === 0 ? (
          <div className="surface-card mt-4 p-12 text-center text-muted-foreground">No products in this category yet.</div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {(others.data ?? []).filter((c) => c.slug !== category.slug).length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Explore more categories</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {others.data!.filter((c) => c.slug !== category.slug).slice(0, 6).map((c) => (
              <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="surface-card hover-lift p-4 text-center">
                {c.icon && <div className="text-2xl">{c.icon}</div>}
                <div className="mt-1 text-xs font-medium">{c.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}