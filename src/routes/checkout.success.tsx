import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Package, ShoppingBag, CreditCard } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR } from "@/lib/mock-data";
import { initiateYocoPayment } from "@/lib/yoco.functions";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

const searchSchema = z.object({ order: z.string().uuid().optional() });

export const Route = createFileRoute("/checkout/success")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Order placed — NAKANJANI Marketplace" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SuccessPage,
});

function SuccessPage() {
  const { order: orderId } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [paying, setPaying] = useState(false);

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
    if (!orderId) { setLoading(false); return; }
    (async () => {
      const [{ data: o }, { data: it }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);
      setOrder((o ?? null) as OrderRow | null);
      setItems((it ?? []) as OrderItemRow[]);
      setLoading(false);
    })();
  }, [orderId]);

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!order) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 sm:p-10 text-center">
        <h1 className="font-display text-xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn't find that order. Check your account for order history.</p>
        <Link to="/orders" className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground">View orders</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="surface-card p-6 sm:p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/20 text-success">
          <CheckCircle2 className="h-9 w-9" strokeWidth={1.6} />
        </div>
        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold tracking-tight">Thank you for your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">We've received your order and it's now pending payment.</p>

        <div className="mt-6 inline-flex flex-col items-center gap-1 rounded-xl bg-secondary px-5 py-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Order number</span>
          <span className="font-display text-lg font-bold tracking-wide">{order.order_number ?? order.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <div className="surface-card mt-5 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold">Summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-medium">{it.product_name}</div>
                {it.variant_description && (
                  <div className="text-[11px] text-muted-foreground">{it.variant_description}</div>
                )}
                <div className="text-[11px] text-muted-foreground">Qty {it.quantity}</div>
              </div>
              <div className="text-sm font-semibold tabular-nums">{formatZAR(Number(it.line_total))}</div>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <Row k="Subtotal" v={formatZAR(Number(order.subtotal))} />
          <Row k="Shipping" v={Number(order.shipping_amount) === 0 ? "—" : formatZAR(Number(order.shipping_amount))} muted />
          <Row k="Discount" v={Number(order.discount_amount) === 0 ? "—" : `- ${formatZAR(Number(order.discount_amount))}`} muted />
          <Row k="Tax" v={Number(order.tax_amount) === 0 ? "—" : formatZAR(Number(order.tax_amount))} muted />
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
          <span className="font-display text-xl font-bold tabular-nums">{formatZAR(Number(order.total_amount))}</span>
        </div>
      </div>

      {order.payment_status !== "paid" && (
        <button
          onClick={payNow}
          disabled={paying}
          className="mt-5 inline-flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
        >
          {paying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
          {paying ? "Redirecting to Yoco…" : `Pay ${formatZAR(Number(order.total_amount))} with Yoco`}
        </button>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link to="/orders/$id" params={{ id: order.id }} className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold uppercase tracking-wider hover:bg-secondary">
          <Package className="mr-2 h-4 w-4" /> View order
        </Link>
        <Link to="/products" className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold uppercase tracking-wider hover:bg-secondary">
          <ShoppingBag className="mr-2 h-4 w-4" /> Continue shopping
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
