import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Store, Eye, Heart, Star, Package, Settings, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/vendor-utils";
import type { Database } from "@/integrations/supabase/types";

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

export const Route = createFileRoute("/vendor/dashboard")({
  head: () => ({
    meta: [{ title: "Vendor dashboard — NAKANJANI Marketplace" }],
  }),
  component: VendorDashboardPage,
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
  suspended: "bg-muted text-muted-foreground",
};

const statusCopy: Record<string, string> = {
  pending: "Your application is under review. We'll notify you within 24 hours.",
  approved: "Your store is live on Nakanjani.",
  rejected: "Your application was not approved. Please contact support.",
  suspended: "Your store is currently suspended. Please contact support.",
};

function VendorDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!data) {
        navigate({ to: "/vendor/apply" });
        return;
      }
      setVendor(data);
      const [logo, banner] = await Promise.all([
        getStorageUrl(data.logo_url),
        getStorageUrl(data.banner_url),
      ]);
      setLogoUrl(logo);
      setBannerUrl(banner);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading || !vendor) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      {/* Banner + header */}
      <div className="surface-card overflow-hidden">
        <div
          className="h-32 w-full bg-gradient-to-r from-primary/20 to-secondary/40 sm:h-40"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="-mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-background bg-muted sm:h-24 sm:w-24">
            {logoUrl ? (
              <img src={logoUrl} alt={vendor.store_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Store className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold truncate">{vendor.store_name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${statusStyles[vendor.verification_status]}`}>
                {vendor.verification_status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">nakanjani.com/vendor/{vendor.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/vendor/orders"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card"
            >
              <Package className="h-4 w-4" /> Orders
            </Link>
            <Link
              to="/vendor/products"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card"
            >
              <Package className="h-4 w-4" /> Products
            </Link>
            <Link
              to="/vendor/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            {vendor.verification_status === "approved" && (
              <Link
                to="/vendor/$slug"
                params={{ slug: vendor.slug }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <ExternalLink className="h-4 w-4" /> View store
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Status callout */}
      <div className={`surface-card p-4 text-sm ${vendor.verification_status === "approved" ? "" : "border-l-4 border-warning"}`}>
        {statusCopy[vendor.verification_status]}
      </div>

      {/* Metric placeholders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Package} label="Products" value="—" hint="Add products soon" />
        <Metric icon={Eye} label="Store views" value="—" hint="Coming soon" />
        <Metric icon={Heart} label="Followers" value={String(vendor.followers_count)} />
        <Metric icon={Star} label="Rating" value={vendor.rating > 0 ? vendor.rating.toFixed(1) : "—"} hint="No reviews yet" />
      </div>

      {/* Store info */}
      <div className="surface-card p-5">
        <h2 className="font-display text-lg font-bold">Store information</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Info label="Store name" value={vendor.store_name} />
          <Info label="Slug" value={vendor.slug} />
          <Info label="Email" value={vendor.email} />
          <Info label="Phone" value={vendor.phone} />
          <Info label="WhatsApp" value={vendor.whatsapp} />
          <Info label="Joined" value={new Date(vendor.created_at).toLocaleDateString()} />
        </dl>
        {vendor.description && (
          <>
            <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</div>
            <p className="mt-1 text-sm">{vendor.description}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
