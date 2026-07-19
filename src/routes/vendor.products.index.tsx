import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatZAR } from "@/lib/mock-data";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export const Route = createFileRoute("/vendor/products/")({
  head: () => ({ meta: [{ title: "My products — NAKANJANI Marketplace" }] }),
  component: VendorProductsPage,
});

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/20 text-success",
  out_of_stock: "bg-warning/20 text-warning",
  archived: "bg-muted text-muted-foreground",
};

function VendorProductsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth" }); return; }
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, verification_status")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!vendor) { navigate({ to: "/vendor/apply" }); return; }
      setVendorId(vendor.id);
      await load(vendor.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(vId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("vendor_id", vId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    if (vendorId) await load(vendorId);
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">My products</h1>
          <p className="text-sm text-muted-foreground">{items.length} product{items.length === 1 ? "" : "s"}</p>
        </div>
        <Link
          to="/vendor/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New product
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg font-bold">No products yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add your first product to start selling on Nakanjani.</p>
          <Link to="/vendor/products/new" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New product
          </Link>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 hidden md:table-cell">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 hidden sm:table-cell">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.sku ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{formatZAR(Number(p.price))}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{p.stock_quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${statusStyles[p.status]}`}>
                      {p.status.replace("_", " ")}
                    </span>
                    {p.featured && (
                      <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">Featured</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to="/vendor/products/$id/edit"
                        params={{ id: p.id }}
                        className="rounded p-1.5 hover:bg-card"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button onClick={() => remove(p)} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
