import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Store } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/vendor-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/apply")({
  head: () => ({
    meta: [{ title: "Become a vendor — NAKANJANI Marketplace" }],
  }),
  component: VendorApplyPage,
});

const schema = z.object({
  store_name: z.string().trim().min(2, "Store name is required").max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(30).optional().or(z.literal("")),
});

function VendorApplyPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    store_name: "",
    description: "",
    email: "",
    phone: "",
    whatsapp: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: existing } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (existing) {
        navigate({ to: "/vendor/dashboard" });
        return;
      }
      setForm((f) => ({ ...f, email: session.user.email ?? "" }));
      setChecking(false);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      // Generate unique slug
      const base = slugify(parsed.data.store_name) || "vendor";
      let slug = base;
      for (let i = 0; i < 5; i++) {
        const { data: clash } = await supabase
          .from("vendors")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!clash) break;
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const { error } = await supabase.from("vendors").insert({
        user_id: session.user.id,
        store_name: parsed.data.store_name,
        slug,
        description: parsed.data.description || null,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        whatsapp: parsed.data.whatsapp || null,
      });
      if (error) throw error;
      toast.success("Application submitted. We'll review it shortly.");
      navigate({ to: "/vendor/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="surface-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/15 p-2.5 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Become a Nakanjani vendor</h1>
            <p className="text-sm text-muted-foreground">Tell us about your store. Applications are reviewed within 24 hours.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <TextField label="Store name *" value={form.store_name} onChange={(v) => setForm({ ...form, store_name: v })} placeholder="Thabo's Curated Crafts" />
          <TextArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Tell shoppers what makes your store special." />
          <TextField label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+27 ..." />
            <TextField label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="+27 ..." />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit application
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already a vendor? <Link to="/vendor/dashboard" className="font-semibold text-primary hover:underline">Go to dashboard</Link>
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
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

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}
