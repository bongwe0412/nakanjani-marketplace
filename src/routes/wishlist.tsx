import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, ShoppingCart, X, Eye, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatZAR, type Product } from "@/lib/mock-data";
import { loadProductsByIds } from "@/lib/products-data";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — NAKANJANI Marketplace" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadProductsByIds(wishlist).then((res) => {
      if (active) {
        setItems(res);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [wishlist]);

  return (
    <div className="pb-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Wishlist</h1>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{items.length} saved</span>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card mt-8 mx-auto max-w-md p-8 sm:p-10 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-foreground">
            <Heart className="h-9 w-9" strokeWidth={1.2} />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold tracking-tight">No saves yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tap the heart on any product to save it for later.</p>
          <Link to="/products" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] sm:w-auto sm:px-8">
            Discover products
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="surface-card group flex flex-col overflow-hidden">
              <div className="relative">
                <Link to="/product/$id" params={{ id: p.id }} className="block">
                  <img src={p.images[0]} loading="lazy" className="aspect-square w-full object-cover" alt={p.name} />
                </Link>
                <button
                  onClick={() => { toggleWishlist(p.id); toast("Removed from wishlist"); }}
                  aria-label="Remove from wishlist"
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.brand}</div>
                <Link to="/product/$id" params={{ id: p.id }} className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug hover:underline">{p.name}</Link>
                <div className="mt-1 text-sm sm:text-base font-bold tabular-nums">{formatZAR(p.price)}</div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => { addToCart(p); toast.success("Added to cart"); }}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)]">
                    <ShoppingCart className="h-4 w-4" /> Move to cart
                  </button>
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    aria-label="View product"
                    className="hidden sm:inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
