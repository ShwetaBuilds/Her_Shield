import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { contactApi, journeyApi, type EmergencyContact, type SafetyJourney } from "@/lib/api";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Route as RouteIcon,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/safe-journey")({
  head: () => ({
    meta: [
      { title: "Safe Journey · Her_Shield" },
      {
        name: "description",
        content: "Create a manually managed journey log and record account-backed check-ins.",
      },
    ],
  }),
  component: SafeJourney,
});

function toLocalDateTime(value: string | Date) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatRemainingTime(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`]
    .filter(Boolean)
    .join(" ");
}

function SafeJourney() {
  const [journeys, setJourneys] = useState<SafetyJourney[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [extensionDrafts, setExtensionDrafts] = useState<Record<string, string>>({});
  const [destination, setDestination] = useState("");
  const [expectedArrivalAt, setExpectedArrivalAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const eligibleContacts = contacts.filter(
    (contact) => contact.smsConsent && contact.journeyShareConsent,
  );

  const loadJourneys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await journeyApi.list();
      setJourneys(data);
    } catch {
      setError("Could not load your journey records from your account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJourneys();
  }, [loadJourneys]);

  useEffect(() => {
    let active = true;
    void contactApi
      .get()
      .then(({ data }) => {
        if (active) setContacts(data);
      })
      .catch(() => {
        if (active) setContactsError("Could not load trusted contacts for journey sharing.");
      });
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === "#journey-records") {
      document.getElementById("journey-records")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const createJourney = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const arrival = new Date(expectedArrivalAt);
    if (!Number.isFinite(arrival.getTime()) || arrival <= new Date()) {
      setError("Choose an expected arrival time in the future.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await journeyApi.create({
        destination: destination.trim(),
        expectedArrivalAt: arrival.toISOString(),
        notifyContactIds: selectedContactIds,
      });
      setJourneys((current) => [data, ...current]);
      setDestination("");
      setExpectedArrivalAt("");
      setSelectedContactIds([]);
      setSuccess(
        selectedContactIds.length
          ? "Journey saved. Review the SMS attempt status below; provider acceptance is not delivery confirmation."
          : "Journey saved to your account. No contacts were selected for sharing.",
      );
    } catch (error: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not save this journey.")
          : "Could not save this journey.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateJourney = async (
    id: string,
    action: () => Promise<{ data: SafetyJourney }>,
    message: string,
  ) => {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await action();
      setJourneys((current) => current.map((journey) => (journey._id === id ? data : journey)));
      setSuccess(message);
    } catch (error: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not update this journey.")
          : "Could not update this journey.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteJourney = async (id: string) => {
    if (!window.confirm("Delete this journey record from your account?")) return;
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await journeyApi.remove(id);
      setJourneys((current) => current.filter((journey) => journey._id !== id));
      setSuccess("Journey record deleted.");
    } catch (error: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not delete this journey.")
          : "Could not delete this journey.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Safe Journey"
        subtitle="A manual journey log with account-backed check-ins."
        icon={RouteIcon}
      />

      <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900">
        Check-ins are manual and location is not continuously tracked. Selected contacts with
        recorded consent may receive journey updates by SMS.
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          {!saving && !busyId && (
            <button
              type="button"
              onClick={() => void loadJourneys()}
              className="font-semibold underline"
            >
              Reload journeys
            </button>
          )}
        </div>
      )}
      {success && (
        <div role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          {success}
        </div>
      )}

      <form
        onSubmit={createJourney}
        className="glass-strong mb-8 grid gap-4 rounded-3xl p-6 md:grid-cols-2 md:items-end"
      >
        <label className="text-sm font-semibold">
          Destination
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            maxLength={120}
            minLength={2}
            required
            autoComplete="off"
            placeholder="Enter a place or address"
            className="mt-1.5 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm font-normal"
          />
        </label>
        <label className="text-sm font-semibold">
          Expected arrival
          <input
            type="datetime-local"
            value={expectedArrivalAt}
            onChange={(event) => setExpectedArrivalAt(event.target.value)}
            required
            className="mt-1.5 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm font-normal"
          />
        </label>
        <fieldset className="rounded-xl border border-border bg-white/50 p-4 md:col-span-2">
          <legend className="px-1 text-sm font-semibold">Share this journey (optional)</legend>
          <p className="mb-3 text-xs text-muted-foreground">
            Only contacts with recorded SMS and journey-sharing consent can be selected. They may
            receive your destination, expected arrival, check-ins, and status changes.
          </p>
          {eligibleContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {contactsError ?? "No eligible contacts. Add or update consent in Trust Circle."}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {eligibleContacts.map((contact) => (
                <label
                  key={contact._id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-white/70 p-3 text-sm font-normal"
                >
                  <input
                    type="checkbox"
                    checked={selectedContactIds.includes(contact._id)}
                    onChange={(event) =>
                      setSelectedContactIds((selected) =>
                        event.target.checked
                          ? [...selected, contact._id]
                          : selected.filter((id) => id !== contact._id),
                      )
                    }
                    className="accent-primary"
                  />
                  <span>{contact.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{contact.phone}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <button
          type="submit"
          disabled={saving || loading || selectedContactIds.length > 5}
          className="rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {saving ? "Saving…" : "Start journey"}
        </button>
      </form>

      <section id="journey-records" aria-label="Journey records" className="scroll-mt-24 space-y-4">
        {loading && (
          <div role="status" className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            Loading your journey records…
          </div>
        )}
        {!loading && !error && journeys.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No journey records yet. Start a journey above; it will appear here as your history.
          </div>
        )}
        {journeys.map((journey) => {
          const isBusy = busyId === journey._id;
          const isOverdue =
            journey.status === "active" && new Date(journey.expectedArrivalAt).getTime() <= now;
          const remainingTime = new Date(journey.expectedArrivalAt).getTime() - now;
          const extensionValue =
            extensionDrafts[journey._id] ?? toLocalDateTime(journey.expectedArrivalAt);
          const extensionTimestamp = new Date(extensionValue).getTime();
          return (
            <article key={journey._id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="break-words">{journey.destination}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Expected arrival: {new Date(journey.expectedArrivalAt).toLocaleString()}
                  </p>
                  {journey.status === "active" && (
                    <p
                      className={`mt-1 text-xs font-semibold ${isOverdue ? "text-destructive" : "text-primary"}`}
                    >
                      {isOverdue
                        ? `Expected arrival passed ${formatRemainingTime(-remainingTime)} ago`
                        : `Time remaining: ${formatRemainingTime(remainingTime)}`}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started: {new Date(journey.startedAt ?? journey.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {journey.checkIns.length} manual check-in
                    {journey.checkIns.length === 1 ? "" : "s"}
                    {journey.checkIns.length > 0 &&
                      ` · Last ${new Date(journey.checkIns[journey.checkIns.length - 1].checkedInAt).toLocaleString()}`}
                  </p>
                  {journey.status === "completed" && journey.completedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Completed: {new Date(journey.completedAt).toLocaleString()}
                    </p>
                  )}
                  {journey.status === "cancelled" && journey.cancelledAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cancelled: {new Date(journey.cancelledAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isOverdue
                      ? "bg-destructive/10 text-destructive"
                      : journey.status === "active"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isOverdue
                    ? "Overdue · reminder scheduled"
                    : journey.status === "active"
                      ? "Active"
                      : journey.status === "completed"
                        ? "Completed"
                        : "Cancelled"}
                </span>
              </div>

              {journey.notificationAttempts.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-white/50 p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" /> SMS attempt history
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {journey.notificationAttempts.map((attempt, index) => (
                      <li key={`${attempt.eventType}-${attempt.contactName}-${index}`}>
                        {attempt.contactName} · {attempt.eventType.replace("journey_", "")} ·{" "}
                        {attempt.status}
                        {attempt.deliveredAt &&
                          ` · delivered ${new Date(attempt.deliveredAt).toLocaleString()}`}
                        {attempt.providerErrorCode && " · provider error"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(journey.destination)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-white/70 px-3 py-2 text-xs font-semibold"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Open destination in Maps
                </a>
                {journey.status === "active" && (
                  <>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-white/70 px-3 py-2 text-xs">
                      Extend arrival
                      <input
                        type="datetime-local"
                        min={toLocalDateTime(new Date(now))}
                        value={extensionValue}
                        onChange={(event) =>
                          setExtensionDrafts((drafts) => ({
                            ...drafts,
                            [journey._id]: event.target.value,
                          }))
                        }
                        aria-label={`New expected arrival for ${journey.destination}`}
                        className="max-w-48 bg-transparent text-xs"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={
                        isBusy ||
                        !Number.isFinite(extensionTimestamp) ||
                        extensionTimestamp <= new Date(journey.expectedArrivalAt).getTime()
                      }
                      onClick={() =>
                        void updateJourney(
                          journey._id,
                          () =>
                            journeyApi.extend(journey._id, new Date(extensionValue).toISOString()),
                          "Expected arrival extended.",
                        )
                      }
                      className="rounded-xl border border-border bg-white/70 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Save new arrival
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void updateJourney(
                          journey._id,
                          () => journeyApi.checkIn(journey._id),
                          "Manual check-in saved.",
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isBusy ? "Saving…" : "Check in"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void updateJourney(
                          journey._id,
                          () => journeyApi.complete(journey._id),
                          "Journey marked completed.",
                        )
                      }
                      className="rounded-xl border border-border bg-white/70 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (!window.confirm("Cancel this journey and notify selected contacts?"))
                          return;
                        void updateJourney(
                          journey._id,
                          () => journeyApi.cancel(journey._id),
                          "Journey cancelled.",
                        );
                      }}
                      className="rounded-xl border border-border bg-white/70 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void deleteJourney(journey._id)}
                  className="inline-flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </AppLayout>
  );
}
