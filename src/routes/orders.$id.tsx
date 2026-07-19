import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowLeft, MapPin, Store, Package, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR } from "@/lib/mock-data";
import { initiateYocoPayment } from "@/lib/yoco.functions";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type VendorOrderRow = Database["public"]["Tables"]["vendor_orders"]["Row"] & {
  vendors: { id: string; store_name: string; slug: string } | null;
};
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type OrderAddressRow = Database["public"]["Tables"]["order_addresses"]["Row"];

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Order details — NAKANJANI Marketplace" }] }),
  component: OrderDetailPage,
});

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  processing: "bg-primary/20 text-primary",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
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

function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [vendorOrders, setVendorOrders] = useState<VendorOrderRow[]>([]);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [address, setAddress] = useState<OrderAddressRow | null>(null);
  const [paying, setPaying] = useState(false);

  const canPay = order && order.payment_status !== "paid" && order.status !== "cancelled";

  async function payNow() {
    if (!order) return;
    setPaying(true);
    try {
      const res = await initiateYocoPayment({ data: { order_id: order.id } });
      window.location.href = res.redirect_url;
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Couldn't start payment");
    }
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth" }); return; }
      const [orderRes, voRes, itemsRes, addrRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("vendor_orders").select("*, vendors ( id, store_name, slug )").eq("order_id", id),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("order_addresses").select("*").eq("order_id", id).maybeSingle(),
      ]);
      setOrder((orderRes.data ?? null) as OrderRow | null);
      setVendorOrders((voRes.data ?? []) as VendorOrderRow[]);
      setItems((itemsRes.data ?? []) as OrderItemRow[]);
      setAddress((addrRes.data ?? null) as OrderAddressRow | null);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading) {
    return <div className="grid h-60 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!order) {
    return (
      <div className="surface-card mx-auto my-12 max-w-md p-6 text-center">
        <h2 className="font-display text-lg font-bold">Order not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed or you don't have access.</p>
        <Link to="/orders" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">Back to orders</Link>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Link to="/orders" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to orders
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{order.order_number}</h1>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusStyles[order.status] ?? ""}`}>{order.status}</span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${paymentStyles[order.payment_status] ?? ""}`}>{order.payment_status}</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {new Date(order.created_at).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {vendorOrders.map((vo) => {
            const voItems = items.filter((i) => i.vendor_order_id === vo.id);
            return (
              <div key={vo.id} className="surface-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{vo.vendors?.store_name ?? "Vendor"}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[vo.status] ?? ""}`}>{vo.status}</span>
                </div>

                <ul className="mt-4 divide-y divide-border">
                  {voItems.map((it) => (
                    <li key={it.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{it.product_name}</div>
                        {it.variant_description && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{it.variant_description}</div>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {it.quantity} × {formatZAR(Number(it.unit_price))}
                        </div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums shrink-0">{formatZAR(Number(it.line_total))}</div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Vendor subtotal</span>
                  <span className="font-semibold tabular-nums">{formatZAR(Number(vo.total_amount))}</span>
                </div>
              </div>
            );
          })}
          {vendorOrders.length === 0 && (
            <div className="surface-card p-6 text-center text-sm text-muted-foreground">No items.</div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="surface-card p-4 sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order summary</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatZAR(Number(order.subtotal))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="tabular-nums">{Number(order.shipping_amount) === 0 ? "Free" : formatZAR(Number(order.shipping_amount))}</span></div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="tabular-nums">-{formatZAR(Number(order.discount_amount))}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{formatZAR(Number(order.tax_amount))}</span></div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="font-display text-xl font-bold tabular-nums">{formatZAR(Number(order.total_amount))}</span>
              </div>
            </div>
          </div>

          {canPay && (
            <button
              onClick={payNow}
              disabled={paying}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              {paying ? "Redirecting…" : `Pay ${formatZAR(Number(order.total_amount))}`}
            </button>
          )}

          <div className="surface-card p-4 sm:p-5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Customer
            </div>
            <div className="mt-3 text-sm leading-relaxed">
              <div className="font-medium">{order.customer_name}</div>
              <div className="text-muted-foreground">{order.customer_email}</div>
              {order.customer_phone && <div className="text-muted-foreground">{order.customer_phone}</div>}
            </div>
          </div>

          {address && (
            <div className="surface-card p-4 sm:p-5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Shipping address
              </div>
              <div className="mt-3 text-sm leading-relaxed">
                <div className="font-medium">{address.first_name} {address.last_name}</div>
                {address.company && <div>{address.company}</div>}
                <div>{address.address_line_1}</div>
                {address.address_line_2 && <div>{address.address_line_2}</div>}
                <div>{[address.suburb, address.city].filter(Boolean).join(", ")}</div>
                <div>{address.province} {address.postal_code}</div>
                <div>{address.country}</div>
                {address.phone && <div className="mt-1 text-muted-foreground">{address.phone}</div>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
