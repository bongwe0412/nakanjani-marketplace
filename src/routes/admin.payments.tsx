import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { syncYocoPayment } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const qc = useQueryClient();
  const sync = useServerFn(syncYocoPayment);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, provider, provider_reference, status, amount, created_at, order_id")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const syncMut = useMutation({
    mutationFn: (id: string) => sync({ data: { payment_id: id } }),
    onSuccess: (res) => {
      toast.success(`Synced (remote: ${res.remote_status})`);
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <div className="rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Provider</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-left px-3 py-2">Reference</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{p.id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">{p.provider}</td>
                  <td className="px-3 py-2 capitalize">{p.status}</td>
                  <td className="px-3 py-2 text-right">R{Number(p.amount).toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.provider_reference ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => syncMut.mutate(p.id)}
                      disabled={syncMut.isPending || !p.provider_reference}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                      title="Sync against Yoco"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncMut.isPending ? "animate-spin" : ""}`} /> Sync
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}