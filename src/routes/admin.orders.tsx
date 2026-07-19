import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const PAGE_SIZE = 50;

function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter, paymentFilter, search],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_email, status, payment_status, total_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as never);
      if (paymentFilter !== "all") q = q.eq("payment_status", paymentFilter as never);
      if (search.trim()) q = q.or(`order_number.ilike.%${search.trim()}%,customer_email.ilike.%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order # or email"
          className="rounded-md border bg-background px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select className="rounded-md border bg-background px-2 py-1.5" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="rounded-md border bg-background px-2 py-1.5" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
          <option value="all">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>
      <div className="rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No orders match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Payment</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono">
                    <Link to="/admin/orders/$id" params={{ id: o.id }} className="text-primary hover:underline">{o.order_number}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.customer_email}</div>
                  </td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                  <td className="px-3 py-2 capitalize">{o.payment_status}</td>
                  <td className="px-3 py-2 text-right">R{Number(o.total_amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}