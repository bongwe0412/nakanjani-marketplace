import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Thin server-fn wrappers around SECURITY DEFINER RPCs that we have
 * intentionally revoked `EXECUTE` from the `authenticated` role on, to
 * satisfy the Supabase linter. Each wrapper authorizes the caller and then
 * invokes the underlying RPC using the service-role client.
 */

/** Public: increment a product's view count. */
export const incrementProductViews = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ product_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.rpc("increment_product_views", {
      _product_id: data.product_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Authenticated: read available stock for a product / variant. */
export const getAvailableStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: avail, error } = await supabaseAdmin.rpc("available_stock", {
      _product_id: data.product_id,
      _variant_id: (data.variant_id ?? null) as unknown as string,
    });
    if (error) throw new Error(error.message);
    return { available: Number(avail ?? 0) };
  });

/** Authenticated: cancel one of the caller's pending orders. */
export const cancelPendingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ order_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Ownership / admin check first so we don't leak ability via service role.
    const { data: order, error: oErr } = await context.supabase
      .from("orders")
      .select("id, user_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Order not found");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (order.user_id !== context.userId && !isAdmin) {
      throw new Error("Not authorized to cancel this order");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.rpc("cancel_pending_order", {
      _order_id: data.order_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });