import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Sparkles, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type Movement = Database["public"]["Tables"]["inventory_movements"]["Row"];

type Draft = {
  id?: string;
  sku: string;
  option_1_name: string;
  option_1_value: string;
  option_2_name: string;
  option_2_value: string;
  option_3_name: string;
  option_3_value: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  weight: number | null;
  active: boolean;
};

function variantToDraft(v: Variant): Draft {
  return {
    id: v.id,
    sku: v.sku ?? "",
    option_1_name: v.option_1_name ?? "",
    option_1_value: v.option_1_value ?? "",
    option_2_name: v.option_2_name ?? "",
    option_2_value: v.option_2_value ?? "",
    option_3_name: v.option_3_name ?? "",
    option_3_value: v.option_3_value ?? "",
    price: Number(v.price),
    compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
    cost_price: v.cost_price != null ? Number(v.cost_price) : null,
    stock_quantity: v.stock_quantity,
    weight: v.weight != null ? Number(v.weight) : null,
    active: v.active,
  };
}

const emptyDraft = (basePrice = 0): Draft => ({
  sku: "",
  option_1_name: "",
  option_1_value: "",
  option_2_name: "",
  option_2_value: "",
  option_3_name: "",
  option_3_value: "",
  price: basePrice,
  compare_at_price: null,
  cost_price: null,
  stock_quantity: 0,
  weight: null,
  active: true,
});

export function VariantManager({ productId, basePrice }: { productId: string; basePrice: number }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Generator
  const [genOpt1Name, setGenOpt1Name] = useState("Size");
  const [genOpt1Vals, setGenOpt1Vals] = useState("S, M, L, XL");
  const [genOpt2Name, setGenOpt2Name] = useState("Color");
  const [genOpt2Vals, setGenOpt2Vals] = useState("Black, White");
  const [genOpt3Name, setGenOpt3Name] = useState("");
  const [genOpt3Vals, setGenOpt3Vals] = useState("");
  const [generating, setGenerating] = useState(false);

  async function reload() {
    const [{ data: vs }, { data: ms }] = await Promise.all([
      supabase.from("product_variants").select("*").eq("product_id", productId).order("created_at"),
      supabase.from("inventory_movements").select("*").eq("product_id", productId).order("created_at", { ascending: false }).limit(50),
    ]);
    setVariants(vs ?? []);
    setMovements(ms ?? []);
    setDrafts(Object.fromEntries((vs ?? []).map((v) => [v.id, variantToDraft(v)])));
    setLoading(false);
  }

  useEffect(() => { void reload(); }, [productId]);

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  }

  async function recordMovement(opts: {
    variantId: string | null;
    delta: number;
    notes: string;
  }) {
    if (opts.delta === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    const movement_type = opts.delta > 0 ? "stock_in" : "stock_out";
    await supabase.from("inventory_movements").insert({
      product_id: productId,
      variant_id: opts.variantId,
      movement_type,
      quantity: Math.abs(opts.delta),
      notes: opts.notes,
      created_by: session?.user.id ?? null,
    });
  }

  async function saveExisting(v: Variant) {
    const d = drafts[v.id];
    if (!d) return;
    setSavingId(v.id);
    try {
      const delta = d.stock_quantity - v.stock_quantity;
      const { error } = await supabase.from("product_variants").update({
        sku: d.sku || null,
        option_1_name: d.option_1_name || null,
        option_1_value: d.option_1_value || null,
        option_2_name: d.option_2_name || null,
        option_2_value: d.option_2_value || null,
        option_3_name: d.option_3_name || null,
        option_3_value: d.option_3_value || null,
        price: d.price,
        compare_at_price: d.compare_at_price,
        cost_price: d.cost_price,
        stock_quantity: d.stock_quantity,
        weight: d.weight,
        active: d.active,
      }).eq("id", v.id);
      if (error) throw error;
      if (delta !== 0) {
        await recordMovement({ variantId: v.id, delta, notes: "Vendor stock update" });
      }
      toast.success("Variant saved");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteVariant(v: Variant) {
    if (!confirm("Delete this variant?")) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Variant deleted");
    await reload();
  }

  async function addBlank() {
    const d = emptyDraft(basePrice);
    const { data, error } = await supabase.from("product_variants").insert({
      product_id: productId,
      price: d.price,
      stock_quantity: 0,
      active: true,
    }).select("*").single();
    if (error) return toast.error(error.message);
    toast.success("Variant added");
    await reload();
    return data;
  }

  async function generateCombinations() {
    const v1 = genOpt1Vals.split(",").map((s) => s.trim()).filter(Boolean);
    const v2 = genOpt2Vals.split(",").map((s) => s.trim()).filter(Boolean);
    const v3 = genOpt3Vals.split(",").map((s) => s.trim()).filter(Boolean);
    if (!genOpt1Name || v1.length === 0) {
      return toast.error("Provide at least option 1 name and values");
    }
    const combos: { o1n: string; o1v: string; o2n: string; o2v: string; o3n: string; o3v: string }[] = [];
    const list2 = v2.length ? v2 : [""];
    const list3 = v3.length ? v3 : [""];
    for (const a of v1) for (const b of list2) for (const c of list3) {
      combos.push({
        o1n: genOpt1Name, o1v: a,
        o2n: b ? genOpt2Name : "", o2v: b,
        o3n: c ? genOpt3Name : "", o3v: c,
      });
    }
    // Skip combos that already exist
    const existingKeys = new Set(
      variants.map((v) => `${v.option_1_value ?? ""}|${v.option_2_value ?? ""}|${v.option_3_value ?? ""}`),
    );
    const fresh = combos.filter((c) => !existingKeys.has(`${c.o1v}|${c.o2v}|${c.o3v}`));
    if (fresh.length === 0) return toast.info("All combinations already exist");
    setGenerating(true);
    try {
      const rows = fresh.map((c) => ({
        product_id: productId,
        option_1_name: c.o1n || null,
        option_1_value: c.o1v || null,
        option_2_name: c.o2n || null,
        option_2_value: c.o2v || null,
        option_3_name: c.o3n || null,
        option_3_value: c.o3v || null,
        price: basePrice,
        stock_quantity: 0,
        active: true,
      }));
      const { error } = await supabase.from("product_variants").insert(rows);
      if (error) throw error;
      toast.success(`Created ${fresh.length} variant${fresh.length === 1 ? "" : "s"}`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="surface-card space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Variants & inventory</h2>
          <p className="text-xs text-muted-foreground">Add size, color, storage, etc. Every stock change is logged.</p>
        </div>
        <button
          type="button"
          onClick={() => void addBlank()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-card"
        >
          <Plus className="h-4 w-4" /> Add variant
        </button>
      </div>

      {/* Generator */}
      <div className="rounded-lg border border-dashed border-border p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" /> Generate combinations
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Field label="Option 1 name" value={genOpt1Name} onChange={setGenOpt1Name} placeholder="Size" />
            <Field label="Values (comma-separated)" value={genOpt1Vals} onChange={setGenOpt1Vals} placeholder="S, M, L, XL" />
          </div>
          <div className="space-y-2">
            <Field label="Option 2 name" value={genOpt2Name} onChange={setGenOpt2Name} placeholder="Color" />
            <Field label="Values (comma-separated)" value={genOpt2Vals} onChange={setGenOpt2Vals} placeholder="Black, White" />
          </div>
          <div className="space-y-2">
            <Field label="Option 3 name" value={genOpt3Name} onChange={setGenOpt3Name} placeholder="Storage" />
            <Field label="Values (comma-separated)" value={genOpt3Vals} onChange={setGenOpt3Vals} placeholder="" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void generateCombinations()}
          disabled={generating}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate
        </button>
      </div>

      {/* Variant list */}
      {variants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No variants yet. Use the generator above or add manually.
        </p>
      ) : (
        <div className="space-y-3">
          {variants.map((v) => {
            const d = drafts[v.id] ?? variantToDraft(v);
            return (
              <div key={v.id} className="rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-6">
                  <Field label="Opt 1 name" value={d.option_1_name} onChange={(x) => updateDraft(v.id, { option_1_name: x })} />
                  <Field label="Opt 1 value" value={d.option_1_value} onChange={(x) => updateDraft(v.id, { option_1_value: x })} />
                  <Field label="Opt 2 name" value={d.option_2_name} onChange={(x) => updateDraft(v.id, { option_2_name: x })} />
                  <Field label="Opt 2 value" value={d.option_2_value} onChange={(x) => updateDraft(v.id, { option_2_value: x })} />
                  <Field label="Opt 3 name" value={d.option_3_name} onChange={(x) => updateDraft(v.id, { option_3_name: x })} />
                  <Field label="Opt 3 value" value={d.option_3_value} onChange={(x) => updateDraft(v.id, { option_3_value: x })} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-6">
                  <Field label="SKU" value={d.sku} onChange={(x) => updateDraft(v.id, { sku: x })} />
                  <NumField label="Price *" value={d.price} onChange={(n) => updateDraft(v.id, { price: n ?? 0 })} />
                  <NumField label="Compare at" value={d.compare_at_price} onChange={(n) => updateDraft(v.id, { compare_at_price: n })} nullable />
                  <NumField label="Cost price" value={d.cost_price} onChange={(n) => updateDraft(v.id, { cost_price: n })} nullable />
                  <NumField label="Stock *" value={d.stock_quantity} onChange={(n) => updateDraft(v.id, { stock_quantity: n ?? 0 })} integer />
                  <NumField label="Weight (kg)" value={d.weight} onChange={(n) => updateDraft(v.id, { weight: n })} nullable />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={d.active}
                      onChange={(e) => updateDraft(v.id, { active: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    Active
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void deleteVariant(v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveExisting(v)}
                      disabled={savingId === v.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    >
                      {savingId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Movement history */}
      {movements.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Recent inventory movements</h3>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const v = variants.find((x) => x.id === m.variant_id);
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 capitalize">{m.movement_type.replace("_", " ")}</td>
                      <td className="px-3 py-2 tabular-nums">{m.quantity}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {v ? [v.option_1_value, v.option_2_value, v.option_3_value].filter(Boolean).join(" / ") || "—" : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{m.notes ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function NumField({
  label, value, onChange, integer, nullable,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  integer?: boolean;
  nullable?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        step={integer ? 1 : "0.01"}
        value={value === null ? "" : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") return onChange(nullable ? null : 0);
          onChange(Number(v));
        }}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
