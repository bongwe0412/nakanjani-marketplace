import { Link, useRouter } from "@tanstack/react-router";
import { Search, ShoppingCart, Heart, User, Menu, X, Home, Grid3x3, ChevronRight, ChevronDown, Clock, Package, LogOut, LogIn, UserPlus, Store, ShieldCheck, LayoutDashboard, Settings, ClipboardList } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadCategories, loadProductsByIds } from "@/lib/products-data";
import type { Product } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RECENT_KEY = "sm_recent_searches";

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const router = useRouter();
  const { recentlyViewed } = useStore();
  const { data: categories = [] } = useQuery({ queryKey: ["nav-categories"], queryFn: loadCategories, staleTime: 5 * 60_000, enabled: open });
  const { data: recentProducts = [] } = useQuery<Product[]>({
    queryKey: ["recent-viewed-products", recentlyViewed.slice(0, 4)],
    queryFn: () => loadProductsByIds(recentlyViewed.slice(0, 4)),
    enabled: open && recentlyViewed.length > 0,
  });

  useEffect(() => {
    if (!open) return;
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")); } catch { setRecent([]); }
  }, [open]);

  if (!open) return null;

  const submit = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
    router.navigate({ to: "/search", search: { q: term } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 sm:bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto" onClick={onClose}>
      <div className="mx-auto sm:mt-16 max-w-3xl px-3 sm:px-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 -mx-3 sm:mx-0 px-3 sm:px-0 pt-3 pb-3 bg-background/95 backdrop-blur sm:bg-transparent sm:pt-0">
          <div className="surface-card p-2">
            <form onSubmit={(e) => { e.preventDefault(); submit(q); }} className="flex items-center gap-2">
              <Search className="ml-3 h-5 w-5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
              />
              <button type="button" onClick={onClose} aria-label="Close search" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-muted shrink-0"><X className="h-4 w-4" /></button>
            </form>
          </div>
        </div>

        <div className="mt-3 surface-card p-4 sm:p-5 space-y-5">
          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Recent searches</div>
                <button onClick={() => { setRecent([]); try { localStorage.removeItem(RECENT_KEY); } catch {} }} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.map((t) => (
                  <button key={t} onClick={() => submit(t)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm hover:border-foreground">{t}</button>
                ))}
              </div>
            </div>
          )}

          {categories.length > 0 && <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular categories</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {categories.slice(0, 8).map((c) => (
                <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} onClick={onClose} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm hover:border-foreground">
                  {c.icon && <span>{c.icon}</span>}{c.name}
                </Link>
              ))}
            </div>
          </div>}

          {recentProducts.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently viewed</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {recentProducts.map((p) => (
                  <Link key={p.id} to="/product/$id" params={{ id: p.id }} onClick={onClose} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2 hover:border-foreground">
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.brand}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wishlist, recentlyViewed, userId } = useStore();
  const { isAdmin, vendorStatus, isVendor, isPendingVendor } = useUserRole();
  const router = useRouter();
  const [catsOpen, setCatsOpen] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ["nav-categories"], queryFn: loadCategories, staleTime: 5 * 60_000, enabled: open });
  const { data: recentProducts = [] } = useQuery<Product[]>({
    queryKey: ["recent-viewed-products-menu", recentlyViewed.slice(0, 3)],
    queryFn: () => loadProductsByIds(recentlyViewed.slice(0, 3)),
    enabled: open && recentlyViewed.length > 0,
  });
  if (!open) return null;

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    onClose();
    router.navigate({ to: "/" });
  }

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-surface border-r border-border overflow-y-auto animate-fade-in flex flex-col">
        {/* Profile header */}
        <div className="bg-black text-white px-5 pt-5 pb-6">
          <div className="flex items-center justify-between">
            <Link to="/" onClick={onClose} className="font-display text-lg tracking-[0.18em]">NAKANJANI</Link>
            <button onClick={onClose} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
          {userId ? (
            <Link to="/account" onClick={onClose} className="mt-5 flex items-center gap-3 group">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 border border-white/20 text-white">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">My account</div>
                <div className="text-[11px] text-white/60 group-hover:text-white">View profile →</div>
              </div>
            </Link>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link to="/auth" search={{ mode: "signin" }} onClick={onClose} className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-black hover:bg-white/90">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
              <Link to="/auth" search={{ mode: "signup" }} onClick={onClose} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/30 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
                <UserPlus className="h-4 w-4" /> Register
              </Link>
            </div>
          )}
        </div>

        <div className="p-5 flex-1">
          {/* Auth-aware account links */}
          <div className="mb-5 space-y-0.5">
            {userId ? (
              <>
                <Link to="/account" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                  <LayoutDashboard className="h-4 w-4" /><span className="text-sm font-medium">Dashboard</span>
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                    <ShieldCheck className="h-4 w-4" /><span className="text-sm font-medium">Admin dashboard</span>
                  </Link>
                )}
                {isVendor && (
                  <>
                    <Link to="/vendor/dashboard" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <Store className="h-4 w-4" /><span className="text-sm font-medium">Vendor dashboard</span>
                    </Link>
                    <Link to="/vendor/products" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <Package className="h-4 w-4" /><span className="text-sm font-medium">Vendor products</span>
                    </Link>
                    <Link to="/vendor/orders" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <ClipboardList className="h-4 w-4" /><span className="text-sm font-medium">Vendor orders</span>
                    </Link>
                    <Link to="/vendor/settings" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <Settings className="h-4 w-4" /><span className="text-sm font-medium">Vendor settings</span>
                    </Link>
                  </>
                )}
                {isPendingVendor && (
                  <Link to="/vendor/apply" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                    <Store className="h-4 w-4" /><span className="text-sm font-medium">Application status (pending)</span>
                  </Link>
                )}
                {!isVendor && !isPendingVendor && !isAdmin && (
                  <>
                    <Link to="/orders" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <Package className="h-4 w-4" /><span className="text-sm font-medium">Orders</span>
                    </Link>
                    <Link to="/wishlist" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <Heart className="h-4 w-4" /><span className="text-sm font-medium">Wishlist</span>
                    </Link>
                    <Link to="/vendor/apply" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                      <Store className="h-4 w-4" /><span className="text-sm font-medium">Become a vendor</span>
                    </Link>
                  </>
                )}
                {vendorStatus === "rejected" || vendorStatus === "suspended" ? (
                  <Link to="/vendor/apply" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                    <Store className="h-4 w-4" /><span className="text-sm font-medium">Vendor application ({vendorStatus})</span>
                  </Link>
                ) : null}
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card text-left">
                  <LogOut className="h-4 w-4" /><span className="text-sm font-medium">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "signin" }} onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                  <LogIn className="h-4 w-4" /><span className="text-sm font-medium">Sign in</span>
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                  <UserPlus className="h-4 w-4" /><span className="text-sm font-medium">Register</span>
                </Link>
                <Link to="/vendor/apply" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-card">
                  <Store className="h-4 w-4" /><span className="text-sm font-medium">Become a vendor</span>
                </Link>
              </>
            )}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-2">
            <Link to="/account" onClick={onClose} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-3 text-center">
              <Package className="h-4 w-4" /><span className="text-[11px]">Orders</span>
            </Link>
            <Link to="/wishlist" onClick={onClose} className="relative flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-3 text-center">
              <Heart className="h-4 w-4" /><span className="text-[11px]">Wishlist</span>
              {wishlist.length > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[9px] font-medium text-white">{wishlist.length}</span>}
            </Link>
            <Link to="/account" onClick={onClose} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-3 text-center">
              <Clock className="h-4 w-4" /><span className="text-[11px]">Recent</span>
            </Link>
          </div>

          {/* Primary nav */}
          <div className="mt-6 space-y-0.5">
            {[
              { to: "/", label: "Home" },
              { to: "/products", label: "Shop all" },
              { to: "/deals", label: "Deals" },
              { to: "/vendors", label: "Vendors" },
              { to: "/products", search: { sort: "newest" }, label: "New arrivals" },
              { to: "/products", search: { sort: "best" }, label: "Best sellers" },
            ].map((l, i) => (
              <Link key={i} to={l.to as any} search={l.search as any} onClick={onClose} className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-card">
                <span className="text-sm font-medium">{l.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}

            {/* Collapsible categories */}
            <button onClick={() => setCatsOpen((o) => !o)} className="w-full flex items-center justify-between rounded-lg px-3 py-3 hover:bg-card">
              <span className="text-sm font-medium">Categories</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${catsOpen ? "rotate-180" : ""}`} />
            </button>
            {catsOpen && (
              <div className="ml-2 border-l border-border pl-2 space-y-0.5">
                {categories.map((c) => (
                  <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-card">
                    {c.icon && <span>{c.icon}</span>}<span className="text-sm">{c.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recently viewed */}
          {recentProducts.length > 0 && (
            <div className="mt-6">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Recently viewed</div>
              <div className="mt-2 space-y-1">
                {recentProducts.map((p) => (
                  <Link key={p.id} to="/product/$id" params={{ id: p.id }} onClick={onClose} className="flex items-center gap-3 rounded-lg p-2 hover:bg-card">
                    <img src={p.images[0]} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.brand}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Support */}
          <div className="mt-6 pt-4 border-t border-border space-y-0.5">
            <Link to="/support/faq" onClick={onClose} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-card">
              <span className="text-sm text-muted-foreground">Help center</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/support/contact" onClick={onClose} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-card">
              <span className="text-sm text-muted-foreground">Contact us</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const navRef = useRef<HTMLDivElement>(null);
  const { cartCount, wishlist, userId } = useStore();
  const { isAdmin, vendorStatus, isVendor, isPendingVendor } = useUserRole();
  const router = useRouter();
  const { data: categories = [] } = useQuery({ queryKey: ["nav-categories"], queryFn: loadCategories, staleTime: 5 * 60_000 });

  async function handleHeaderSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    toast.success("Signed out");
    router.navigate({ to: "/" });
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    const el = navRef.current;
    const update = () => setNavHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <div ref={navRef} className={`fixed top-0 inset-x-0 z-50 bg-background transition-shadow duration-200 ${scrolled ? "shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]" : ""}`}>
      {/* Announcement bar */}
      <div className="bg-black text-white text-center text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.18em] py-1.5 sm:py-2.5 px-4 truncate">
        <span className="sm:hidden">Free returns · Nationwide shipping</span>
        <span className="hidden sm:inline">Nationwide shipping across South Africa · Complimentary returns within 30 days</span>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          <div className="flex h-14 lg:h-20 items-center gap-2 sm:gap-3">
            <button onClick={() => setMenuOpen(true)} aria-label="Menu" className="grid h-11 w-11 place-items-center rounded-sm hover:bg-secondary lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-2 shrink-0 mx-auto lg:mx-0">
              <span className="font-display text-lg sm:text-xl lg:text-2xl font-medium tracking-[0.14em] sm:tracking-[0.18em] text-foreground">NAKANJANI</span>
            </Link>
            <nav className="hidden items-center gap-6 lg:flex ml-8">
              <Link to="/" className="nav-label text-foreground hover:text-black hover:underline underline-offset-8 decoration-1">Home</Link>
              <Link to="/products" className="nav-label text-foreground hover:text-black hover:underline underline-offset-8 decoration-1">Shop</Link>
              <Link to="/deals" className="nav-label text-foreground hover:text-black hover:underline underline-offset-8 decoration-1">Sale</Link>
              <Link to="/vendors" className="nav-label text-foreground hover:text-black hover:underline underline-offset-8 decoration-1">Vendors</Link>
            </nav>

            <button
              onClick={() => setSearchOpen(true)}
              className="ml-auto hidden flex-1 max-w-md items-center gap-3 rounded-sm border border-border bg-background px-4 py-2.5 text-left text-sm text-muted-foreground hover:border-foreground md:flex"
            >
              <Search className="h-4 w-4" />
              Search NAKANJANI
            </button>

            <div className="ml-auto md:ml-0 flex items-center gap-0.5 sm:gap-1">
              <button onClick={() => setSearchOpen(true)} aria-label="Search" className="grid h-11 w-11 place-items-center rounded-sm hover:bg-secondary md:hidden">
                <Search className="h-5 w-5" />
              </button>
              <Link to="/wishlist" aria-label="Wishlist" className="relative hidden h-10 w-10 place-items-center rounded-sm hover:bg-secondary md:grid">
                <Heart className="h-5 w-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[10px] font-medium text-white">{wishlist.length}</span>
                )}
              </Link>
              {userId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button aria-label="Account menu" className="hidden h-10 w-10 place-items-center rounded-sm hover:bg-secondary md:grid">
                      <User className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/account"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild><Link to="/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin dashboard</Link></DropdownMenuItem>
                    )}
                    {isVendor && (
                      <>
                        <DropdownMenuItem asChild><Link to="/vendor/dashboard"><Store className="mr-2 h-4 w-4" />Vendor dashboard</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/vendor/products"><Package className="mr-2 h-4 w-4" />Vendor products</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/vendor/orders"><ClipboardList className="mr-2 h-4 w-4" />Vendor orders</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/vendor/settings"><Settings className="mr-2 h-4 w-4" />Vendor settings</Link></DropdownMenuItem>
                      </>
                    )}
                    {isPendingVendor && (
                      <DropdownMenuItem asChild><Link to="/vendor/apply"><Store className="mr-2 h-4 w-4" />Application status (pending)</Link></DropdownMenuItem>
                    )}
                    {!isVendor && !isPendingVendor && !isAdmin && (
                      <>
                        <DropdownMenuItem asChild><Link to="/orders"><Package className="mr-2 h-4 w-4" />Orders</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/wishlist"><Heart className="mr-2 h-4 w-4" />Wishlist</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to="/vendor/apply"><Store className="mr-2 h-4 w-4" />Become a vendor</Link></DropdownMenuItem>
                      </>
                    )}
                    {(vendorStatus === "rejected" || vendorStatus === "suspended") && (
                      <DropdownMenuItem asChild><Link to="/vendor/apply"><Store className="mr-2 h-4 w-4" />Vendor application ({vendorStatus})</Link></DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleHeaderSignOut}><LogOut className="mr-2 h-4 w-4" />Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden md:flex items-center gap-1.5 ml-1">
                  <Link to="/auth" search={{ mode: "signin" }} className="nav-label rounded-sm px-3 py-2 text-foreground hover:bg-secondary">
                    Sign in
                  </Link>
                  <Link to="/auth" search={{ mode: "signup" }} className="nav-label rounded-sm bg-black px-3 py-2 text-white hover:bg-black/85">
                    Register
                  </Link>
                  <Link to="/vendor/apply" className="nav-label rounded-sm border border-border px-3 py-2 text-foreground hover:bg-secondary">
                    Become a vendor
                  </Link>
                </div>
              )}
              <Link to="/cart" aria-label="Cart" className="relative grid h-11 w-11 lg:h-10 lg:w-10 place-items-center rounded-sm hover:bg-secondary">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 lg:-right-0.5 lg:-top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[10px] font-medium text-white">{cartCount}</span>
                )}
              </Link>
            </div>
          </div>

          {/* Category strip (desktop) */}
          {categories.length > 0 && <div className="hidden no-scrollbar overflow-x-auto lg:block border-t border-border">
            <div className="flex items-center gap-6 py-3">
              {categories.map((c) => (
                <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="nav-label shrink-0 text-muted-foreground hover:text-foreground">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>}
        </div>

        {/* Category strip (mobile) — horizontally scrollable */}
        {categories.length > 0 && <div className="lg:hidden border-t border-border bg-background">
          <div className="no-scrollbar overflow-x-auto">
            <div className="flex items-center gap-1.5 px-3 py-2">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground"
                >
                  {c.icon && <span>{c.icon}</span>}
                  <span>{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>}
      </header>
      </div>

      <div aria-hidden style={{ height: navHeight }} />

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="mt-24 bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 md:grid md:gap-10 md:grid-cols-4">
          <div className="hidden md:block">
            <div className="font-display text-2xl tracking-[0.18em]">NAKANJANI</div>
            <p className="mt-4 text-sm text-white/60 leading-relaxed">A premium South African multi-vendor marketplace for fashion, lifestyle, technology and home.</p>
          </div>
          <div className="md:hidden mb-6">
            <div className="font-display text-2xl tracking-[0.18em]">NAKANJANI</div>
            <p className="mt-3 text-sm text-white/60 leading-relaxed">A premium South African marketplace for fashion, lifestyle, technology and home.</p>
          </div>

          <details className="group border-b border-white/10 md:border-0 md:open" open>
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 md:py-0 md:cursor-default">
              <span className="nav-label text-white">Shop</span>
              <span className="md:hidden text-white/60 transition group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <ul className="pb-4 md:mt-4 space-y-3 text-sm text-white/60">
              <li><Link to="/products" className="block py-1 hover:text-white">All products</Link></li>
              <li><Link to="/deals" className="block py-1 hover:text-white">Sale</Link></li>
              <li><Link to="/vendors" className="block py-1 hover:text-white">Vendors</Link></li>
              <li><Link to="/wishlist" className="block py-1 hover:text-white">Wishlist</Link></li>
            </ul>
          </details>

          <details className="group border-b border-white/10 md:border-0">
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 md:py-0 md:cursor-default">
              <span className="nav-label text-white">Client services</span>
              <span className="md:hidden text-white/60 transition group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <ul className="pb-4 md:mt-4 space-y-3 text-sm text-white/60">
              <li><Link to="/support/contact" className="block py-1 hover:text-white">Contact us</Link></li>
              <li><Link to="/support/faq" className="block py-1 hover:text-white">FAQ</Link></li>
              <li><Link to="/support/returns" className="block py-1 hover:text-white">Returns</Link></li>
              <li><Link to="/support/shipping" className="block py-1 hover:text-white">Shipping</Link></li>
              <li><Link to="/support/terms" className="block py-1 hover:text-white">Terms</Link></li>
              <li><Link to="/support/privacy" className="block py-1 hover:text-white">Privacy</Link></li>
            </ul>
          </details>

          <details className="group border-b border-white/10 md:border-0" open>
            <summary className="flex cursor-pointer list-none items-center justify-between py-4 md:py-0 md:cursor-default">
              <span className="nav-label text-white">Newsletter</span>
              <span className="md:hidden text-white/60 transition group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <div className="pb-4 md:pb-0">
              <p className="md:mt-4 text-sm text-white/60">Subscribe for new collections, exclusive previews and member benefits.</p>
              <form onSubmit={(e) => e.preventDefault()} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input type="email" placeholder="you@example.com" className="min-w-0 flex-1 rounded-sm border border-white/20 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-white/40 focus:border-white" />
                <button className="rounded-sm bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90">Join</button>
              </form>
            </div>
          </details>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40 tracking-wider">© 2026 NAKANJANI Marketplace · All rights reserved</div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <Link to="/" className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-12 text-[10px] uppercase tracking-wider text-muted-foreground" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>
          <Home className="h-5 w-5" />Home
        </Link>
        <Link to="/products" className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-12 text-[10px] uppercase tracking-wider text-muted-foreground" activeProps={{ className: "text-foreground" }}>
          <Grid3x3 className="h-5 w-5" />Shop
        </Link>
        <button onClick={() => setSearchOpen(true)} aria-label="Search" className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-12 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Search className="h-5 w-5" />Search
        </button>
        <Link to="/wishlist" className="relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-12 text-[10px] uppercase tracking-wider text-muted-foreground" activeProps={{ className: "text-foreground" }}>
          <Heart className="h-5 w-5" />Wishlist
          {wishlist.length > 0 && <span className="absolute top-1.5 right-[calc(50%-18px)] grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[9px] font-medium text-white">{wishlist.length}</span>}
        </Link>
        <Link to="/account" className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-12 text-[10px] uppercase tracking-wider text-muted-foreground" activeProps={{ className: "text-foreground" }}>
          <User className="h-5 w-5" />Account
        </Link>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
