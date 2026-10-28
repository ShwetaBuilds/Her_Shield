import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { History, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { sosApi, type SosRecord } from "@/lib/api";

export const Route = createFileRoute("/alert-history")({
  component: AlertHistory,
});

function AlertHistory() {
  const [alerts, setAlerts] = useState<SosRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await sosApi.list();
      setAlerts(data);
    } catch {
      setError("Could not load SOS records from your account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const thisMonth = alerts.filter((alert) => {
    const date = new Date(alert.triggeredAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const stats = [
    {
      label: "SOS Records",
      value: loading ? "…" : error ? "—" : alerts.length,
      color: "from-purple-500 to-fuchsia-500",
    },
    {
      label: "With Location",
      value: loading ? "…" : error ? "—" : alerts.filter((alert) => Boolean(alert.location)).length,
      color: "from-rose-500 to-pink-500",
    },
    {
      label: "This Month",
      value: loading ? "…" : error ? "—" : thisMonth,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Confirmed SMS deliveries",
      value: loading
        ? "…"
        : error
          ? "—"
          : alerts.reduce(
              (count, alert) =>
                count +
                (alert.notificationAttempts?.filter((attempt) => attempt.status === "delivered")
                  .length ?? 0),
              0,
            ),
      color: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Alert History"
        subtitle="SOS events saved to your account with Twilio SMS attempt and delivery status."
        icon={History}
      />
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadAlerts()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div
              className={`text-3xl font-bold bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}
            >
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
          <div className="col-span-3">Event</div>
          <div className="col-span-2">Location</div>
          <div className="col-span-3">Time</div>
          <div className="col-span-3">Dispatch</div>
          <div className="col-span-1">Status</div>
        </div>
        {loading && (
          <div role="status" className="p-6 text-sm text-muted-foreground">
            Loading your SOS history…
          </div>
        )}
        {!loading && alerts.length === 0 && !error && (
          <div className="p-6 text-sm text-muted-foreground">No saved SOS records.</div>
        )}
        {alerts.map((alert) => (
          <div
            key={alert._id}
            className="grid sm:grid-cols-12 gap-3 px-6 py-4 border-b border-border/50 hover:bg-white/40 transition-all items-center text-sm"
          >
            <div className="col-span-3 font-semibold">SOS event</div>
            <div className="col-span-2 text-muted-foreground">
              {alert.location
                ? `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
                : "Not recorded"}
            </div>
            <div className="col-span-3 text-muted-foreground">
              {new Date(alert.triggeredAt).toLocaleString()}
            </div>
            <div className="col-span-3 text-muted-foreground">
              {alert.notificationAttempts?.length ? (
                <ul className="space-y-1">
                  {alert.notificationAttempts.map((attempt, index) => (
                    <li key={`${attempt.contactName}-${index}`}>
                      {attempt.contactName}:{" "}
                      {attempt.status === "delivered"
                        ? "delivery confirmed"
                        : attempt.status === "accepted" ||
                            attempt.status === "queued" ||
                            attempt.status === "sent"
                          ? "provider accepted/sent; delivery not confirmed"
                          : attempt.status === "not_configured"
                            ? "Not sent: configure Twilio credentials in backend/.env"
                            : attempt.status === "rate_limited"
                              ? "rate limited; not sent"
                              : attempt.status === "failed" || attempt.status === "undelivered"
                                ? `${attempt.status}${attempt.providerErrorCode ? ` (provider code ${attempt.providerErrorCode})` : ""}`
                                : "failed"}
                    </li>
                  ))}
                </ul>
              ) : (
                "No SMS attempts"
              )}
            </div>
            <div className="col-span-1 flex items-center gap-1 text-amber-700 font-semibold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Recorded
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
