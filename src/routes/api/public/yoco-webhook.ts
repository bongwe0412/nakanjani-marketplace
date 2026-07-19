import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Yoco webhook receiver.
 *
 * Implements Yoco's Checkout API webhook verification per
 * https://yoco.docs.buildwithfern.com/guides/online-payments/webhooks/verifying-the-events
 * The signing secret is the value Yoco returned when the webhook was
 * registered (`whsec_<base64>` form), stored as `YOCO_WEBHOOK_SECRET`.
 *
 * Verification:
 *   signed_content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
 *   expected_b64   = base64(HMAC_SHA256(base64Decode(secret_without_prefix), signed_content))
 *   header         = `v1,<expected_b64> v1,<another>` (space-separated; any match passes)
 */

function safeEqualB64(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "base64");
    const bb = Buffer.from(b, "base64");
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function verifyYocoSignature(opts: {
  id: string;
  timestamp: string;
  body: string;
  header: string;
  secret: string;
}): boolean {
  const raw = opts.secret.startsWith("whsec_")
    ? opts.secret.slice("whsec_".length)
    : opts.secret;
  const key = Buffer.from(raw, "base64");
  const signed = `${opts.id}.${opts.timestamp}.${opts.body}`;
  const expected = createHmac("sha256", key).update(signed).digest("base64");
  const parts = opts.header
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("v1,") ? s.slice(3) : s));
  return parts.some((p) => safeEqualB64(p, expected));
}

// Yoco docs recommend a replay window of at most 3 minutes.
function timestampFresh(timestamp: string, tolSec = 3 * 60): boolean {
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= tolSec;
}

type YocoEvent = {
  id?: string;
  type?: string;
  createdDate?: string;
  payload?: {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
    checkoutId?: string;
  };
};

export const Route = createFileRoute("/api/public/yoco-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.YOCO_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[yoco-webhook] YOCO_WEBHOOK_SECRET not configured");
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const id = request.headers.get("webhook-id") ?? "";
        const timestamp = request.headers.get("webhook-timestamp") ?? "";
        const sig = request.headers.get("webhook-signature") ?? "";
        const body = await request.text();

        if (!id || !timestamp || !sig) {
          return new Response("Missing webhook headers", { status: 400 });
        }
        if (!timestampFresh(timestamp)) {
          return new Response("Stale timestamp", { status: 400 });
        }
        if (!verifyYocoSignature({ id, timestamp, body, header: sig, secret })) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: YocoEvent;
        try {
          event = JSON.parse(body) as YocoEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventId = event.id ?? id;
        const type = event.type ?? "";
        const meta = event.payload?.metadata ?? {};
        const paymentId = meta.payment_id;
        const yocoPaymentId = event.payload?.id ?? null;

        if (!paymentId) {
          // Webhook for a checkout we didn't create — acknowledge so Yoco stops retrying.
          console.warn("[yoco-webhook] missing metadata.payment_id", { eventId, type });
          return new Response("OK", { status: 200 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Lookup payment + order for amount validation
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, status")
          .eq("id", paymentId)
          .maybeSingle();
        if (!payment) {
          console.error("[yoco-webhook] unknown payment", paymentId);
          return new Response("Unknown payment", { status: 400 });
        }
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, total_amount")
          .eq("id", payment.order_id)
          .maybeSingle();
        if (!order) return new Response("Unknown order", { status: 400 });

        // Amount check (Yoco amount is in cents)
        const gotCents = Number(event.payload?.amount ?? 0);
        const expectedCents = Math.round(Number(order.total_amount) * 100);
        if (
          type.startsWith("payment.") &&
          gotCents > 0 &&
          gotCents !== expectedCents
        ) {
          await supabaseAdmin.rpc("record_payment_event", {
            _payment_id: paymentId,
            _event_type: "yoco:amount_mismatch",
            _payload: { event_id: eventId, got: gotCents, expected: expectedCents, raw: event },
          });
          return new Response("Amount mismatch", { status: 400 });
        }

        // Idempotency lock: rely on the unique index payment_events_event_id_uidx
        // over (payload->>'event_id'). A duplicate insert returns 23505 and we
        // ack the webhook without re-dispatching to the state machine.
        const { error: insErr } = await supabaseAdmin
          .from("payment_events")
          .insert({
            payment_id: paymentId,
            event_type: `yoco:${type}`,
            payload: { event_id: eventId, raw: event } as never,
          });
        if (insErr) {
          // Postgres unique_violation
          if ((insErr as { code?: string }).code === "23505") {
            return new Response("OK", { status: 200 });
          }
          console.error("[yoco-webhook] event insert failed", insErr);
          return new Response("Internal error", { status: 500 });
        }

        const eventJson = JSON.parse(JSON.stringify(event)) as never;
        try {
          if (type === "payment.succeeded") {
            if (payment.status !== "successful") {
              const { error } = await supabaseAdmin.rpc("mark_payment_success", {
                _payment_id: paymentId,
                _provider_transaction_id: yocoPaymentId ?? undefined,
                _gateway_response: eventJson,
              });
              if (error) throw error;
            }
          } else if (type === "payment.failed") {
            if (payment.status !== "failed") {
              const { error } = await supabaseAdmin.rpc("mark_payment_failed", {
                _payment_id: paymentId,
                _gateway_response: eventJson,
              });
              if (error) throw error;
            }
          } else if (type === "payment.cancelled" || type === "checkout.cancelled") {
            if (payment.status !== "cancelled" && payment.status !== "successful") {
              await supabaseAdmin
                .from("payments")
                .update({ status: "cancelled", gateway_response: eventJson })
                .eq("id", paymentId);
              await supabaseAdmin.rpc("release_order_reservations", {
                _order_id: payment.order_id,
              });
            }
          }
        } catch (err) {
          console.error("[yoco-webhook] dispatch error", err);
          return new Response("Internal error", { status: 500 });
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});