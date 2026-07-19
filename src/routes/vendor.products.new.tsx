import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/vendor/products/new")({
  head: () => ({ meta: [{ title: "New product — NAKANJANI Marketplace" }] }),
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState<string | null>(null);
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
      setLoading(false);
    })();
  }, [navigate]);

  if (loading || !vendorId) {
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
      <h1 className="font-display text-2xl font-bold">New product</h1>
      <ProductForm
        vendorId={vendorId}
        product={null}
        onSaved={(id) => navigate({ to: "/vendor/products/$id/edit", params: { id } })}
      />
    </div>
  );
}
