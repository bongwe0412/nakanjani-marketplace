import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/support/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy — NAKANJANI Marketplace" }] }),
  component: PrivacyPage,
});

const SECTIONS: Array<[string, string]> = [
  ["Information we collect", "We collect the personal information you provide when you register, place an order, contact support, or apply to sell on NAKANJANI. This includes your name, email address, phone number, delivery address, and payment metadata returned by our payment processor (Yoco). We do not store full card numbers or CVVs."],
  ["How we use your information", "Your data is used to fulfil orders, communicate about purchases, prevent fraud, and improve our service. Vendors receive only the information required to ship the items they sold to you."],
  ["Sharing with third parties", "We share data only with processors required to operate the marketplace: Yoco for payments, our delivery partners, and infrastructure providers bound by data-processing agreements. We do not sell your personal information."],
  ["Your rights under POPIA", "Under the Protection of Personal Information Act (4 of 2013) you may request access to, correction of, or deletion of your personal information at any time by emailing privacy@nakanjani.co.za. We will respond within 30 days."],
  ["Cookies and analytics", "We use first-party cookies to maintain your session, remember your cart, and measure aggregate site usage. You can clear these at any time in your browser settings."],
  ["Contacting us", "Questions about this policy can be sent to privacy@nakanjani.co.za. Our information officer is registered with the Information Regulator of South Africa."],
];

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Privacy policy</h1>
      <p className="mt-3 text-muted-foreground">Last updated June 2026. NAKANJANI Marketplace ("we") is committed to protecting your personal information in accordance with the Protection of Personal Information Act (POPIA).</p>
      {SECTIONS.map(([title, body], i) => (
        <section key={title} className="mt-6">
          <h2 className="font-display text-lg font-bold">{i + 1}. {title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
        </section>
      ))}
    </div>
  );
}
