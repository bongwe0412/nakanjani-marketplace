import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Upload, X, ShieldAlert, Image as ImageIcon,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl, slugify } from "@/lib/vendor-utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Category = Database["public"]["Tables"]["categories"]["Row"];

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Admin · Categories — NAKANJANI Marketplace" }] }),
  component: AdminCategoriesPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  icon: z.string().trim().max(40).optional().or(z.literal("")),
});

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const admin = !!roles?.some((r) => r.role === "admin");
      setIsAdmin(admin);
      setAuthChecked(true);
      if (admin) await load();
      else setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setItems(data ?? []);
    // Resolve signed URLs for any images
    const entries = await Promise.all(
      (data ?? [])
        .filter((c) => c.image_url)
        .map(async (c) => [c.id, (await getStorageUrl(c.image_url)) ?? ""] as const),
    );
    setImageMap(Object.fromEntries(entries));
    setLoading(false);
  }

  async function toggleActive(c: Category) {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.is_active ? "Category disabled" : "Category enabled");
    await load();
  }

  async function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"? This also removes its subcategories.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    await load();
  }

  async function move(c: Category, dir: -1 | 1) {
    const idx = items.findIndex((x) => x.id === c.id);
    const swap = items[idx + dir];
    if (!swap) return;
    const a = c.sort_order;
    const b = swap.sort_order;
    // If equal, give them deterministic spacing first
    const newA = a === b ? (dir === -1 ? a - 1 : a + 1) : b;
    const newB = a === b ? a : a;
    const [u1, u2] = await Promise.all([
      supabase.from("categories").update({ sort_order: newA }).eq("id", c.id),
      supabase.from("categories").update({ sort_order: newB }).eq("id", swap.id),
    ]);
    if (u1.error || u2.error) return toast.error("Could not reorder");
    await load();
  }

  if (!authChecked || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <div className="surface-card p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-3 font-display text-xl font-bold">Admins only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You need the admin role to manage categories.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage marketplace categories shown to shoppers.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New category
        </button>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 hidden md:table-cell">Slug</th>
              <th className="px-4 py-3 hidden md:table-cell">Icon</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => move(c, -1)}
                      disabled={i === 0}
                      className="rounded p-1 hover:bg-card disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(c, 1)}
                      disabled={i === items.length - 1}
                      className="rounded p-1 hover:bg-card disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {imageMap[c.id] ? (
                        <img src={imageMap[c.id]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground truncate">{c.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.icon ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.is_active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {c.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleActive(c)} className="rounded p-1.5 hover:bg-card" title={c.is_active ? "Disable" : "Enable"}>
                      {c.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditing(c)} className="rounded p-1.5 hover:bg-card" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(c)} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <CategoryDialog
          category={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={async () => { setEditing(null); setCreating(false); await load(); }}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(category?.image_url ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getStorageUrl(imagePath).then(setImageUrl);
  }, [imagePath]);

  async function handleUpload(file: File) {
    if (!ALLOWED.includes(file.type)) return toast.error("Use JPG, PNG, WebP, or SVG");
    if (file.size > MAX_FILE_BYTES) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const slugPart = form.slug || slugify(form.name) || "category";
      const path = `${slugPart}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("category-images").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;
      setImagePath(`category-images/${path}`);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const auto = { ...form, slug: form.slug || slugify(form.name) };
    const parsed = schema.safeParse(auto);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
    setSaving(true);
    try {
      if (category) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description || null,
            icon: parsed.data.icon || null,
            image_url: imagePath,
          })
          .eq("id", category.id);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        // Next sort_order = max + 10
        const { data: last } = await supabase
          .from("categories")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        const next = (last?.sort_order ?? 0) + 10;
        const { error } = await supabase.from("categories").insert({
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description || null,
          icon: parsed.data.icon || null,
          image_url: imagePath,
          sort_order: next,
        });
        if (error) throw error;
        toast.success("Category created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="surface-card w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">{category ? "Edit category" : "New category"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-card"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</div>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {imagePath ? "Replace" : "Upload"} image
              </button>
              {imagePath && (
                <button
                  type="button"
                  onClick={() => { setImagePath(null); setImageUrl(null); }}
                  className="text-xs text-muted-foreground underline"
                >
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <Text label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: form.slug || slugify(v) })} />
          <Text label="Slug *" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="auto-generated from name" />
          <Text label="Icon (lucide name)" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} placeholder="e.g. shirt" />
          <Area label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-card">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {category ? "Save changes" : "Create category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Text({
  label, value, onChange, placeholder, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}
