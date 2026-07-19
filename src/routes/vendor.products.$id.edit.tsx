import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/ProductForm";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

export const Route = createFileRoute("/vendor/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit product — NAKANJANI Marketplace" }] }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth" }); return; }
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!vendor) { navigate({ to: "/vendor/apply" }); return; }
      setVendorId(vendor.id);

      const { data: p, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("vendor_id", vendor.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (!p) {
        toast.error("Product not found");
        navigate({ to: "/vendor/products" });
        return;
      }
      setProduct(p);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading || !vendorId || !product) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      <Link to="/vendor/products" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-bold">Edit product</h1>
        {product.status === "active" && (
          <Link to="/product/$id" params={{ id: product.slug }} className="text-sm font-semibold text-primary hover:underline">
            View live →
          </Link>
        )}
      </div>
      <ProductForm
        vendorId={vendorId}
        product={product}
        onSaved={async () => {
          const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
          if (data) setProduct(data);
        }}
      />
    </div>
  );
}
