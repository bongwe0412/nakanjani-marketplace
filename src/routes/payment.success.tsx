import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Package, ShoppingBag, Clock } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR } from "@/lib/mock-data";
import type { Database } from "@/integrations/supabase/types";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

const searchSchema = z.object({ payment: z.string().uuid().optional() });

export const Route = createFileRoute("/payment/success")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Payment received — NAKANJANI Marketplace" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { payment: paymentId } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!paymentId) { setLoading(false); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick(attempt: number) {
      const { data: p } = await supabase
        .from("payments").select("*").eq("id", paymentId!).maybeSingle();
      if (cancelled) return;
      setPayment((p ?? null) as PaymentRow | null);
      if (p?.order_id) {
        const { data: o } = await supabase
          .from("orders").select("*").eq("id", p.order_id).maybeSingle();
        if (cancelled) return;
        setOrder((o ?? null) as OrderRow | null);
      }
      setPolls(attempt);
      setLoading(false);
      // Poll for up to ~20s while the ITN webhook is in flight
      if (p && p.status !== "successful" && attempt < 10) {
        timer = setTimeout(() => tick(attempt + 1), 2000);
      }
    }

    void tick(1);
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [paymentId]);

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!payment || !order) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-xl font-bold">Payment not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">We couldn't locate this payment. Check your orders for the latest status.</p>
        <Link to="/orders" className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground">View orders</Link>
      </div>
    );
  }

  const isSuccess = payment.status === "successful";

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="surface-card p-6 sm:p-10 text-center">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${isSuccess ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
          {isSuccess ? <CheckCircle2 className="h-9 w-9" strokeWidth={1.6} /> : <Clock className="h-9 w-9" strokeWidth={1.6} />}
        </div>
        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold tracking-tight">
          {isSuccess ? "Payment received" : "Confirming your payment"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSuccess
            ? "Thanks — we've received your payment and your order is now being processed."
            : "We're waiting for Yoco to confirm this transaction. This usually takes only a few seconds."}
        </p>

        <div className="mt-6 inline-flex flex-col items-center gap-1 rounded-xl bg-secondary px-5 py-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Order number</span>
          <span className="font-display text-lg font-bold tracking-wide">{order.order_number ?? order.id.slice(0,8).toUpperCase()}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-wider">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-muted-foreground">Payment: {payment.status}</span>
          <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-muted-foreground">Order: {order.payment_status}</span>
          {!isSuccess && polls > 1 && (
            <span className="text-[11px] text-muted-foreground normal-case tracking-normal">Checking…</span>
          )}
        </div>
        <div className="mt-2 text-sm text-muted-foreground tabular-nums">{formatZAR(Number(payment.amount))}</div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link to="/orders/$id" params={{ id: order.id }} className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold uppercase tracking-wider hover:bg-secondary">
          <Package className="mr-2 h-4 w-4" /> View order
        </Link>
        <Link to="/products" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)]">
          <ShoppingBag className="mr-2 h-4 w-4" /> Continue shopping
        </Link>
      </div>
    </div>
  );
}
