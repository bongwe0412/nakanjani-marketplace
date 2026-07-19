import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { getAdminHealth } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/health")({
  component: AdminHealth,
});

function statusIcon(s: string) {
  if (s === "succeeded") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (s === "failed") return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function AdminHealth() {
  const fetchHealth = useServerFn(getAdminHealth);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => fetchHealth(),
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <div className="text-destructive text-sm">Failed to load health: {(error as Error)?.message}</div>;

  const stuck = data.stuck_payments_over_30min > 0;
  const expired = data.expired_reservations_pending_cleanup > 10;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System health</h1>
          <p className="text-sm text-muted-foreground">Cron jobs, payments and reservations status.</p>
        </div>
        <button onClick={() => refetch()} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">{isFetching ? "Refreshing…" : "Refresh"}</button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border p-4"><div className="text-xs uppercase text-muted-foreground">Pending payments</div><div className="text-2xl font-semibold">{data.pending_payments}</div></div>
        <div className={`rounded-lg border p-4 ${stuck ? "border-destructive" : ""}`}><div className="text-xs uppercase text-muted-foreground">Stuck &gt; 30 min</div><div className={`text-2xl font-semibold ${stuck ? "text-destructive" : ""}`}>{data.stuck_payments_over_30min}</div></div>
        <div className={`rounded-lg border p-4 ${expired ? "border-amber-500" : ""}`}><div className="text-xs uppercase text-muted-foreground">Expired reservations awaiting cleanup</div><div className={`text-2xl font-semibold ${expired ? "text-amber-600" : ""}`}>{data.expired_reservations_pending_cleanup}</div></div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">Scheduled jobs</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-3 py-2">Job</th><th className="text-left px-3 py-2">Schedule</th><th className="text-left px-3 py-2">Active</th></tr></thead>
            <tbody>
              {data.cron_jobs.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No jobs scheduled.</td></tr>}
              {data.cron_jobs.map((j) => (
                <tr key={j.jobid} className="border-t"><td className="px-3 py-2 font-mono">{j.jobname}</td><td className="px-3 py-2 font-mono text-xs">{j.schedule}</td><td className="px-3 py-2">{j.active ? "yes" : "no"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Recent job runs</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left px-3 py-2">Job</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Message</th><th className="text-left px-3 py-2">Started</th></tr></thead>
            <tbody>
              {data.cron_runs.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No runs recorded yet.</td></tr>}
              {data.cron_runs.map((r, i) => (
                <tr key={i} className="border-t"><td className="px-3 py-2 font-mono">{r.jobid}</td><td className="px-3 py-2"><span className="inline-flex items-center gap-1">{statusIcon(r.status)} <span>{r.status}</span></span></td><td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-xs">{r.return_message ?? "—"}</td><td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.start_time).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Recent payment events</h2>
        <ul className="text-sm rounded-lg border divide-y">
          {data.recent_payment_events.length === 0 && <li className="px-3 py-3 text-muted-foreground">No events.</li>}
          {data.recent_payment_events.map((e, i) => (
            <li key={i} className="px-3 py-2 flex justify-between"><span className="font-mono">{e.event_type}</span><span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}