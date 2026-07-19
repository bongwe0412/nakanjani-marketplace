import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star, BadgeCheck, TrendingUp } from "lucide-react";
import { formatZAR, type Product } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, wishlist } = useStore();
  const inWish = wishlist.includes(product.id);
  const discount = product.originalPrice
    ? Math.round(100 - (product.price / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group surface-card hover-lift overflow-hidden flex flex-col">
      <Link to="/product/$id" params={{ id: product.id }} className="relative block aspect-square overflow-hidden bg-surface">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-destructive-foreground">
              -{discount}%
            </span>
          )}
          {product.tags.includes("trending") && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/90 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-foreground">
              <TrendingUp className="h-2.5 w-2.5" /> Trending
            </span>
          )}
          {product.tags.includes("new") && (
            <span className="rounded-full bg-success px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-success-foreground">
              New
            </span>
          )}
        </div>
        {/* Wishlist always visible; Quick view on hover (desktop) */}
        <button
          onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full glass text-foreground hover:text-destructive"
          aria-label="Wishlist"
        >
          <Heart className={`h-4 w-4 ${inWish ? "fill-destructive text-destructive" : ""}`} />
        </button>
        {/* Mobile add-to-cart on image overlay (no hover needed) */}
        <button
          onClick={(e) => { e.preventDefault(); addToCart(product); toast.success("Added to cart", { description: product.name }); }}
          className="md:hidden absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-foreground/90 text-background shadow-md"
          aria-label="Add to cart"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate uppercase tracking-wider">{product.brand}</div>
        <Link to="/product/$id" params={{ id: product.id }} className="mt-1 line-clamp-2 text-[13px] sm:text-sm font-medium leading-snug hover:text-primary min-h-[2.4em]">
          {product.name}
        </Link>
        {product.vendor && (
          <Link to="/vendor/$slug" params={{ slug: product.vendor }} className="mt-0.5 inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground hover:text-foreground">
            <span className="truncate">by <span className="capitalize">{product.vendorName ?? product.vendor.replace(/-/g, " ")}</span></span>
            {product.vendorVerified && (
              <BadgeCheck className="h-3 w-3 shrink-0 text-foreground" aria-label="Verified vendor" />
            )}
          </Link>
        )}
        {product.reviews > 0 && (
          <div className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-warning text-warning shrink-0" />
            <span className="text-foreground">{product.rating.toFixed(1)}</span>
            <span className="truncate">({product.reviews})</span>
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm sm:text-lg font-bold">{formatZAR(product.price)}</span>
          {product.originalPrice && (
            <span className="text-[11px] sm:text-xs text-muted-foreground line-through">{formatZAR(product.originalPrice)}</span>
          )}
        </div>
        {/* Add to cart button (hidden on smallest mobile — overlay button on image is used instead) */}
        <button
          onClick={() => { addToCart(product); toast.success("Added to cart", { description: product.name }); }}
          className="mt-2.5 hidden sm:inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-[var(--primary-hover)]"
        >
          <ShoppingCart className="h-4 w-4" /> Add to cart
        </button>
      </div>
    </div>
  );
}
