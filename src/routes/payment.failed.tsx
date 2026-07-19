import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCcw, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { initiateYocoPayment } from "@/lib/yoco.functions";
import { toast } from "sonner";

const searchSchema = z.object({ payment: z.string().uuid().optional() });

export const Route = createFileRoute("/payment/failed")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Payment failed — NAKANJANI Marketplace" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentFailedPage,
});

function PaymentFailedPage() {
  const { payment: paymentId } = Route.useSearch();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select("order_id")
        .eq("id", paymentId)
        .maybeSingle();
      setOrderId((data?.order_id as string | undefined) ?? null);
      setLoading(false);
    })();
  }, [paymentId]);

  async function retry() {
    if (!orderId) return;
    setRetrying(true);
    try {
      const res = await initiateYocoPayment({ data: { order_id: orderId } });
      window.location.href = res.redirect_url;
    } catch (err) {
      setRetrying(false);
      toast.error(err instanceof Error ? err.message : "Couldn't restart payment");
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pb-16">
      <div className="surface-card p-6 sm:p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/20 text-destructive">
          <AlertTriangle className="h-9 w-9" strokeWidth={1.6} />
        </div>
        <h1 className="mt-5 font-display text-2xl sm:text-3xl font-bold tracking-tight">
          Payment failed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Yoco couldn't complete this payment. Your card was not charged and the
          stock reserved for this order has been released. You can try again with
          the same or a different card.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {orderId && (
            <button
              onClick={retry}
              disabled={retrying}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {retrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Try again
            </button>
          )}
          <button
            onClick={() => navigate({ to: "/products" })}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-border text-sm font-semibold uppercase tracking-wider hover:bg-secondary"
          >
            <ShoppingBag className="mr-2 h-4 w-4" /> Keep shopping
          </button>
        </div>

        {orderId && (
          <div className="mt-4 text-xs text-muted-foreground">
            <Link
              to="/orders/$id"
              params={{ id: orderId }}
              className="underline hover:text-foreground"
            >
              View this order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}