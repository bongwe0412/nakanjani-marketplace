import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Loader2, MapPin, ClipboardCheck, User2, ShieldCheck, Store } from "lucide-react";
import { toast } from "sonner";
import { useStore, type CartItem } from "@/lib/store";
import { formatZAR } from "@/lib/mock-data";
import { supabase } from "@/integrations/supabase/client";
import { initiateYocoPayment } from "@/lib/yoco.functions";
import { getAvailableStock, cancelPendingOrder } from "@/lib/secure-rpc.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — NAKANJANI Marketplace" }] }),
  component: CheckoutPage,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string | null | undefined): s is string => !!s && UUID_RE.test(s);

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

type ShippingForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

type AddressForm = {
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

const STEPS = [
  { id: 1, label: "Contact", short: "Contact", icon: User2 },
  { id: 2, label: "Address", short: "Address", icon: MapPin },
  { id: 3, label: "Review", short: "Review", icon: ClipboardCheck },
] as const;

function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartSubtotal, cartCount, clearCart, userId } = useStore();
  const [authReady, setAuthReady] = useState(false);
  const [step, setStep] = useState(1);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [shipping, setShipping] = useState<ShippingForm>({ firstName: "", lastName: "", phone: "", email: "" });
  const [address, setAddress] = useState<AddressForm>({
    addressLine1: "", addressLine2: "", suburb: "", city: "",
    province: "Gauteng", postalCode: "", country: "South Africa",
  });

  // Hydrate from profile and require auth.
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/auth", search: { redirect: "/checkout" } as never });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", session.user.id)
        .maybeSingle();
      const email = profile?.email ?? session.user.email ?? "";
      const fullName = profile?.full_name ?? "";
      const [first, ...rest] = fullName.split(" ");
      setShipping((s) => ({
        ...s,
        email: s.email || email,
        firstName: s.firstName || (first ?? ""),
        lastName: s.lastName || rest.join(" "),
      }));
      setAuthReady(true);
    })();
  }, [navigate]);

  const shippingPlaceholder = 0;
  const discount = 0;
  const tax = 0;
  const total = cartSubtotal + shippingPlaceholder + tax - discount;

  // Group by vendor (uuid preferred; fallback to product.vendor slug for display only).
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; vendorName: string; items: CartItem[] }>();
    for (const item of cart) {
      const k = item.vendorId ?? item.product.vendor ?? "unknown";
      const vendorName =
        item.product.vendorName ??
        (item.product.vendor ? item.product.vendor.replace(/-/g, " ") : "Vendor");
      if (!m.has(k)) m.set(k, { key: k, vendorName, items: [] });
      m.get(k)!.items.push(item);
    }
    return Array.from(m.values());
  }, [cart]);

  if (!authReady) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="surface-card mx-auto max-w-md p-8 sm:p-10 text-center">
        <h1 className="font-display text-xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add something to your cart before checking out.</p>
        <Link to="/products" className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground">Browse products</Link>
      </div>
    );
  }

  const validateStep1 = () => {
    if (!shipping.firstName.trim()) return "First name is required";
    if (!shipping.lastName.trim()) return "Last name is required";
    if (!shipping.phone.trim()) return "Phone is required";
    if (!/^\S+@\S+\.\S+$/.test(shipping.email)) return "Valid email is required";
    return null;
  };
  const validateStep2 = () => {
    if (!address.addressLine1.trim()) return "Address line 1 is required";
    if (!address.city.trim()) return "City is required";
    if (!address.province.trim()) return "Province is required";
    if (!address.postalCode.trim()) return "Postal code is required";
    if (!address.country.trim()) return "Country is required";
    return null;
  };

  const next = () => {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const placeOrder = async () => {
    if (submitting) return;
    const err1 = validateStep1(); if (err1) { toast.error(err1); setStep(1); return; }
    const err2 = validateStep2(); if (err2) { toast.error(err2); setStep(2); return; }
    if (!userId) { toast.error("Please sign in"); return; }
    if (!termsAccepted) {
      toast.error("Please accept the Terms, Privacy and Returns policies to continue");
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      // 1) Validate cart contents are DB products.
      const invalid = cart.filter((i) => !isUuid(i.product.id));
      if (invalid.length) {
        throw new Error("Some items are not available for checkout. Please remove them and try again.");
      }

      // 2) Re-validate stock & resolve vendor_id from DB authoritatively.
      const productIds = Array.from(new Set(cart.map((i) => i.product.id)));
      const variantIds = Array.from(new Set(cart.map((i) => i.variantId).filter(isUuid)));

      const [{ data: dbProducts, error: pErr }, { data: dbVariants, error: vErr }] = await Promise.all([
        supabase.from("products").select("id, vendor_id, name, price, stock_quantity, status").in("id", productIds),
        variantIds.length
          ? supabase.from("product_variants").select("id, product_id, price, stock_quantity, option_1_name, option_1_value, option_2_name, option_2_value, option_3_name, option_3_value").in("id", variantIds)
          : Promise.resolve({ data: [], error: null } as { data: never[]; error: null }),
      ]);
      if (pErr) throw pErr;
      if (vErr) throw vErr;

      const pMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));
      const vMap = new Map((dbVariants ?? []).map((v) => [v.id, v]));

      // Verify stock and build snapshots.
      type Snap = {
        item: CartItem;
        vendorId: string;
        productName: string;
        unitPrice: number;
        variantDescription: string | null;
      };
      const snaps: Snap[] = [];
      for (const it of cart) {
        const prod = pMap.get(it.product.id);
        if (!prod) throw new Error(`"${it.product.name}" is no longer available.`);
        if (prod.status !== "active") throw new Error(`"${prod.name}" is no longer available.`);

        let stock = prod.stock_quantity ?? 0;
        let unitPrice = Number(prod.price);
        let variantDescription: string | null = null;

        if (it.variantId) {
          const v = vMap.get(it.variantId);
          if (!v || v.product_id !== prod.id) {
            throw new Error(`A selected variant for "${prod.name}" is no longer available.`);
          }
          stock = v.stock_quantity ?? 0;
          if (v.price != null) unitPrice = Number(v.price);
          const parts = [
            v.option_1_name && v.option_1_value ? `${v.option_1_name}: ${v.option_1_value}` : null,
            v.option_2_name && v.option_2_value ? `${v.option_2_name}: ${v.option_2_value}` : null,
            v.option_3_name && v.option_3_value ? `${v.option_3_name}: ${v.option_3_value}` : null,
          ].filter(Boolean) as string[];
          variantDescription = parts.length ? parts.join(" · ") : null;
        }

        if (it.qty > stock) {
          throw new Error(`Only ${stock} of "${prod.name}" left in stock.`);
        }

        // Check available stock (base - active reservations) so we surface a
        // friendly out-of-stock error before the order_items trigger raises.
        const { available } = await getAvailableStock({
          data: {
            product_id: prod.id,
            variant_id: it.variantId ?? null,
          },
        });
        if (it.qty > available) {
          throw new Error(
            `Only ${available} of "${prod.name}" available right now (others are reserved). Please reduce the quantity or try again shortly.`,
          );
        }

        snaps.push({
          item: it,
          vendorId: prod.vendor_id,
          productName: prod.name,
          unitPrice,
          variantDescription,
        });
      }

      // Group snapshots by vendor for vendor_orders.
      const byVendor = new Map<string, Snap[]>();
      for (const s of snaps) {
        if (!byVendor.has(s.vendorId)) byVendor.set(s.vendorId, []);
        byVendor.get(s.vendorId)!.push(s);
      }

      // Snapshot pricing.
      const orderSubtotal = snaps.reduce((a, s) => a + s.unitPrice * s.item.qty, 0);
      const orderShipping = shippingPlaceholder;
      const orderDiscount = discount;
      const orderTax = tax;
      const orderTotal = orderSubtotal + orderShipping + orderTax - orderDiscount;

      // 3) Insert order header.
      const { data: orderRow, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          status: "pending",
          payment_status: "unpaid",
          subtotal: orderSubtotal,
          shipping_amount: orderShipping,
          discount_amount: orderDiscount,
          tax_amount: orderTax,
          total_amount: orderTotal,
          customer_name: `${shipping.firstName} ${shipping.lastName}`.trim(),
          customer_email: shipping.email.trim(),
          customer_phone: shipping.phone.trim(),
          terms_accepted_at: new Date().toISOString(),
        })
        .select("id, order_number")
        .single();
      if (oErr || !orderRow) throw oErr ?? new Error("Could not create order");

      // 4) Insert shipping address.
      const { error: aErr } = await supabase.from("order_addresses").insert({
        order_id: orderRow.id,
        first_name: shipping.firstName.trim(),
        last_name: shipping.lastName.trim(),
        phone: shipping.phone.trim(),
        address_line_1: address.addressLine1.trim(),
        address_line_2: address.addressLine2.trim() || null,
        suburb: address.suburb.trim() || null,
        city: address.city.trim(),
        province: address.province.trim(),
        postal_code: address.postalCode.trim(),
        country: address.country.trim(),
      });
      if (aErr) throw aErr;

      // 5) Insert vendor_orders.
      const vendorOrderInserts = Array.from(byVendor.entries()).map(([vendorId, items]) => {
        const sub = items.reduce((a, s) => a + s.unitPrice * s.item.qty, 0);
        return {
          order_id: orderRow.id,
          vendor_id: vendorId,
          status: "pending" as const,
          subtotal: sub,
          shipping_amount: 0,
          total_amount: sub,
        };
      });
      const { data: voRows, error: voErr } = await supabase
        .from("vendor_orders")
        .insert(vendorOrderInserts)
        .select("id, vendor_id");
      if (voErr || !voRows) throw voErr ?? new Error("Could not create vendor orders");
      const voMap = new Map(voRows.map((r) => [r.vendor_id, r.id]));

      // 6) Insert order_items.
      const itemInserts = snaps.map((s) => ({
        order_id: orderRow.id,
        vendor_order_id: voMap.get(s.vendorId)!,
        vendor_id: s.vendorId,
        product_id: s.item.product.id,
        variant_id: s.item.variantId,
        product_name: s.productName,
        variant_description: s.variantDescription,
        quantity: s.item.qty,
        unit_price: s.unitPrice,
        line_total: s.unitPrice * s.item.qty,
      }));
      const { error: iErr } = await supabase.from("order_items").insert(itemInserts);
      if (iErr) throw iErr;

      // 7) Initiate Yoco hosted checkout BEFORE clearing the cart so a
      //    failure here leaves the customer able to retry.
      let redirectUrl: string | null = null;
      try {
        const res = await initiateYocoPayment({ data: { order_id: orderRow.id } });
        redirectUrl = res.redirect_url;
      } catch (payErr) {
        console.error("[checkout] initiateYocoPayment failed", payErr);
        // Release the inventory reservations the pending order is holding so
        // the customer can immediately retry without being blocked by their
        // own stale reservation.
        try {
          await cancelPendingOrder({ data: { order_id: orderRow.id } });
        } catch (cancelErr) {
          console.error("[checkout] cancel_pending_order failed", cancelErr);
        }
        const msg = payErr instanceof Error ? payErr.message : "Could not start payment";
        toast.error(`${msg}. Your cart was kept — please try again.`);
        return;
      }

      // 8) Clear cart and hand off to Yoco hosted checkout.
      clearCart();
      window.location.href = redirectUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong placing your order.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-32 lg:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Checkout</h1>
        <Link to="/cart" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to cart
        </Link>
      </div>

      {/* Stepper */}
      <ol className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <li key={s.id} className={`surface-card flex items-center gap-2 p-2.5 sm:p-3 ${active ? "ring-2 ring-primary" : ""}`}>
              <div className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${done ? "bg-success text-success-foreground" : active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {s.id}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Step {s.id}</div>
                <div className="truncate text-sm font-semibold">{s.label}</div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 sm:mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {step === 1 && (
            <section className="surface-card p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold">Shipping information</h2>
              <p className="mt-1 text-sm text-muted-foreground">Who should we contact about this order?</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="First name" value={shipping.firstName} onChange={(v) => setShipping({ ...shipping, firstName: v })} autoComplete="given-name" />
                <Field label="Last name" value={shipping.lastName} onChange={(v) => setShipping({ ...shipping, lastName: v })} autoComplete="family-name" />
                <Field label="Phone" value={shipping.phone} onChange={(v) => setShipping({ ...shipping, phone: v })} type="tel" autoComplete="tel" />
                <Field label="Email" value={shipping.email} onChange={(v) => setShipping({ ...shipping, email: v })} type="email" autoComplete="email" />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="surface-card p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold">Delivery address</h2>
              <p className="mt-1 text-sm text-muted-foreground">Where should we deliver your order?</p>
              <div className="mt-4 grid gap-3">
                <Field label="Address line 1" value={address.addressLine1} onChange={(v) => setAddress({ ...address, addressLine1: v })} autoComplete="address-line1" />
                <Field label="Address line 2 (optional)" value={address.addressLine2} onChange={(v) => setAddress({ ...address, addressLine2: v })} autoComplete="address-line2" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Suburb" value={address.suburb} onChange={(v) => setAddress({ ...address, suburb: v })} />
                  <Field label="City" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} autoComplete="address-level2" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Province</label>
                    <select
                      value={address.province}
                      onChange={(e) => setAddress({ ...address, province: e.target.value })}
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                    >
                      {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <Field label="Postal code" value={address.postalCode} onChange={(v) => setAddress({ ...address, postalCode: v })} autoComplete="postal-code" />
                </div>
                <Field label="Country" value={address.country} onChange={(v) => setAddress({ ...address, country: v })} autoComplete="country-name" />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <div className="surface-card p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Contact</h2>
                  <button onClick={() => setStep(1)} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">Edit</button>
                </div>
                <p className="mt-2 text-sm">{shipping.firstName} {shipping.lastName}</p>
                <p className="text-sm text-muted-foreground">{shipping.email} · {shipping.phone}</p>
              </div>

              <div className="surface-card p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Deliver to</h2>
                  <button onClick={() => setStep(2)} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">Edit</button>
                </div>
                <p className="mt-2 text-sm">
                  {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[address.suburb, address.city, address.province, address.postalCode].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">{address.country}</p>
              </div>

              <div className="surface-card p-4 sm:p-6">
                <h2 className="font-display text-lg font-bold">Order review</h2>
                <div className="mt-4 space-y-5">
                  {groups.map((g) => (
                    <div key={g.key}>
                      <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Store className="h-3.5 w-3.5" />
                        <span className="capitalize">{g.vendorName}</span>
                      </div>
                      <ul className="space-y-2">
                        {g.items.map((it) => (
                          <li key={it.key} className="flex gap-3">
                            <img src={it.product.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1">
                              <div className="line-clamp-1 text-sm font-medium">{it.product.name}</div>
                              {it.variantLabel && (
                                <div className="text-[11px] text-muted-foreground">{it.variantLabel}</div>
                              )}
                              <div className="text-[11px] text-muted-foreground">Qty {it.qty}</div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums">{formatZAR(it.unitPrice * it.qty)}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span>
                  I have read and agree to the{" "}
                  <Link to="/support/terms" className="underline text-foreground">Terms</Link>,{" "}
                  <Link to="/support/privacy" className="underline text-foreground">Privacy Policy</Link>{" "}
                  and{" "}
                  <Link to="/support/returns" className="underline text-foreground">Returns &amp; Refunds</Link>{" "}
                  policy. After placing the order I will be redirected to Yoco to pay securely.
                </span>
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Card details are entered on Yoco's secure page. We never see your card number.
              </div>
            </section>
          )}

          {/* Step nav (desktop) */}
          <div className="hidden lg:flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-semibold uppercase tracking-wider disabled:opacity-40"
            >
              Back
            </button>
            {step < 3 ? (
              <button
                onClick={next}
                className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)]"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={placeOrder}
                disabled={submitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Place order
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <aside className="hidden lg:block">
          <Summary subtotal={cartSubtotal} shipping={shippingPlaceholder} discount={discount} tax={tax} total={total} count={cartCount} />
        </aside>
      </div>

      {/* Mobile sticky summary + action */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <button
          onClick={() => setSummaryOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm"
        >
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">Order summary</span>
          <span className="flex items-center gap-2">
            <span className="font-bold tabular-nums">{formatZAR(total)}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
          </span>
        </button>
        {summaryOpen && (
          <div className="border-t border-border px-4 py-3">
            <Summary subtotal={cartSubtotal} shipping={shippingPlaceholder} discount={discount} tax={tax} total={total} count={cartCount} compact />
          </div>
        )}
        <div className="flex gap-2 border-t border-border p-3">
          <button
            onClick={back}
            disabled={step === 1}
            className="h-12 flex-1 rounded-xl border border-border text-xs font-semibold uppercase tracking-wider disabled:opacity-40"
          >
            Back
          </button>
          {step < 3 ? (
            <button
              onClick={next}
              className="h-12 flex-[2] rounded-xl bg-primary text-xs font-semibold uppercase tracking-wider text-primary-foreground"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={placeOrder}
              disabled={submitting}
              className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Place order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Summary({
  subtotal, shipping, discount, tax, total, count, compact,
}: {
  subtotal: number; shipping: number; discount: number; tax: number; total: number; count: number; compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "surface-card p-5 sm:p-6"}>
      {!compact && <h2 className="font-display text-lg font-bold">Summary</h2>}
      <dl className="mt-3 space-y-2 text-sm">
        <Row k={`Subtotal (${count} item${count === 1 ? "" : "s"})`} v={formatZAR(subtotal)} />
        <Row k="Shipping" v={shipping === 0 ? "Calculated by vendor" : formatZAR(shipping)} muted />
        <Row k="Discount" v={discount === 0 ? "—" : `- ${formatZAR(discount)}`} muted />
        <Row k="Tax" v={tax === 0 ? "—" : formatZAR(tax)} muted />
      </dl>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
        <span className="font-display text-xl font-bold tabular-nums">{formatZAR(total)}</span>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={muted ? "text-muted-foreground" : ""}>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
