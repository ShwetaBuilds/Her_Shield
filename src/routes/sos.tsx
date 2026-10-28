import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { Siren, MapPin, CheckCircle2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { contactApi, type EmergencyContact } from "@/lib/api";
import { createSosRecord, getSosContactLabel, orderTrustedContacts } from "@/lib/sos";

export const Route = createFileRoute("/sos")({
  component: SOS,
});

function SOS() {
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const [locationIncluded, setLocationIncluded] = useState(false);
  const [recordSaved, setRecordSaved] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const idempotencyKeyRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const autoTriggerHandledRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate({ from: "/sos" });
  const orderedSmsContacts = orderTrustedContacts(contacts);

  useEffect(() => {
    let cancelled = false;
    contactApi
      .get()
      .then(({ data }) => {
        if (!cancelled) setContacts(data);
      })
      .catch(() => {
        if (!cancelled)
          setContactsError("Could not load trusted contacts. You can still save an SOS record.");
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const trigger = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setConfirming(true);
    setSent(false);
    setSaving(true);
    setError(null);
    setLocationWarning(null);
    setLocationIncluded(false);
    setSavedAt(null);
    setRecordSaved(false);
    idempotencyKeyRef.current ??= crypto.randomUUID();
    try {
      const result = await createSosRecord({
        idempotencyKey: idempotencyKeyRef.current,
      });
      idempotencyKeyRef.current = null;
      setLocationIncluded(result.locationIncluded);
      setLocationWarning(result.locationWarning ?? null);
      setSavedAt(result.record.triggeredAt);
      setRecordSaved(true);
    } catch {
      setError("The SOS record could not be saved. No SMS or emergency-service alert was sent.");
      setRecordSaved(false);
    } finally {
      savingRef.current = false;
      setSaving(false);
      setSent(true);
    }
  }, []);

  useEffect(() => {
    if (location.hash !== "#activate-sos" || contactsLoading || autoTriggerHandledRef.current) {
      return;
    }
    autoTriggerHandledRef.current = true;
    void navigate({ to: "/sos", hash: "", replace: true });
    void trigger();
  }, [contactsLoading, location.hash, navigate, trigger]);

  const closePopup = () => {
    setConfirming(false);
    setSent(false);
    if (location.hash === "#activate-sos") {
      void navigate({ to: "/sos", hash: "", replace: true });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="SOS Emergency"
        subtitle="Save an SOS record and view notification status."
        icon={Siren}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-strong rounded-3xl p-10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[480px]">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/10" />
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-rose-500/20 blur-3xl animate-pulse" />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="relative w-56 h-56 rounded-full bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-600 text-white font-bold text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-transform flex flex-col items-center justify-center gap-2"
            >
              <Siren className="w-16 h-16" />
              <span>SOS</span>
              <span className="text-xs font-medium opacity-90">Emergency alert</span>
            </button>
          </div>
          <p className="relative mt-8 text-sm text-muted-foreground max-w-xs">
            Saves an SOS record to your account and includes your current location if you allow
            access.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              title: "Account history",
              desc: "The SOS event is stored in your account when the API is available.",
            },
            {
              title: "Optional location",
              desc: "Coordinates are included only if browser permission is granted.",
            },
            {
              title: "Trusted contacts",
              desc: "Notification status is updated in the app.",
            },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
          <div className="glass rounded-2xl p-5 flex items-center gap-3 bg-primary/5">
            <MapPin className="w-5 h-5 text-primary" />
            <div className="text-sm">
              Location:{" "}
              <span className="font-semibold">Requested only when you save an SOS record</span>
            </div>
          </div>
          {contactsLoading && (
            <div role="status" className="glass rounded-2xl p-5 text-sm text-muted-foreground">
              Loading trusted contacts…
            </div>
          )}
          {contactsError && (
            <div role="alert" className="glass rounded-2xl p-5 text-sm text-destructive">
              {contactsError}
            </div>
          )}
        </div>
      </div>

      {(confirming || sent) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sos-dialog-title"
            className="glass-strong max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-6 text-center sm:p-8"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
              <Siren className="w-8 h-8 text-rose-600" />
            </div>
            <h3 id="sos-dialog-title" className="text-xl font-bold">
              {saving
                ? "Saving SOS record..."
                : sent
                  ? recordSaved
                    ? "SOS alert activated"
                    : "SOS alert status"
                  : "Confirm SOS"}
            </h3>
            {sent ? (
              <div role="status" className="mt-4 space-y-3 text-left text-sm">
                <p className="rounded-xl border border-border bg-white/70 p-3">
                  Notification status updated for{" "}
                  {getSosContactLabel(contacts, selectedContactIds, Boolean(contactsError))}
                </p>
                <p className="rounded-xl border border-border bg-white/70 p-3">
                  Nearby Police Station: Notification status updated
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-white/70 p-3 text-left text-sm">
                Notification status will update after you save the SOS record.
              </p>
            )}
            <p role="status" className="mt-3 text-sm font-semibold text-foreground">
              {saving
                ? "Saving the SOS record..."
                : sent
                  ? recordSaved
                    ? "SOS record saved to your account."
                    : "SOS record was not saved to your account."
                  : "No SOS record has been saved yet."}
            </p>
            {error && (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {error}
              </p>
            )}
            {savedAt && (
              <p className="mt-2 text-xs text-muted-foreground">
                Recorded {new Date(savedAt).toLocaleString()}
              </p>
            )}
            {sent && (
              <p className="mt-2 text-xs text-muted-foreground">
                {locationIncluded
                  ? "Location was included in the record."
                  : "No location was included in the record."}
              </p>
            )}
            {saving && (
              <p role="status" className="mt-3 text-sm text-primary">
                Processing emergency alert...
              </p>
            )}
            {!sent && (
              <div className="mt-5 text-left">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" /> Trusted contact
                </div>
                {contactsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading trusted contacts…</p>
                ) : contactsError ? (
                  <p className="text-sm text-destructive">{contactsError}</p>
                ) : orderedSmsContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No trusted contacts are available. You can still save an SOS record.
                  </p>
                ) : (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Choose a saved contact to display in the notification status.
                    </p>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {orderedSmsContacts.map((contact, index) => (
                        <label
                          key={contact._id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-white/60 p-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(contact._id)}
                            onChange={(event) =>
                              setSelectedContactIds((current) =>
                                event.target.checked
                                  ? [...current, contact._id]
                                  : current.filter((id) => id !== contact._id),
                              )
                            }
                            className="accent-primary"
                          />
                          <span>
                            <span className="block font-semibold">{contact.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {contact.priority} priority
                              {index === 0 ? " · Primary recommendation" : ""}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={closePopup}
                className="flex-1 py-3 rounded-xl bg-white/70 border border-border font-semibold"
              >
                Close
              </button>
              {!sent && (
                <button
                  type="button"
                  onClick={() => void trigger()}
                  disabled={saving}
                  aria-busy={saving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-soft"
                >
                  {saving ? "Processing…" : error ? "Try again" : "Save SOS record"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {locationWarning && (
        <div
          role="alert"
          className="fixed bottom-6 left-6 z-50 glass-strong rounded-2xl p-4 text-sm text-destructive shadow-soft max-w-md"
        >
          {locationWarning}
        </div>
      )}
    </AppLayout>
  );
}
