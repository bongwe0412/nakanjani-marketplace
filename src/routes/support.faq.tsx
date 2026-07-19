import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/support/faq")({
  head: () => ({ meta: [{ title: "FAQ — NAKANJANI Marketplace" }] }),
  component: FaqPage,
});

const faqs = [
  { q: "How long does delivery take?", a: "Standard delivery takes 2-4 business days nationwide. Express is 1-2 days in major cities." },
  { q: "What payment methods are accepted?", a: "Credit & debit cards via Yoco — Visa, Mastercard and Apple/Google Pay supported at checkout." },
  { q: "Can I return a product?", a: "Yes — you have 30 days to return unused items in original packaging for a full refund." },
  { q: "Do you ship internationally?", a: "Currently we ship to South Africa, Namibia, Botswana, Lesotho and eSwatini." },
  { q: "How do I track my order?", a: "Sign in and visit Account → Order tracking. You'll also get email and SMS updates." },
  { q: "Are products covered by warranty?", a: "All electronics include a minimum 12-month manufacturer warranty." },
];

function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Frequently asked questions</h1>
      <div className="mt-6 space-y-2">
        {faqs.map((f, i) => (
          <div key={i} className="surface-card">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between p-5 text-left font-medium">
              {f.q}
              <ChevronDown className={`h-4 w-4 transition ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
