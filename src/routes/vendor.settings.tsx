import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Image as ImageIcon, Store } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/vendor-utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

export const Route = createFileRoute("/vendor/settings")({
  head: () => ({
    meta: [{ title: "Vendor settings — NAKANJANI Marketplace" }],
  }),
  component: VendorSettingsPage,
});

const schema = z.object({
  store_name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
});

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

function VendorSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState({ store_name: "", description: "", email: "", phone: "", whatsapp: "" });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data } = await supabase
        .from("vendors")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (!data) {
        navigate({ to: "/vendor/apply" });
        return;
      }
      setVendor(data);
      setForm({
        store_name: data.store_name,
        description: data.description ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        whatsapp: data.whatsapp ?? "",
      });
      const [l, b] = await Promise.all([getStorageUrl(data.logo_url), getStorageUrl(data.banner_url)]);
      setLogoUrl(l);
      setBannerUrl(b);
      setLoading(false);
    })();
  }, [navigate]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("vendors")
        .update({
          store_name: parsed.data.store_name,
          description: parsed.data.description || null,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          whatsapp: parsed.data.whatsapp || null,
        })
        .eq("id", vendor.id);
      if (error) throw error;
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind: "logo" | "banner", file: File) {
    if (!vendor) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(kind);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const bucket = kind === "logo" ? "vendor-logos" : "vendor-banners";
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const fullPath = `${bucket}/${path}`;
      const { error: updErr } = await supabase
        .from("vendors")
        .update(kind === "logo" ? { logo_url: fullPath } : { banner_url: fullPath })
        .eq("id", vendor.id);
      if (updErr) throw updErr;
      const signed = await getStorageUrl(fullPath);
      if (kind === "logo") setLogoUrl(signed);
      else setBannerUrl(signed);
      toast.success(`${kind === "logo" ? "Logo" : "Banner"} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  if (loading || !vendor) {
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
          <h1 className="font-display text-2xl font-bold">Store settings</h1>
          <p className="text-sm text-muted-foreground">Manage how your store appears on Nakanjani.</p>
        </div>
        <Link to="/vendor/dashboard" className="text-sm font-semibold text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>

      {/* Branding */}
      <div className="surface-card p-5">
        <h2 className="font-display text-lg font-bold">Branding</h2>

        {/* Banner */}
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Banner</div>
          <div
            className="relative h-32 w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 to-secondary/40 sm:h-40"
            style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {!bannerUrl && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
            <button
              type="button"
              onClick={() => bannerInput.current?.click()}
              disabled={uploading === "banner"}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-background/95 px-3 py-1.5 text-sm font-semibold shadow disabled:opacity-60"
            >
              {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bannerUrl ? "Replace" : "Upload"} banner
            </button>
            <input
              ref={bannerInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload("banner", f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Recommended: 1600 × 400px. JPG, PNG, or WebP. Max 5MB.</p>
        </div>

        {/* Logo */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo</div>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Store className="h-7 w-7" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              disabled={uploading === "logo"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card disabled:opacity-60"
            >
              {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {logoUrl ? "Replace" : "Upload"} logo
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload("logo", f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Recommended: square, 400 × 400px. Max 5MB.</p>
        </div>
      </div>

      {/* Store info form */}
      <form onSubmit={handleSave} className="surface-card space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">Store information</h2>
        <Text label="Store name *" value={form.store_name} onChange={(v) => setForm({ ...form, store_name: v })} />
        <Area label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Text label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Text label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}
