import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, GripVertical, ImageIcon } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { signedStorageUrl } from "@/lib/products-data";
import { VariantManager } from "@/components/VariantManager";
import { slugify } from "@/lib/vendor-utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const STATUSES = [
  { value: "draft", label: "Draft (not visible)" },
  { value: "active", label: "Active (live in store)" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "archived", label: "Archived" },
] as const;

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  short_description: z.string().trim().max(280).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  sku: z.string().trim().max(60).optional().or(z.literal("")),
  brand: z.string().trim().max(60).optional().or(z.literal("")),
  price: z.coerce.number().min(0).max(10_000_000),
  compare_at_price: z.coerce.number().min(0).max(10_000_000).optional(),
  cost_price: z.coerce.number().min(0).max(10_000_000).optional(),
  stock_quantity: z.coerce.number().int().min(0).max(1_000_000),
  weight: z.coerce.number().min(0).max(1000).optional(),
  dim_length: z.string().trim().max(20).optional().or(z.literal("")),
  dim_width: z.string().trim().max(20).optional().or(z.literal("")),
  dim_height: z.string().trim().max(20).optional().or(z.literal("")),
  category_id: z.string().uuid().nullable().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "active", "out_of_stock", "archived"]),
  featured: z.boolean(),
});

type FormValues = z.input<typeof schema>;

const empty: FormValues = {
  name: "",
  slug: "",
  short_description: "",
  description: "",
  sku: "",
  brand: "",
  price: 0,
  compare_at_price: undefined,
  cost_price: undefined,
  stock_quantity: 0,
  weight: undefined,
  dim_length: "",
  dim_width: "",
  dim_height: "",
  category_id: null,
  subcategory_id: null,
  status: "draft",
  featured: false,
};

export function ProductForm({
  vendorId,
  product,
  onSaved,
}: {
  vendorId: string;
  product: Product | null;
  onSaved: (savedId: string) => void;
}) {
  const [form, setForm] = useState<FormValues>(empty);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setCategories(cats ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("subcategories")
        .select("*")
        .eq("category_id", form.category_id!)
        .eq("is_active", true)
        .order("sort_order");
      setSubcategories(data ?? []);
    })();
  }, [form.category_id]);

  useEffect(() => {
    if (!product) return;
    const dim = (product.dimensions ?? {}) as { length?: string; width?: string; height?: string };
    setForm({
      name: product.name,
      slug: product.slug,
      short_description: product.short_description ?? "",
      description: product.description ?? "",
      sku: product.sku ?? "",
      brand: product.brand ?? "",
      price: Number(product.price),
      compare_at_price: product.compare_at_price != null ? Number(product.compare_at_price) : undefined,
      cost_price: product.cost_price != null ? Number(product.cost_price) : undefined,
      stock_quantity: product.stock_quantity,
      weight: product.weight != null ? Number(product.weight) : undefined,
      dim_length: dim.length ?? "",
      dim_width: dim.width ?? "",
      dim_height: dim.height ?? "",
      category_id: product.category_id,
      subcategory_id: product.subcategory_id,
      status: product.status,
      featured: product.featured,
    });
    void loadImages(product.id);
  }, [product]);

  async function loadImages(productId: string) {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setImages(data ?? []);
    const urls = await Promise.all(
      (data ?? []).map(async (img) => [img.id, (await signedStorageUrl(img.image_url)) ?? ""] as const),
    );
    setImageUrls(Object.fromEntries(urls));
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!product) {
      toast.error("Save the product first, then add images");
      return;
    }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      let nextOrder = (images.at(-1)?.sort_order ?? -1) + 1;
      for (const file of Array.from(files)) {
        if (!ALLOWED.includes(file.type)) { toast.error(`${file.name}: JPG/PNG/WebP only`); continue; }
        if (file.size > MAX_FILE_BYTES) { toast.error(`${file.name}: must be under 5MB`); continue; }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${session.user.id}/${product.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) { toast.error(upErr.message); continue; }
        const { error: insErr } = await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: `product-images/${path}`,
          sort_order: nextOrder++,
        });
        if (insErr) toast.error(insErr.message);
      }
      await loadImages(product.id);
      toast.success("Images uploaded");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(img: ProductImage) {
    if (!confirm("Delete this image?")) return;
    const path = img.image_url.startsWith("product-images/") ? img.image_url.slice("product-images/".length) : null;
    if (path) await supabase.storage.from("product-images").remove([path]);
    await supabase.from("product_images").delete().eq("id", img.id);
    if (product) await loadImages(product.id);
  }

  async function reorderImage(img: ProductImage, dir: -1 | 1) {
    const i = images.findIndex((x) => x.id === img.id);
    const swap = images[i + dir];
    if (!swap) return;
    const a = img.sort_order;
    const b = swap.sort_order;
    await Promise.all([
      supabase.from("product_images").update({ sort_order: a === b ? a + dir : b }).eq("id", img.id),
      supabase.from("product_images").update({ sort_order: a }).eq("id", swap.id),
    ]);
    if (product) await loadImages(product.id);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const v = { ...form, slug: form.slug || slugify(form.name) };
    const parsed = schema.safeParse(v);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    setSaving(true);
    try {
      const dims: Record<string, string> = {};
      if (parsed.data.dim_length) dims.length = parsed.data.dim_length;
      if (parsed.data.dim_width) dims.width = parsed.data.dim_width;
      if (parsed.data.dim_height) dims.height = parsed.data.dim_height;

      const payload = {
        vendor_id: vendorId,
        category_id: parsed.data.category_id ?? null,
        subcategory_id: parsed.data.subcategory_id ?? null,
        name: parsed.data.name,
        slug: parsed.data.slug,
        short_description: parsed.data.short_description || null,
        description: parsed.data.description || null,
        sku: parsed.data.sku || null,
        brand: parsed.data.brand || null,
        price: parsed.data.price,
        compare_at_price: parsed.data.compare_at_price ?? null,
        cost_price: parsed.data.cost_price ?? null,
        stock_quantity: parsed.data.stock_quantity,
        weight: parsed.data.weight ?? null,
        dimensions: Object.keys(dims).length ? dims : null,
        status: parsed.data.status,
        featured: parsed.data.featured,
      };

      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        const delta = parsed.data.stock_quantity - product.stock_quantity;
        if (delta !== 0) {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from("inventory_movements").insert({
            product_id: product.id,
            variant_id: null,
            movement_type: delta > 0 ? "stock_in" : "stock_out",
            quantity: Math.abs(delta),
            notes: "Vendor stock update (product)",
            created_by: session?.user.id ?? null,
          });
        }
        toast.success("Product saved");
        onSaved(product.id);
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        if (parsed.data.stock_quantity > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          await supabase.from("inventory_movements").insert({
            product_id: data.id,
            variant_id: null,
            movement_type: "stock_in",
            quantity: parsed.data.stock_quantity,
            notes: "Initial stock",
            created_by: session?.user.id ?? null,
          });
        }
        toast.success("Product created. You can now add images.");
        onSaved(data.id);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save";
      toast.error(/duplicate key/i.test(msg) ? "Slug already in use, choose another." : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Basics */}
      <section className="surface-card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Product details</h2>
        <Text label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: form.slug || slugify(v) })} />
        <Text label="Slug *" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} hint="Used in the URL: /product/<slug>" />
        <Text label="Short description" value={form.short_description ?? ""} onChange={(v) => setForm({ ...form, short_description: v })} hint="Appears in product cards. Max 280 characters." />
        <Area label="Full description" value={form.description ?? ""} onChange={(v) => setForm({ ...form, description: v })} rows={6} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Brand" value={form.brand ?? ""} onChange={(v) => setForm({ ...form, brand: v })} />
          <Text label="SKU" value={form.sku ?? ""} onChange={(v) => setForm({ ...form, sku: v })} />
        </div>
      </section>

      {/* Category */}
      <section className="surface-card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={form.category_id ?? ""}
            onChange={(v) => setForm({ ...form, category_id: v || null, subcategory_id: null })}
            options={[{ value: "", label: "— None —" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label="Subcategory"
            value={form.subcategory_id ?? ""}
            onChange={(v) => setForm({ ...form, subcategory_id: v || null })}
            disabled={!form.category_id || subcategories.length === 0}
            options={[{ value: "", label: subcategories.length ? "— None —" : "No subcategories" }, ...subcategories.map((s) => ({ value: s.id, label: s.name }))]}
          />
        </div>
      </section>

      {/* Pricing & stock */}
      <section className="surface-card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Pricing & inventory</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="Price (ZAR) *" type="number" value={String(form.price ?? 0)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
          <Text label="Compare at" type="number" value={form.compare_at_price != null ? String(form.compare_at_price) : ""} onChange={(v) => setForm({ ...form, compare_at_price: v === "" ? undefined : Number(v) })} hint="Original price (for sale display)" />
          <Text label="Cost price" type="number" value={form.cost_price != null ? String(form.cost_price) : ""} onChange={(v) => setForm({ ...form, cost_price: v === "" ? undefined : Number(v) })} hint="Internal only" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="Stock quantity *" type="number" value={String(form.stock_quantity ?? 0)} onChange={(v) => setForm({ ...form, stock_quantity: Number(v) })} />
          <Text label="Weight (kg)" type="number" value={form.weight != null ? String(form.weight) : ""} onChange={(v) => setForm({ ...form, weight: v === "" ? undefined : Number(v) })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="Length" value={form.dim_length ?? ""} onChange={(v) => setForm({ ...form, dim_length: v })} hint="e.g. 30cm" />
          <Text label="Width" value={form.dim_width ?? ""} onChange={(v) => setForm({ ...form, dim_width: v })} />
          <Text label="Height" value={form.dim_height ?? ""} onChange={(v) => setForm({ ...form, dim_height: v })} />
        </div>
      </section>

      {/* Visibility */}
      <section className="surface-card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Visibility</h2>
        <Select
          label="Status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v as FormValues["status"] })}
          options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Feature this product on the marketplace homepage
        </label>
      </section>

      {/* Images */}
      <section className="surface-card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Images</h2>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !product}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }}
          />
        </div>
        {!product && (
          <p className="text-sm text-muted-foreground">Save the product first, then add images.</p>
        )}
        {product && images.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-muted-foreground">
            <ImageIcon className="mr-2 h-5 w-5" /> No images yet
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={img.id} className="surface-card group relative overflow-hidden">
              <div className="aspect-square bg-muted">
                {imageUrls[img.id] && (
                  <img src={imageUrls[img.id]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-background/90 p-1 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button type="button" onClick={() => reorderImage(img, -1)} disabled={i === 0} className="rounded p-1 hover:bg-card disabled:opacity-30" title="Move left">
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
                <button type="button" onClick={() => removeImage(img)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase text-background">Cover</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {product && <VariantManager productId={product.id} basePrice={Number(form.price) || 0} />}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background px-4 py-3 sm:relative sm:mx-0 sm:rounded-lg sm:border-0 sm:p-0">

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

function Text({
  label, value, onChange, type = "text", hint,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Area({
  label, value, onChange, rows = 4,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}

function Select({
  label, value, onChange, options, disabled,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary disabled:opacity-50"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
