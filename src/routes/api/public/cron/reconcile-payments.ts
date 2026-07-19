import { createFileRoute } from "@tanstack/react-router";

const YOCO_API = "https://payments.yoco.com/api";

type YocoStatus = "successful" | "failed" | "cancelled" | "pending" | "processing" | string;

async function fetchYocoCheckout(id: string, key: string) {
  const res = await fetch(`${YOCO_API}/checkouts/${id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    status?: YocoStatus;
    paymentId?: string;
    message?: string;
  };
  return { ok: res.ok, status: res.status, json };
}

export const Route = createFileRoute("/api/public/cron/reconcile-payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = request.headers.get("x-cron-secret");
        if (!cronSecret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: secretOk, error: verifyErr } = await supabaseAdmin.rpc(
          "verify_cron_secret",
          { _secret: cronSecret },
        );
        if (verifyErr || !secretOk) {
          return new Response("Unauthorized", { status: 401 });
        }

        const yocoKey = process.env.YOCO_SECRET_KEY;
        if (!yocoKey) {
          return new Response("YOCO_SECRET_KEY not configured", { status: 500 });
        }

        const { data: claimed, error: claimErr } = await supabaseAdmin.rpc(
          "claim_payments_for_reconciliation",
          { _max: 25 },
        );
        if (claimErr) {
          console.error("[reconcile] claim failed", claimErr);
          return new Response(claimErr.message, { status: 500 });
        }

        const results: Array<Record<string, unknown>> = [];
        for (const p of claimed ?? []) {
          try {
            const { ok, status, json } = await fetchYocoCheckout(
              p.provider_reference as string,
              yocoKey,
            );
            if (!ok) {
              results.push({ id: p.id, action: "skip", status, msg: json.message });
              // release the lock so another run can retry
              await supabaseAdmin
                .from("payments")
                .update({ processing_at: null })
                .eq("id", p.id);
              continue;
            }

            if (json.status === "successful") {
              const { error } = await supabaseAdmin.rpc("mark_payment_success", {
                _payment_id: p.id,
                _provider_transaction_id: json.paymentId ?? undefined,
                _gateway_response: JSON.parse(JSON.stringify(json)),
              });
              results.push({ id: p.id, action: "success", error: error?.message });
            } else if (json.status === "failed" || json.status === "cancelled") {
              const { error } = await supabaseAdmin.rpc("mark_payment_failed", {
                _payment_id: p.id,
                _gateway_response: JSON.parse(JSON.stringify(json)),
              });
              results.push({ id: p.id, action: json.status, error: error?.message });
            } else {
              // still pending — release lock, leave status untouched
              await supabaseAdmin
                .from("payments")
                .update({ processing_at: null })
                .eq("id", p.id);
              results.push({ id: p.id, action: "still_pending", remote: json.status });
            }
          } catch (e) {
            console.error("[reconcile] error processing payment", p.id, e);
            await supabaseAdmin
              .from("payments")
              .update({ processing_at: null })
              .eq("id", p.id);
            results.push({ id: p.id, action: "error", error: String(e) });
          }
        }

        return Response.json({ processed: results.length, results });
      },
    },
  },
});