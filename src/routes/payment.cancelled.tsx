import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { XCircle, Loader2, RefreshCcw, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { cancelYocoPayment } from "@/lib/yoco.functions";
import { toast } from "sonner";

const searchSchema = z.object({ payment: z.string().uuid().optional() });

export const Route = createFileRoute("/payment/cancelled")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Payment cancelled — NAKANJANI Marketplace" },
    { name: "robots", content: "noindex" },
  ] }),
  component: PaymentCancelledPage,
});

function PaymentCancelledPage() {
  const { payment: paymentId } = Route.useSearch();
  const navigate = useNavigate();
  const cancelFn = useServerFn(cancelYocoPayment);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) { setLoading(false); return; }
    (async () => {
      try {
        await cancelFn({ data: { payment_id: paymentId } });
      } catch (err) {
        // Most common cause: already cancelled by ITN — fine.
        console.warn("[payment-cancelled]", err);
      }
      const { data } = await supabase
        .from("payments").select("order_id").eq("id", paymentId).maybeSingle();
      setOrderId((data?.order_id as string | undefined) ?? null);
      setLoading(false);
    })();
  }, [paymentId, cancelFn]);

  if (loading) {
    return <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  async function retry() {
    if (!orderId) return;
    try {
      const { initiateYocoPayment } = await import("@/lib/yoco.functions");
      const res = await initiateYocoPayment({ data: { order_id: orderId } });
      window.location.href = res.redirect_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't restart payment");
    }
  }

  return (
    <div className="mx-auto max-w-md pb-16">
      <div className="surface-card p-6 sm:p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/20 text-destructive">
          <XCircle className="h-9 w-9" strokeWidth={1.6} />
        </div>
        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold tracking-tight">Payment cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You cancelled the Yoco payment. We've released the stock that was held for your order — you can try paying again whenever you're ready.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {orderId && (
            <button onClick={retry} className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)]">
              <RefreshCcw className="mr-2 h-4 w-4" /> Try again
            </button>
          )}
          <button onClick={() => navigate({ to: "/products" })} className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold uppercase tracking-wider hover:bg-secondary">
            <ShoppingBag className="mr-2 h-4 w-4" /> Keep shopping
          </button>
        </div>

        {orderId && (
          <div className="mt-4 text-xs text-muted-foreground">
            <Link to="/orders/$id" params={{ id: orderId }} className="underline hover:text-foreground">View this order</Link>
          </div>
        )}
      </div>
    </div>
  );
}
