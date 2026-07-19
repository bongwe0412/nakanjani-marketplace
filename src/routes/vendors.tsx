import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, Users, Loader2, Store, ShieldCheck, ArrowRight } from "lucide-react";
import { loadVendors } from "@/lib/products-data";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/vendors")({
  head: () => ({ meta: [{ title: "Vendors — NAKANJANI Marketplace" }] }),
  component: VendorsPage,
});

function VendorsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["vendors"], queryFn: () => loadVendors(48) });
  const { userId } = useStore();
  const { isAdmin, isVendor, isPendingVendor, vendorStatus } = useUserRole();

  return (
    <div>
      <VendorCta
        userId={userId}
        isAdmin={isAdmin}
        isVendor={isVendor}
        isPendingVendor={isPendingVendor}
        vendorStatus={vendorStatus}
      />
      <h1 className="font-display text-3xl font-bold">Verified vendors</h1>
      <p className="mt-1 text-sm text-muted-foreground">Approved storefronts on NAKANJANI</p>
      {isLoading ? (
        <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <div className="surface-card mt-8 p-12 text-center text-muted-foreground">No vendors yet.</div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {data!.map((v) => (
            <Link key={v.slug} to="/vendor/$slug" params={{ slug: v.slug }} className="surface-card hover-lift overflow-hidden">
              <div className="relative h-32 overflow-hidden bg-surface">
                <img src={v.banner} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center gap-4 p-5">
                <img src={v.logo} className="h-14 w-14 rounded-xl border border-border object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg font-bold truncate">{v.name}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {v.rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{v.rating.toFixed(1)}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{v.followers.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{v.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function VendorCta({
  userId,
  isAdmin,
  isVendor,
  isPendingVendor,
  vendorStatus,
}: {
  userId: string | null;
  isAdmin: boolean;
  isVendor: boolean;
  isPendingVendor: boolean;
  vendorStatus: string;
}) {
  // Approved vendors: show open dashboard
  if (isVendor) {
    return (
      <div className="mb-8 surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6" />
          <div>
            <div className="font-display text-lg font-semibold">You're a verified vendor</div>
            <p className="text-sm text-muted-foreground">Manage products, orders and settings.</p>
          </div>
        </div>
        <Link to="/vendor/dashboard" className="inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/85">
          Open vendor dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Admin: show admin link
  if (isAdmin) {
    return (
      <div className="mb-8 surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6" />
          <div>
            <div className="font-display text-lg font-semibold">Admin access</div>
            <p className="text-sm text-muted-foreground">Review vendor applications and marketplace activity.</p>
          </div>
        </div>
        <Link to="/admin" className="inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-black/85">
          Admin dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Pending application
  if (isPendingVendor) {
    return (
      <div className="mb-8 surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-display text-lg font-semibold">Your application is under review</div>
          <p className="text-sm text-muted-foreground">We'll notify you once a decision is made.</p>
        </div>
        <Link to="/vendor/apply" className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary">
          View application status <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Rejected/suspended
  if (vendorStatus === "rejected" || vendorStatus === "suspended") {
    return (
      <div className="mb-8 surface-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-display text-lg font-semibold">Vendor application ({vendorStatus})</div>
          <p className="text-sm text-muted-foreground">Contact support or review your application details.</p>
        </div>
        <Link to="/vendor/apply" className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary">
          View application <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Guest or customer with no vendor row
  return (
    <div className="mb-8 overflow-hidden rounded-2xl bg-black text-white">
      <div className="flex flex-col gap-5 p-8 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="max-w-xl">
          <div className="font-display text-2xl font-bold tracking-tight md:text-3xl">Start selling on Nakanjani</div>
          <p className="mt-2 text-sm text-white/70 md:text-base">Reach customers across South Africa. Set up your storefront, list products and start taking orders.</p>
        </div>
        <Link
          to={userId ? "/vendor/apply" : "/auth"}
          search={userId ? undefined : ({ mode: "signup" } as never)}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/90"
        >
          Apply as vendor <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}