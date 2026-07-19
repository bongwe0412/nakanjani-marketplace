import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatZAR } from "@/lib/mock-data";
import { loadProductsByIds } from "@/lib/products-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — NAKANJANI Marketplace" }] }),
  component: AccountPage,
});

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Role = Database["public"]["Enums"]["app_role"];
type Preferences = Database["public"]["Tables"]["account_preferences"]["Row"];
type Order = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "order_number" | "status" | "payment_status" | "total_amount" | "created_at"
>;
type Address = Pick<
  Database["public"]["Tables"]["order_addresses"]["Row"],
  "id" | "first_name" | "last_name" | "company" | "address_line_1" | "address_line_2" | "suburb" | "city" | "province" | "postal_code" | "country" | "phone" | "created_at"
>;
type Payment = Pick<
  Database["public"]["Tables"]["payments"]["Row"],
  "id" | "provider" | "status" | "amount" | "provider_reference" | "created_at" | "order_id"
> & { orders: { order_number: string | null } | null };

type AccountData = {
  profile: Profile;
  roles: Role[];
  orders: Order[];
  addresses: Address[];
  payments: Payment[];
  preferences: Preferences;
  vendor: Pick<Database["public"]["Tables"]["vendors"]["Row"], "id" | "store_name" | "verification_status" | "slug"> | null;
};

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: User },
  { id: "orders", label: "Orders", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  processing: "bg-primary/20 text-primary",
  completed: "bg-success/20 text-success",
  shipped: "bg-primary/20 text-primary",
  delivered: "bg-success/20 text-success",
  cancelled: "bg-destructive/20 text-destructive",
  paid: "bg-success/20 text-success",
  unpaid: "bg-muted text-muted-foreground",
  failed: "bg-destructive/20 text-destructive",
  refunded: "bg-secondary text-foreground",
  successful: "bg-success/20 text-success",
};

const roleLabels: Record<Role, string> = {
  customer: "Customer",
  vendor: "Vendor",
  admin: "Admin",
};

const defaultPreferences = (userId: string): Preferences => ({
  user_id: userId,
  order_updates: true,
  promotions: false,
  newsletter: false,
  product_recommendations: true,
  default_currency: "ZAR",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

function AccountPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("dashboard");
  const { wishlist, userId } = useStore();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;
      if (userError || !user) {
        if (active) {
          setAccount(null);
          setLoading(false);
          navigate({ to: "/auth", search: { mode: "signin" } });
        }
        return;
      }

      const fullName = (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null;
      const [profileRes, rolesRes, ordersRes, addressesRes, paymentsRes, prefsRes, vendorRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("orders").select("id, order_number, status, payment_status, total_amount, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("order_addresses").select("id, first_name, last_name, company, address_line_1, address_line_2, suburb, city, province, postal_code, country, phone, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("payments").select("id, provider, status, amount, provider_reference, created_at, order_id, orders ( order_number )").order("created_at", { ascending: false }).limit(10),
        supabase.from("account_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("vendors").select("id, store_name, verification_status, slug").eq("user_id", user.id).maybeSingle(),
      ]);

      let profile = profileRes.data as Profile | null;
      if (!profile) {
        const { data: createdProfile, error } = await supabase
          .from("profiles")
          .insert({ id: user.id, email: user.email ?? null, full_name: fullName })
          .select("*")
          .single();
        if (error) {
          toast.error(`Profile could not be loaded: ${error.message}`);
        }
        profile = (createdProfile as Profile | null) ?? {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          avatar_url: null,
          created_at: user.created_at,
          updated_at: user.updated_at ?? user.created_at,
        };
      }

      let preferences = prefsRes.data as Preferences | null;
      if (!preferences) {
        const { data: createdPrefs } = await supabase
          .from("account_preferences")
          .insert({ user_id: user.id })
          .select("*")
          .single();
        preferences = (createdPrefs as Preferences | null) ?? defaultPreferences(user.id);
      }

      if (!active) return;
      const roles = ((rolesRes.data ?? []).map((r) => r.role).filter(Boolean) as Role[]);
      setAccount({
        profile: {
          ...profile,
          email: profile.email ?? user.email ?? null,
          created_at: profile.created_at ?? user.created_at,
        },
        roles: roles.length ? roles : ["customer"],
        orders: (ordersRes.data ?? []) as Order[],
        addresses: (addressesRes.data ?? []) as Address[],
        payments: (paymentsRes.data ?? []) as Payment[],
        preferences,
        vendor: vendorRes.data ?? null,
      });
      setProfileName(profile.full_name ?? fullName ?? "");
      setLoading(false);
    }

    void loadAccount();
    return () => { active = false; };
  }, [navigate, userId]);

  const primaryRole = useMemo(() => {
    if (!account) return "Customer";
    if (account.roles.includes("admin")) return "Admin";
    if (account.roles.includes("vendor")) return "Vendor";
    return "Customer";
  }, [account]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed out");
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  async function saveProfile() {
    if (!account) return;
    setSavingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: profileName.trim() || null })
      .eq("id", account.profile.id)
      .select("*")
      .single();
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAccount((cur) => (cur ? { ...cur, profile: data as Profile } : cur));
    toast.success("Profile saved");
  }

  async function updatePreference(patch: Partial<Preferences>) {
    if (!account) return;
    const next = { ...account.preferences, ...patch };
    setAccount({ ...account, preferences: next });
    setSavingPrefs(true);
    const { data, error } = await supabase
      .from("account_preferences")
      .upsert({ user_id: account.profile.id, ...patch }, { onConflict: "user_id" })
      .select("*")
      .single();
    setSavingPrefs(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAccount((cur) => (cur ? { ...cur, preferences: data as Preferences } : cur));
  }

  if (loading) {
    return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!account) return null;

  const displayName = account.profile.full_name || account.profile.email || "Nakanjani member";

  return (
    <div>
      <section className="surface-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
              <User className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-2xl font-bold">{displayName}</h1>
              <p className="truncate text-sm text-muted-foreground">{account.profile.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {account.roles.map((role) => (
                  <span key={role} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <ShieldCheck className="h-3 w-3" /> {roleLabels[role]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={signOut} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:border-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="surface-card h-fit p-3 lg:sticky lg:top-24">
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>
                <t.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="surface-card p-5 sm:p-6">
          {tab === "dashboard" && <Dashboard account={account} wishlistCount={wishlist.length} role={primaryRole} />}
          {tab === "profile" && <ProfilePanel account={account} profileName={profileName} setProfileName={setProfileName} saving={savingProfile} onSave={saveProfile} />}
          {tab === "orders" && <OrdersPanel orders={account.orders} />}
          {tab === "wishlist" && <WishlistPanel wishlist={wishlist} />}
          {tab === "addresses" && <AddressesPanel addresses={account.addresses} />}
          {tab === "payments" && <PaymentsPanel payments={account.payments} />}
          {tab === "notifications" && <NotificationsPanel preferences={account.preferences} saving={savingPrefs} onChange={updatePreference} />}
          {tab === "settings" && <SettingsPanel account={account} saving={savingPrefs} onChange={updatePreference} onLogout={signOut} />}
        </section>
      </div>
    </div>
  );
}

function Dashboard({ account, wishlistCount, role }: { account: AccountData; wishlistCount: number; role: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Member since {formatDate(account.profile.created_at)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Full name" value={account.profile.full_name || "Not set"} />
        <Metric label="Email" value={account.profile.email || "Not set"} />
        <Metric label="Account created" value={formatDate(account.profile.created_at)} />
        <Metric label="Role" value={role} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Orders" value={account.orders.length} sub="Database orders" />
        <Metric label="Wishlist" value={wishlistCount} sub="Saved items" />
        <Metric label="Payments" value={account.payments.length} sub="Payment records" />
      </div>
      {account.vendor && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor account</div>
          <div className="mt-1 font-semibold">{account.vendor.store_name}</div>
          <div className="text-sm capitalize text-muted-foreground">{account.vendor.verification_status}</div>
        </div>
      )}
      <OrdersPanel orders={account.orders.slice(0, 3)} compact />
    </div>
  );
}

function ProfilePanel({ account, profileName, setProfileName, saving, onSave }: { account: AccountData; profileName: string; setProfileName: (value: string) => void; saving: boolean; onSave: () => void }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-bold">Profile</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Full name</span>
          <input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <ReadOnlyField label="Email" value={account.profile.email} />
        <ReadOnlyField label="Account creation date" value={formatDate(account.profile.created_at)} />
        <ReadOnlyField label="Role" value={account.roles.map((role) => roleLabels[role]).join(", ")} />
      </div>
      <button onClick={onSave} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
      </button>
    </div>
  );
}

function OrdersPanel({ orders, compact = false }: { orders: Order[]; compact?: boolean }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{compact ? "Recent orders" : "Orders"}</h2>
        {compact && orders.length > 0 && <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">All orders</Link>}
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="No orders yet" action={<Link to="/products" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Start shopping</Link>} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="block rounded-lg border border-border p-4 hover:border-foreground">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{o.order_number}</span>
                    <Badge value={o.status} />
                    <Badge value={o.payment_status} />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{formatDate(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="font-bold tabular-nums">{formatZAR(Number(o.total_amount))}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistPanel({ wishlist }: { wishlist: string[] }) {
  const [items, setItems] = useState<Array<{ id: string; name: string; brand: string; images: string[]; price: number }> | null>(null);

  useEffect(() => {
    let active = true;
    setItems(null);
    void loadProductsByIds(wishlist).then((products) => {
      if (active) setItems(products);
    });
    return () => { active = false; };
  }, [wishlist]);

  if (items === null) return <LoaderBlock />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Wishlist</h2>
        <Link to="/wishlist" className="text-sm font-semibold text-primary hover:underline">Manage wishlist</Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Heart} title="No saved products" action={<Link to="/products" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Discover products</Link>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <Link key={item.id} to="/product/$id" params={{ id: item.id }} className="flex gap-3 rounded-lg border border-border p-3 hover:border-foreground">
              <img src={item.images[0]} alt={item.name} className="h-16 w-16 rounded object-cover" />
              <div className="min-w-0">
                <div className="truncate text-xs uppercase tracking-wider text-muted-foreground">{item.brand}</div>
                <div className="line-clamp-2 text-sm font-semibold">{item.name}</div>
                <div className="mt-1 text-sm font-bold tabular-nums">{formatZAR(item.price)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressesPanel({ addresses }: { addresses: Address[] }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Addresses</h2>
      {addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="No checkout addresses found" action={<Link to="/products" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Shop products</Link>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-lg border border-border p-4 text-sm leading-relaxed">
              <div className="font-semibold">{a.first_name} {a.last_name}</div>
              {a.company && <div>{a.company}</div>}
              <div>{a.address_line_1}</div>
              {a.address_line_2 && <div>{a.address_line_2}</div>}
              <div>{[a.suburb, a.city].filter(Boolean).join(", ")}</div>
              <div>{a.province} {a.postal_code}</div>
              <div>{a.country}</div>
              {a.phone && <div className="mt-1 text-muted-foreground">{a.phone}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentsPanel({ payments }: { payments: Payment[] }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-bold">Payment methods</h2>
      {payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payment records found" action={<Link to="/products" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Start checkout</Link>} />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <div key={payment.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold capitalize">{payment.provider} payment</div>
                  <div className="text-xs text-muted-foreground">Order {payment.orders?.order_number ?? payment.order_id}</div>
                  {payment.provider_reference && <div className="mt-1 text-xs text-muted-foreground">Reference {payment.provider_reference}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{formatZAR(Number(payment.amount))}</div>
                  <Badge value={payment.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPanel({ preferences, saving, onChange }: { preferences: Preferences; saving: boolean; onChange: (patch: Partial<Preferences>) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Notifications</h2>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <ToggleRow label="Order updates" checked={preferences.order_updates} onChange={(value) => onChange({ order_updates: value })} />
      <ToggleRow label="Deals and promotions" checked={preferences.promotions} onChange={(value) => onChange({ promotions: value })} />
      <ToggleRow label="Newsletter" checked={preferences.newsletter} onChange={(value) => onChange({ newsletter: value })} />
      <ToggleRow label="Product recommendations" checked={preferences.product_recommendations} onChange={(value) => onChange({ product_recommendations: value })} />
    </div>
  );
}

function SettingsPanel({ account, saving, onChange, onLogout }: { account: AccountData; saving: boolean; onChange: (patch: Partial<Preferences>) => void; onLogout: () => void }) {
  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-bold">Settings</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Account ID" value={account.profile.id} />
        <ReadOnlyField label="Profile last updated" value={formatDate(account.profile.updated_at)} />
        <ReadOnlyField label="Role" value={account.roles.map((role) => roleLabels[role]).join(", ")} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Default currency</span>
          <select value={account.preferences.default_currency} onChange={(e) => onChange({ default_currency: e.target.value })} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary">
            <option value="ZAR">South African Rand (ZAR)</option>
          </select>
        </label>
      </div>
      {saving && <div className="text-sm text-muted-foreground">Saving settings…</div>}
      <button onClick={onLogout} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:border-destructive hover:text-destructive">
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-display text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">{value || "Not set"}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-primary" />
    </label>
  );
}

function EmptyState({ icon: Icon, title, action }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; action: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary"><Icon className="h-7 w-7" strokeWidth={1.2} /></div>
      <p className="mt-4 font-semibold">{title}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[value] ?? "bg-muted text-muted-foreground"}`}>{value}</span>;
}

function LoaderBlock() {
  return <div className="flex min-h-[20vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}