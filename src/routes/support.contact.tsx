import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/support/contact")({
  head: () => ({ meta: [{ title: "Contact us — NAKANJANI Marketplace" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    const body = `From: ${name} <${email}>\n\n${message}`;
    const href = `mailto:support@nakanjani.co.za?subject=${encodeURIComponent(subject || "Marketplace enquiry")}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    toast.success("Opening your email client…");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h1 className="font-display text-3xl font-bold">Contact us</h1>
        <p className="mt-2 text-muted-foreground">Our team is online Monday to Saturday, 8am to 8pm SAST.</p>
        <div className="mt-6 space-y-3">
          {[[Mail, "support@nakanjani.co.za"], [Phone, "+27 21 555 0100"], [MapPin, "85 Long Street, Cape Town"]].map(([I, t]: any) => (
            <div key={t} className="flex items-center gap-3 text-sm"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><I className="h-4 w-4" /></div>{t}</div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="surface-card p-6 space-y-3">
        <h2 className="font-display text-xl font-bold">Send us a message</h2>
        <label className="block">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Your name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Email</div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Subject</div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">Message</div>
          <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <button className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground btn-glow hover:bg-[var(--primary-hover)]">Send message</button>
      </form>
    </div>
  );
}
