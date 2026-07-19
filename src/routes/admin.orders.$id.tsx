import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/orders/$id")({
  component: AdminOrderDetail,
});

function AdminOrderDetail() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-order", id],
    queryFn: async () => {
      const [order, items, payments, vendorOrders, addresses] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("payments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("vendor_orders").select("*").eq("order_id", id),
        supabase.from("order_addresses").select("*").eq("order_id", id),
      ]);
      if (order.error) throw order.error;
      const paymentIds = (payments.data ?? []).map((p) => p.id);
      let events: Array<{ event_type: string; created_at: string }> = [];
      if (paymentIds.length > 0) {
        const ev = await supabase
          .from("payment_events")
          .select("event_type, created_at, payment_id")
          .in("payment_id", paymentIds)
          .order("created_at", { ascending: false });
        events = (ev.data ?? []).map((e) => ({ event_type: e.event_type, created_at: e.created_at }));
      }
      return {
        order: order.data,
        items: items.data ?? [],
        payments: payments.data ?? [],
        events,
        vendorOrders: vendorOrders.data ?? [],
        addresses: addresses.data ?? [],
      };
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data?.order) return <div className="text-destructive text-sm">Order not found.</div>;

  const o = data.order;
  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <header>
        <h1 className="text-2xl font-semibold font-mono">{o.order_number}</h1>
        <p className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.customer_name} · {o.customer_email}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Status</div><div className="text-lg capitalize">{o.status}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Payment</div><div className="text-lg capitalize">{o.payment_status}</div></div>
        <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Total</div><div className="text-lg">R{Number(o.total_amount).toFixed(2)}</div></div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Items</h2>
        <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-x-auto">{JSON.stringify(data.items, null, 2)}</pre>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Payments</h2>
        <div className="space-y-2">
          {data.payments.length === 0 && <p className="text-sm text-muted-foreground">No payment attempts yet.</p>}
          {data.payments.map((p) => (
            <div key={p.id} className="rounded-md border p-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                <div>{p.provider} · <span className="capitalize">{p.status}</span> · R{Number(p.amount).toFixed(2)}</div>
                {p.provider_reference && <div className="text-xs text-muted-foreground">ref {p.provider_reference}</div>}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Vendor splits</h2>
        {data.vendorOrders.length === 0 ? <p className="text-sm text-muted-foreground">None yet — created on payment success.</p> : (
          <ul className="text-sm space-y-1">
            {data.vendorOrders.map((v) => (
              <li key={v.id} className="flex justify-between border-b py-1"><span className="font-mono text-xs">{v.vendor_id}</span><span className="capitalize">{v.status}</span><span>R{Number(v.total_amount).toFixed(2)}</span></li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Timeline</h2>
        <ul className="text-sm space-y-1">
          {data.events.map((e, i) => (
            <li key={i} className="border-b py-1 flex justify-between gap-4"><span className="font-medium">{e.event_type}</span><span className="text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString()}</span></li>
          ))}
          {data.events.length === 0 && <li className="text-muted-foreground">No events recorded.</li>}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Addresses</h2>
        {data.addresses.length === 0 ? <p className="text-sm text-muted-foreground">No addresses on file.</p> : (
          <pre className="rounded-md border bg-muted/30 p-3 text-xs overflow-x-auto">{JSON.stringify(data.addresses, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}