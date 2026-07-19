import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, TrendingUp, ShoppingBag, CreditCard, Store, AlertTriangle } from "lucide-react";
import { getAdminKpis } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

function formatZar(n: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n);
}

function AdminIndex() {
  const fetchKpis = useServerFn(getAdminKpis);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (error || !data) {
    return <div className="text-destructive text-sm">Failed to load KPIs: {(error as Error)?.message ?? "unknown"}</div>;
  }

  const cards = [
    { label: "GMV last 24h", value: formatZar(data.gmv24h), icon: TrendingUp, accent: "text-emerald-600" },
    { label: "GMV last 7d", value: formatZar(data.gmv7d), icon: TrendingUp, accent: "text-emerald-600" },
    { label: "Orders last 24h", value: String(data.orders24h), icon: ShoppingBag, accent: "" },
    { label: "Orders last 7d", value: String(data.orders7d), icon: ShoppingBag, accent: "" },
    { label: "Pending payments", value: String(data.pendingPayments), icon: CreditCard, accent: data.pendingPayments > 0 ? "text-amber-600" : "" },
    { label: "Failed payments 24h", value: String(data.failedPayments24h), icon: AlertTriangle, accent: data.failedPayments24h > 0 ? "text-destructive" : "" },
    { label: "Vendor applications", value: String(data.pendingVendorApplications), icon: Store, accent: data.pendingVendorApplications > 0 ? "text-amber-600" : "" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Live snapshot of marketplace activity.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.accent || "text-muted-foreground"}`} />
            </div>
            <div className={`text-2xl font-semibold ${c.accent}`}>{c.value}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link to="/admin/orders" className="rounded-md border px-3 py-1.5 hover:bg-accent">Open orders →</Link>
        <Link to="/admin/payments" className="rounded-md border px-3 py-1.5 hover:bg-accent">Reconcile payments →</Link>
        <Link to="/admin/vendors" className="rounded-md border px-3 py-1.5 hover:bg-accent">Vendor verifications →</Link>
        <Link to="/admin/health" className="rounded-md border px-3 py-1.5 hover:bg-accent">System health →</Link>
      </div>
    </div>
  );
}