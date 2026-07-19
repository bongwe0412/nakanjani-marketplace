import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR } from "@/lib/mock-data";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Your orders — NAKANJANI Marketplace" }] }),
  component: OrdersPage,
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  processing: "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};
const paymentStyles: Record<string, string> = {
  unpaid: "bg-muted text-muted-foreground",
  pending: "bg-warning/20 text-warning",
  paid: "bg-success/20 text-success",
  refunded: "bg-secondary text-foreground",
  failed: "bg-destructive/20 text-destructive",
};

function OrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth" }); return; }
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as OrderRow[]);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="grid h-60 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 sm:p-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-secondary text-foreground">
          <ShoppingBag className="h-9 w-9" strokeWidth={1.2} />
        </div>
        <h1 className="mt-5 font-display text-xl sm:text-2xl font-bold tracking-tight">No orders yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">No database orders were found for your account.</p>
        <Link to="/products" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] sm:w-auto sm:px-8">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Your orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"}</p>

      <div className="mt-6 space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            to="/orders/$id"
            params={{ id: o.id }}
            className="surface-card block p-4 hover:border-foreground transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold tabular-nums">{o.order_number}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Placed {new Date(o.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold tabular-nums">{formatZAR(Number(o.total_amount))}</div>
                <div className="mt-1 flex flex-wrap justify-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[o.status] ?? ""}`}>{o.status}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${paymentStyles[o.payment_status] ?? ""}`}>{o.payment_status}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
