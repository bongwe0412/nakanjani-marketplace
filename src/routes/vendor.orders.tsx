import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, ChevronRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR } from "@/lib/mock-data";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type VendorOrder = Database["public"]["Tables"]["vendor_orders"]["Row"] & {
  orders: { id: string; order_number: string; customer_name: string; customer_email: string; customer_phone: string | null; created_at: string } | null;
};
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
type OrderAddress = Database["public"]["Tables"]["order_addresses"]["Row"];

export const Route = createFileRoute("/vendor/orders")({
  head: () => ({ meta: [{ title: "Vendor orders — NAKANJANI Marketplace" }] }),
  component: VendorOrdersPage,
});

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  processing: "bg-primary/20 text-primary",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
};

function VendorOrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorOrders, setVendorOrders] = useState<VendorOrder[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [addresses, setAddresses] = useState<Record<string, OrderAddress>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth" }); return; }

      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!vendor) {
        setLoading(false);
        return;
      }
      setVendorId(vendor.id);

      const { data: vos } = await supabase
        .from("vendor_orders")
        .select("*, orders ( id, order_number, customer_name, customer_email, customer_phone, created_at )")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });
      const vendorOrderRows = (vos ?? []) as VendorOrder[];
      setVendorOrders(vendorOrderRows);

      const orderIds = Array.from(new Set(vendorOrderRows.map((v) => v.order_id)));
      if (orderIds.length > 0) {
        const [{ data: it }, { data: addrs }] = await Promise.all([
          supabase.from("order_items").select("*").eq("vendor_id", vendor.id).in("order_id", orderIds),
          supabase.from("order_addresses").select("*").in("order_id", orderIds),
        ]);
        const itemMap: Record<string, OrderItem[]> = {};
        for (const row of (it ?? []) as OrderItem[]) {
          const list = itemMap[row.vendor_order_id] ?? [];
          list.push(row);
          itemMap[row.vendor_order_id] = list;
        }
        setItems(itemMap);
        const addrMap: Record<string, OrderAddress> = {};
        for (const a of (addrs ?? []) as OrderAddress[]) addrMap[a.order_id] = a;
        setAddresses(addrMap);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const updateStatus = async (vendorOrderId: string, status: Status) => {
    setUpdatingId(vendorOrderId);
    const { error } = await supabase.from("vendor_orders").update({ status }).eq("id", vendorOrderId);
    setUpdatingId(null);
    if (error) { toast.error("Could not update status"); return; }
    setVendorOrders((prev) => prev.map((v) => (v.id === vendorOrderId ? { ...v, status } : v)));
    toast.success(`Marked as ${status}`);
  };

  if (loading) {
    return <div className="grid h-60 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!vendorId) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 text-center">
        <h2 className="font-display text-lg font-bold">No vendor profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">Apply to become a vendor to see incoming orders here.</p>
        <Link to="/vendor/apply" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Apply now
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{vendorOrders.length} order{vendorOrders.length === 1 ? "" : "s"}</p>
        </div>
        <Link to="/vendor/dashboard" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
      </div>

      {vendorOrders.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.2} />
          <h2 className="mt-3 font-display text-lg font-bold">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Customer orders for your store will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {vendorOrders.map((vo) => {
            const isOpen = expanded === vo.id;
            const voItems = items[vo.id] ?? [];
            const addr = vo.orders ? addresses[vo.orders.id] : undefined;
            return (
              <div key={vo.id} className="surface-card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : vo.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-secondary/40 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold tabular-nums">{vo.orders?.order_number ?? "—"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[vo.status] ?? ""}`}>{vo.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {vo.orders?.customer_name ?? "Customer"} ·{" "}
                      {vo.orders && new Date(vo.orders.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-base font-bold tabular-nums">{formatZAR(Number(vo.total_amount))}</div>
                    <ChevronRight className={`mt-1 ml-auto h-4 w-4 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border p-4 space-y-4 bg-secondary/20">
                    {/* Items */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Items</div>
                      <ul className="mt-2 divide-y divide-border">
                        {voItems.map((it) => (
                          <li key={it.id} className="py-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{it.product_name}</div>
                              {it.variant_description && <div className="text-xs text-muted-foreground">{it.variant_description}</div>}
                              <div className="text-xs text-muted-foreground tabular-nums">{it.quantity} × {formatZAR(Number(it.unit_price))}</div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums shrink-0">{formatZAR(Number(it.line_total))}</div>
                          </li>
                        ))}
                        {voItems.length === 0 && <li className="py-2 text-sm text-muted-foreground">No items.</li>}
                      </ul>
                    </div>

                    {/* Customer + address */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</div>
                        <div className="mt-2 text-sm">
                          <div className="font-medium">{vo.orders?.customer_name}</div>
                          <div className="text-muted-foreground">{vo.orders?.customer_email}</div>
                          {vo.orders?.customer_phone && <div className="text-muted-foreground">{vo.orders.customer_phone}</div>}
                        </div>
                      </div>
                      {addr && (
                        <div>
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <MapPin className="h-3 w-3" /> Ship to
                          </div>
                          <div className="mt-2 text-sm leading-relaxed">
                            <div className="font-medium">{addr.first_name} {addr.last_name}</div>
                            <div>{addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ""}</div>
                            <div>{[addr.suburb, addr.city].filter(Boolean).join(", ")}</div>
                            <div>{addr.province} {addr.postal_code}, {addr.country}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status controls */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Update status</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {STATUSES.map((s) => {
                          const isCurrent = vo.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => !isCurrent && updateStatus(vo.id, s)}
                              disabled={isCurrent || updatingId === vo.id}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                                isCurrent
                                  ? "border-foreground bg-foreground text-background cursor-default"
                                  : "border-border hover:border-foreground disabled:opacity-50"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
