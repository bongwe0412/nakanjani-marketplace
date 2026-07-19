import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support/terms")({
  head: () => ({ meta: [{ title: "Terms & Conditions — NAKANJANI Marketplace" }] }),
  component: TermsPage,
});

const SECTIONS: Array<[string, string]> = [
  ["Acceptance of terms", "By accessing or using NAKANJANI Marketplace you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the service."],
  ["The marketplace", "NAKANJANI is an online marketplace that connects independent South African vendors with customers. We facilitate listings and payments, but each order is a contract between you and the vendor that fulfils it."],
  ["Accounts", "You are responsible for keeping your account credentials secure and for all activity that occurs under your account. You must be 18 or older to register, or have permission from a parent or guardian."],
  ["Pricing and payment", "All prices are listed in South African Rand (ZAR) and include VAT where applicable. Payments are processed by Yoco. Your order is confirmed only once payment is successful; failed or cancelled payments release any held stock."],
  ["Delivery and returns", "Vendors are responsible for dispatch within the timeframes shown on each listing. Standard returns are handled per our Returns policy. Customised or perishable items may be excluded from return."],
  ["Vendor obligations", "Approved vendors warrant that they have the right to sell every item listed, that listings are accurate, and that they will fulfil orders promptly. NAKANJANI may suspend or remove listings that violate these terms."],
  ["Limitation of liability", "To the maximum extent permitted by South African law, NAKANJANI is not liable for indirect, incidental, or consequential damages arising from use of the marketplace."],
  ["Governing law", "These terms are governed by the laws of the Republic of South Africa. Disputes will be heard in the appropriate court in Cape Town."],
];

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Terms & Conditions</h1>
      <p className="mt-3 text-muted-foreground">Last updated June 2026. By using NAKANJANI Marketplace you agree to the following terms.</p>
      {SECTIONS.map(([title, body], i) => (
        <section key={title} className="mt-6">
          <h2 className="font-display text-lg font-bold">{i + 1}. {title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
        </section>
      ))}
    </div>
  );
}
