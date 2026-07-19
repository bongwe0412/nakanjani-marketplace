import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const YOCO_API = "https://payments.yoco.com/api";

async function assertAdmin(context: { supabase: { rpc: (n: string, p: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

/** Admin: read top-level KPIs for the dashboard home. */
export const getAdminKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: orders24 }, { count: orders7d }, paid24Resp, paid7dResp, pendingPayResp, failedPayResp, vendorsResp] = await Promise.all([
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since24),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", since7d),
      supabaseAdmin.from("orders").select("total_amount").eq("payment_status", "paid").gte("created_at", since24),
      supabaseAdmin.from("orders").select("total_amount").eq("payment_status", "paid").gte("created_at", since7d),
      supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since24),
      supabaseAdmin.from("vendors").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
    ]);

    const sum = (rows: { total_amount: number | string }[] | null) =>
      (rows ?? []).reduce((acc, r) => acc + Number(r.total_amount ?? 0), 0);

    return {
      orders24h: orders24 ?? 0,
      orders7d: orders7d ?? 0,
      gmv24h: sum(paid24Resp.data as never),
      gmv7d: sum(paid7dResp.data as never),
      pendingPayments: pendingPayResp.count ?? 0,
      failedPayments24h: failedPayResp.count ?? 0,
      pendingVendorApplications: vendorsResp.count ?? 0,
    };
  });

/** Admin: sync one payment against Yoco and apply success/failure if known. */
export const syncYocoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ payment_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const key = process.env.YOCO_SECRET_KEY;
    if (!key) throw new Error("YOCO_SECRET_KEY is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pay, error } = await supabaseAdmin
      .from("payments")
      .select("id, provider_reference, status")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pay) throw new Error("Payment not found");
    if (!pay.provider_reference) throw new Error("No Yoco reference on this payment");

    const res = await fetch(`${YOCO_API}/checkouts/${pay.provider_reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = (await res.json().catch(() => ({}))) as {
      status?: string;
      paymentId?: string;
      message?: string;
    };
    if (!res.ok) throw new Error(json.message ?? `Yoco lookup failed (${res.status})`);

    const safe = JSON.parse(JSON.stringify(json));
    if (json.status === "successful") {
      await supabaseAdmin.rpc("mark_payment_success", {
        _payment_id: pay.id,
        _provider_transaction_id: json.paymentId ?? undefined,
        _gateway_response: safe,
      });
    } else if (json.status === "failed" || json.status === "cancelled") {
      await supabaseAdmin.rpc("mark_payment_failed", {
        _payment_id: pay.id,
        _gateway_response: safe,
      });
    }
    return { remote_status: json.status ?? "unknown" };
  });

/** Admin: flip a vendor's verification status. */
export const setVendorVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        vendor_id: z.string().uuid(),
        status: z.enum(["pending", "approved", "rejected", "suspended"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    // Use the authenticated user's client so auth.uid() resolves inside the
    // protect_vendor_fields trigger (service role would set auth.uid() = NULL
    // and the trigger would reject the verification_status change).
    const userClient = (context as unknown as { supabase: { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } } }).supabase;
    const { error } = await userClient
      .from("vendors")
      .update({ verification_status: data.status })
      .eq("id", data.vendor_id);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vendor, error: vendorError } = await supabaseAdmin
      .from("vendors")
      .select("user_id")
      .eq("id", data.vendor_id)
      .maybeSingle();
    if (vendorError) throw new Error(vendorError.message);
    if (vendor?.user_id) {
      if (data.status === "approved") {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: vendor.user_id, role: "vendor" });
        if (roleError && roleError.code !== "23505") throw new Error(roleError.message);
      } else {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", vendor.user_id)
          .eq("role", "vendor");
        if (roleError) throw new Error(roleError.message);
      }
    }
    return { ok: true };
  });

/** Admin: ops health snapshot. */
export const getAdminHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [cronResp, pendingPayments, stuckPayments, expiredReservations, recentEvents] = await Promise.all([
      supabaseAdmin.rpc("admin_cron_status" as never),
      supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
      supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]).lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()),
      supabaseAdmin.from("inventory_reservations").select("id", { count: "exact", head: true }).lt("expires_at", new Date().toISOString()),
      supabaseAdmin.from("payment_events").select("event_type, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const cron = (cronResp.data as { jobs?: unknown[]; recent_runs?: unknown[] } | null) ?? { jobs: [], recent_runs: [] };

    return {
      cron_jobs: (cron.jobs ?? []) as Array<{ jobid: number; jobname: string; schedule: string; active: boolean }>,
      cron_runs: (cron.recent_runs ?? []) as Array<{ jobid: number; status: string; return_message: string | null; start_time: string; end_time: string | null }>,
      pending_payments: pendingPayments.count ?? 0,
      stuck_payments_over_30min: stuckPayments.count ?? 0,
      expired_reservations_pending_cleanup: expiredReservations.count ?? 0,
      recent_payment_events: (recentEvents.data ?? []) as Array<{ event_type: string; created_at: string }>,
    };
  });