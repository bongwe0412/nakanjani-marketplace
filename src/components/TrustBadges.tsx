import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Truck, RotateCcw, Lock, BadgeCheck } from "lucide-react";

export type TrustBadge = { icon: LucideIcon; title: string; desc?: string };

export const TRUST_PRESETS = {
  checkout: [
    { icon: Lock, title: "SSL secured" },
    { icon: ShieldCheck, title: "Buyer protection" },
    { icon: BadgeCheck, title: "PCI compliant" },
    { icon: RotateCcw, title: "30-day returns" },
  ] satisfies TrustBadge[],
  product: [
    { icon: Truck, title: "Nationwide shipping", desc: "Free over R500" },
    { icon: RotateCcw, title: "30-day returns", desc: "Complimentary" },
    { icon: ShieldCheck, title: "Buyer protection", desc: "Guaranteed" },
  ] satisfies TrustBadge[],
} as const;

export function TrustBadges({ items, variant = "row" }: { items: readonly TrustBadge[]; variant?: "row" | "grid" }) {
  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((b) => (
          <div key={b.title} className="surface-card flex items-center gap-2.5 p-3">
            <b.icon className="h-4 w-4 shrink-0 text-foreground" />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold uppercase tracking-wider">{b.title}</div>
              {b.desc && <div className="truncate text-[10px] text-muted-foreground">{b.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map((b) => (
        <span key={b.title} className="inline-flex items-center gap-1.5">
          <b.icon className="h-3.5 w-3.5" />
          <span>{b.title}</span>
        </span>
      ))}
    </div>
  );
}
