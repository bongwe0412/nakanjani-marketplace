import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const YOCO_API = "https://payments.yoco.com/api";


/**
 * Determines the application's public origin.
 * Used when constructing Yoco success,
 * cancellation and failure callback URLs.
 */
function getOrigin(): string {
  const origin = getRequestHeader("origin");
  if (origin) return origin;

  const host = getRequestHeader("host");

  if (host) {
    const protocol =
      process.env.NODE_ENV === "development"
        ? "http"
        : "https";

    return `${protocol}://${host}`;
  }

  return "https://nakanjani.co.za";
}

function requireKey(): string {
  const k = process.env.YOCO_SECRET_KEY;
  if (!k) throw new Error("Payment service is currently unavailable.");
  return k;
}

/** Start a Yoco hosted checkout for an order. */
export const initiateYocoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ order_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const t0 = Date.now();
    console.log("[yoco.initiate] start", { order_id: data.order_id, user_id: userId });

    if (!process.env.YOCO_SECRET_KEY) {
      console.error("[yoco.initiate] YOCO_SECRET_KEY missing in server runtime");
      throw new Error(
  "Payment service is temporarily unavailable. Please try again later."
);
    }

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select(
        "id, user_id, total_amount, status, payment_status, order_number, customer_name, customer_email",
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr) { console.error("[yoco.initiate] order lookup error", oErr); throw new Error(oErr.message); }
    if (!order) { console.error("[yoco.initiate] order not found", data.order_id); throw new Error("Order not found"); }
    if (order.user_id !== userId) { console.error("[yoco.initiate] order owner mismatch"); throw new Error("Not authorized for this order"); }
    if (order.payment_status === "paid") throw new Error("This order is already paid");
    if (order.status === "cancelled") throw new Error("This order has been cancelled");
    console.log("[yoco.initiate] order loaded", { total_amount: order.total_amount, order_number: order.order_number });

    // SECURITY: recompute the order total server-side from order_items joined
    // with the current product/variant catalogue prices. The client-set
    // total_amount on `orders` is NOT trusted — we authoritatively replace it
    // here and refuse to charge if it was tampered with.
    const { data: items, error: iErr } = await supabase
      .from("order_items")
      .select("quantity, product_id, variant_id")
      .eq("order_id", order.id);
    if (iErr) { console.error("[yoco.initiate] order_items lookup failed", iErr); throw new Error(iErr.message); }
    if (!items || items.length === 0) throw new Error("Order has no items");

    const productIds = Array.from(
      new Set(items.map((i) => i.product_id).filter((v): v is string => !!v)),
    );
    const variantIds = Array.from(
      new Set(items.map((i) => i.variant_id).filter((v): v is string => !!v)),
    );

    const [{ data: prods, error: pErr }, { data: vars, error: vErr }] = await Promise.all([
      supabase.from("products").select("id, price, status").in("id", productIds),
      variantIds.length
        ? supabase.from("product_variants").select("id, price").in("id", variantIds)
        : Promise.resolve({ data: [], error: null } as { data: { id: string; price: number | null }[]; error: null }),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (vErr) throw new Error(vErr.message);

    const pMap = new Map((prods ?? []).map((p) => [p.id, p]));
    const vMap = new Map((vars ?? []).map((v) => [v.id, v]));

    let computedSubtotal = 0;
    for (const it of items) {
      if (!it.product_id) throw new Error("Order item missing product");
      const p = pMap.get(it.product_id);
      if (!p) throw new Error("Product in order is no longer available");
      if (p.status !== "active") throw new Error("Product in order is no longer available for sale");
      let unit = Number(p.price);
      if (it.variant_id) {
        const v = vMap.get(it.variant_id);
        if (!v) throw new Error("Variant in order is no longer available");
        if (v.price != null) unit = Number(v.price);
      }
      if (!Number.isFinite(unit) || unit < 0) throw new Error("Invalid catalogue price");
      computedSubtotal += unit * it.quantity;
    }

    // Today shipping/tax/discount are all zero; if that changes, recompute
    // them server-side here too. Never trust order.shipping_amount etc.
    const computedTotal = Math.round(computedSubtotal * 100) / 100;
    const dbTotal = Math.round(Number(order.total_amount) * 100) / 100;

    if (computedTotal !== dbTotal) {
      console.error("[yoco.initiate] amount mismatch — possible tampering", {
        order_id: order.id,
        db_total: dbTotal,
        computed_total: computedTotal,
      });
      // Repair the stored order so receipts/webhook checks use the true total.
      const { error: fixErr } = await supabase
        .from("orders")
        .update({
          subtotal: computedTotal,
          total_amount: computedTotal,
          shipping_amount: 0,
          tax_amount: 0,
          discount_amount: 0,
        })
        .eq("id", order.id);
      if (fixErr) {
        console.error("[yoco.initiate] could not repair tampered order total", fixErr);
        throw new Error("Order total is invalid. Please contact support.");
      }
    }

    // Yoco hosted checkout requires a minimum of R2.00 (200 cents).
    const amountCents = Math.round(computedTotal * 100);
    if (!Number.isFinite(amountCents) || amountCents < 200) {
      console.error("[yoco.initiate] amount below Yoco minimum", { amountCents });
      throw new Error(
        "Order total is below Yoco's minimum of R2.00. Please add more items and try again.",
      );
    }

    // Reuse an in-flight payment when present, otherwise create a fresh one
    const { data: existing } = await supabase
      .from("payments")
      .select("id, status, amount")
      .eq("order_id", order.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let paymentId: string;
    if (existing && Number(existing.amount) === computedTotal) {
      paymentId = existing.id;
      console.log("[yoco.initiate] reusing pending payment", paymentId);
    } else {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: newId, error: cErr } = await supabaseAdmin.rpc(
        "create_payment",
        {
          _order_id: order.id,
          _provider: "yoco",
          _amount: computedTotal,
          _provider_reference: order.order_number ?? undefined,
        },
      );
      if (cErr) { console.error("[yoco.initiate] create_payment failed", cErr); throw new Error(cErr.message); }
      paymentId = newId as string;
      console.log("[yoco.initiate] payment created", paymentId);
    }

    const origin = getOrigin();
    console.log("[yoco.initiate] calling Yoco /checkouts", { amountCents, origin });

    const res = await fetch(`${YOCO_API}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "ZAR",
        successUrl: `${origin}/payment/success?payment=${paymentId}`,
        cancelUrl: `${origin}/payment/cancelled?payment=${paymentId}`,
        failureUrl: `${origin}/payment/failed?payment=${paymentId}`,
        metadata: {
          payment_id: paymentId,
          order_id: order.id,
          user_id: userId,
          order_number: order.order_number ?? "",
        },
      }),
    });

    const rawBody = await res.text();
    let json: {
      id?: string;
      redirectUrl?: string;
      message?: string;
    } = {};
    try { json = JSON.parse(rawBody); } catch { /* non-JSON */ }
    console.log("[yoco.initiate] Yoco response", { status: res.status, ok: res.ok, hasRedirect: !!json.redirectUrl, message: json.message });

    if (!res.ok || !json.redirectUrl || !json.id) {
      console.error("[yoco.initiate] checkout create failed", res.status, rawBody.slice(0, 500));
      throw new Error(json.message ?? `Could not start Yoco checkout (status ${res.status})`);
    }

    await supabase
      .from("payments")
      .update({ provider_reference: json.id })
      .eq("id", paymentId);

    console.log("[yoco.initiate] success", { paymentId, ms: Date.now() - t0 });
    return { redirect_url: json.redirectUrl, payment_id: paymentId };
  });

/** Cancel a pending payment from the cancel-return page. */
export const cancelYocoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ payment_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Ownership / admin check before invoking the privileged RPC.
    const { data: pmt, error: pErr } = await context.supabase
      .from("payments")
      .select("id, order_id, orders!inner(user_id)")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!pmt) throw new Error("Payment not found");
    const ownerId = (pmt as unknown as { orders: { user_id: string } }).orders.user_id;
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (ownerId !== context.userId && !isAdmin) {
      throw new Error("Not authorized to cancel this payment");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.rpc("cancel_payment", {
      _payment_id: data.payment_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * One-time helper: registers a Yoco webhook for the given URL and stores the
 * returned signing secret. Admin-only — must be called by a signed-in admin.
 * Returns the secret so it can be copied into YOCO_WEBHOOK_SECRET if needed.
 */
export const registerYocoWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ url: z.string().url(), name: z.string().default("nakanjani") })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const res = await fetch(`${YOCO_API}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: data.name, url: data.url }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      secret?: string;
      message?: string;
    };
    if (!res.ok || !json.secret) {
      throw new Error(
        json.message ?? `Yoco webhook registration failed (${res.status})`,
      );
    }
    return { id: json.id, secret: json.secret };
  });