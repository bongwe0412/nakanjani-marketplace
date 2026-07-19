import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Users, Heart, BadgeCheck, Clock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { loadPublicProducts, loadVendorBySlug } from "@/lib/products-data";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/$slug")({
  loader: async ({ params }) => {
    const vendor = await loadVendorBySlug(params.slug);
    if (!vendor) throw notFound();
    return { vendor };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.vendor.name} — NAKANJANI Marketplace` },
      { name: "description", content: loaderData.vendor.description || `Shop ${loaderData.vendor.name} on NAKANJANI.` },
      { property: "og:image", content: loaderData.vendor.banner },
    ] : [],
  }),
  notFoundComponent: () => (
    <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
      <h2 className="font-display text-lg font-bold">Vendor not found</h2>
      <p className="mt-1 text-sm text-muted-foreground">It may have been removed.</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
      <h2 className="font-display text-lg font-bold">Couldn't load vendor</h2>
      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: VendorPage,
});

function VendorPage() {
  const { vendor } = Route.useLoaderData();
  const { userId } = useStore();
  const [following, setFollowing] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const products = useQuery({
    queryKey: ["vendor-products", vendor.slug],
    queryFn: () => loadPublicProducts({ vendorSlug: vendor.slug, limit: 60 }),
  });

  // Resolve vendor uuid for follow operations
  useEffect(() => {
    void supabase.from("vendors").select("id").eq("slug", vendor.slug).maybeSingle().then(({ data }) => {
      setVendorId(data?.id ?? null);
    });
  }, [vendor.slug]);

  useEffect(() => {
    if (!userId || !vendorId) { setFollowing(false); return; }
    void supabase.from("vendor_followers").select("user_id").eq("vendor_id", vendorId).eq("user_id", userId).maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [userId, vendorId]);

  const toggleFollow = async () => {
    if (!userId) { toast.error("Sign in to follow vendors"); return; }
    if (!vendorId) return;
    if (following) {
      const { error } = await supabase.from("vendor_followers").delete().eq("vendor_id", vendorId).eq("user_id", userId);
      if (!error) setFollowing(false);
    } else {
      const { error } = await supabase.from("vendor_followers").insert({ vendor_id: vendorId, user_id: userId });
      if (!error) setFollowing(true);
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-border">
        <img src={vendor.banner} alt="" className="h-48 w-full object-cover md:h-64" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </section>

      <div className="-mt-12 relative px-2 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:px-4">
        <img src={vendor.logo} alt="" className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-4 border-background object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold break-words">{vendor.name}</h1>
            {vendor.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-background">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {vendor.rating > 0 && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" />{vendor.rating.toFixed(1)}</span>}
            <span className="flex items-center gap-1"><Users className="h-4 w-4" />{vendor.followers.toLocaleString()} followers</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Since {vendor.memberSince}</span>
          </div>
        </div>
        <button onClick={toggleFollow} className={`w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold uppercase tracking-wider ${following ? "border border-border" : "bg-primary text-primary-foreground btn-glow hover:bg-[var(--primary-hover)]"}`}>
          <Heart className={`h-4 w-4 ${following ? "fill-destructive text-destructive" : ""}`} />
          {following ? "Following" : "Follow store"}
        </button>
      </div>

      {vendor.description && <p className="mt-4 max-w-2xl text-muted-foreground">{vendor.description}</p>}

      <section className="mt-10">
        <h2 className="font-display text-xl sm:text-2xl font-bold">Store products</h2>
        {products.isLoading ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (products.data ?? []).length === 0 ? (
          <div className="surface-card mt-4 p-12 text-center text-muted-foreground">No products listed yet.</div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.data!.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}