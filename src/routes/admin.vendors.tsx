import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, X, RotateCcw, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setVendorVerification } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/vendors")({
  component: AdminVendors,
});

function AdminVendors() {
  const qc = useQueryClient();
  const setStatus = useServerFn(setVendorVerification);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, store_name, slug, verification_status, email, phone, created_at, followers_count, rating")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "approved" | "rejected" | "suspended" }) =>
      setStatus({ data: { vendor_id: v.id, status: v.status } }),
    onSuccess: () => {
      toast.success("Vendor updated");
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
      <div className="rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>
              <th className="text-left px-3 py-2">Store</th>
              <th className="text-left px-3 py-2">Contact</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Followers</th>
              <th className="text-right px-3 py-2">Rating</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2"><div className="font-medium">{v.store_name}</div><div className="text-xs text-muted-foreground">/{v.slug}</div></td>
                  <td className="px-3 py-2 text-xs">{v.email ?? "—"}<br />{v.phone ?? ""}</td>
                  <td className="px-3 py-2 capitalize">{v.verification_status}</td>
                  <td className="px-3 py-2 text-right">{v.followers_count ?? 0}</td>
                  <td className="px-3 py-2 text-right">{Number(v.rating ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button title="Approve" onClick={() => mut.mutate({ id: v.id, status: "approved" })} disabled={mut.isPending} className="rounded border p-1 hover:bg-accent disabled:opacity-50"><Check className="h-3.5 w-3.5 text-emerald-600" /></button>
                      <button title="Reject" onClick={() => mut.mutate({ id: v.id, status: "rejected" })} disabled={mut.isPending} className="rounded border p-1 hover:bg-accent disabled:opacity-50"><X className="h-3.5 w-3.5 text-destructive" /></button>
                      <button title="Suspend" onClick={() => mut.mutate({ id: v.id, status: "suspended" })} disabled={mut.isPending} className="rounded border p-1 hover:bg-accent disabled:opacity-50"><Ban className="h-3.5 w-3.5 text-amber-600" /></button>
                      <button title="Reset to pending" onClick={() => mut.mutate({ id: v.id, status: "pending" })} disabled={mut.isPending} className="rounded border p-1 hover:bg-accent disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /></button>
                    </div>
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