import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support/shipping")({
  head: () => ({ meta: [{ title: "Shipping policy — NAKANJANI Marketplace" }] }),
  component: () => (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Shipping policy</h1>
      <p className="mt-3 text-muted-foreground">We deliver across South Africa with three convenient options.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[["Standard", "R49 · Free over R500", "2–4 business days"], ["Express", "R99", "1–2 business days"], ["Click & collect", "Free", "1–3 business days"]].map(([t, p, d]) => (
          <div key={t} className="surface-card p-5">
            <div className="font-semibold">{t}</div>
            <div className="mt-1 text-sm text-primary">{p}</div>
            <div className="text-xs text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>
    </div>
  ),
});
