import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support/returns")({
  head: () => ({ meta: [{ title: "Returns policy — NAKANJANI Marketplace" }] }),
  component: ReturnsPage,
});

const SECTIONS: Array<[string, string]> = [
  ["Return window", "You have 30 days from the date of delivery to request a return on any eligible item. Perishable goods, personalised items, and intimate apparel are excluded."],
  ["Condition of returns", "Items must be unused, in original packaging, and with all tags attached. We may decline refunds for items that show signs of wear or are missing accessories."],
  ["How to start a return", "Open the order from your account dashboard and choose “Request return”. The vendor will reply within 2 business days with collection or drop-off instructions."],
  ["Refund timelines", "Once the vendor confirms receipt, refunds are released through Yoco and typically reflect in your account within 5 business days. Original delivery fees are non-refundable unless the item arrived damaged or incorrect."],
  ["Faulty or incorrect items", "If your item arrives damaged or you receive the wrong product, contact the vendor immediately through the order page. Your statutory rights under the Consumer Protection Act 68 of 2008 are not affected by this policy."],
];

function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Returns policy</h1>
      <p className="mt-3 text-muted-foreground">You have 30 days from delivery to return any eligible item in original condition for a refund or exchange.</p>
      {SECTIONS.map(([title, body], i) => (
        <section key={title} className="mt-6">
          <h2 className="font-display text-lg font-bold">{i + 1}. {title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
        </section>
      ))}
    </div>
  );
}
