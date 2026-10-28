import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { Users, Plus, Trash2, Pencil, X } from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { contactApi, type EmergencyContact } from "@/lib/api";

export const Route = createFileRoute("/trust-circle")({
  component: TrustCircle,
});

function TrustCircle() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState<Omit<EmergencyContact, "_id">>({
    name: "",
    phone: "",
    relation: "",
    priority: "High",
    smsConsent: false,
    journeyShareConsent: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const savingRef = useRef(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await contactApi.get();
      setContacts(data);
    } catch (error: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not load contacts from your account.")
          : "Could not load contacts from your account.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      relation: "",
      priority: "High",
      smsConsent: false,
      journeyShareConsent: false,
    });
    setError(null);
    setSuccess(null);
    setOpen(true);
  };
  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      relation: c.relation,
      priority: c.priority,
      smsConsent: c.smsConsent,
      journeyShareConsent: c.journeyShareConsent,
    });
    setError(null);
    setSuccess(null);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const contactData = {
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      relation: form.relation.trim(),
    };
    try {
      if (editing) {
        const { data } = await contactApi.update(editing._id, contactData);
        setContacts((current) =>
          current.map((contact) => (contact._id === data._id ? data : contact)),
        );
        setSuccess("Contact updated in your account.");
      } else {
        const { data } = await contactApi.create(contactData);
        setContacts((current) => [...current, data]);
        setSuccess("Contact added to your account.");
      }
      setOpen(false);
    } catch (error: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not save this contact.")
          : "Could not save this contact.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this contact from your Trust Circle?")) return;
    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      await contactApi.remove(id);
      setContacts((current) => current.filter((contact) => contact._id !== id));
      setSuccess("Contact deleted from your account.");
    } catch (error: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not delete this contact.")
          : "Could not delete this contact.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const priorityColor = { High: "bg-rose-500", Medium: "bg-amber-500", Low: "bg-emerald-500" };

  return (
    <AppLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <PageHeader
          title="Trust Circle"
          subtitle={
            loading
              ? "Loading your account contacts…"
              : `${contacts.length} trusted contacts · Stored in your account`
          }
          icon={Users}
        />
        {!open && (
          <button
            type="button"
            onClick={openAdd}
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-gradient-primary text-white font-semibold shadow-soft flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadContacts()}
            className="font-semibold underline"
          >
            Reload contacts
          </button>
        </div>
      )}
      {success && (
        <div role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          {success}
        </div>
      )}
      {loading && (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          Loading your contacts…
        </div>
      )}
      {!loading && !error && contacts.length === 0 && (
        <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
          No trusted contacts saved yet.
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((c) => {
          const displayName = c.name?.trim() || "Trusted contact";
          return (
            <div
              key={c._id}
              className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                  {displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.relation?.trim() || "Relationship not specified"}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-full text-white ${priorityColor[c.priority]}`}
                >
                  {c.priority}
                </span>
              </div>
              <div className="text-sm font-medium mt-3 text-foreground/80">
                {c.phone?.trim() || "Phone number unavailable"}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                SMS consent: {c.smsConsent ? "recorded" : "not recorded"}
              </div>
              <div className="text-xs text-muted-foreground">
                Journey sharing consent: {c.journeyShareConsent ? "recorded" : "not recorded"}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="flex-1 py-2 rounded-xl bg-white/70 border border-border text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(c._id)}
                  disabled={deletingId === c._id}
                  className="flex-1 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> {deletingId === c._id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={save} className="glass-strong rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">
                {editing ? "Edit Contact" : "Add Trusted Contact"}
              </h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close contact form">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "Full Name", key: "name" as const, type: "text", placeholder: "Jane Doe" },
                {
                  label: "Phone Number",
                  key: "phone" as const,
                  type: "tel",
                  placeholder: "+919876543210",
                },
                {
                  label: "Relationship",
                  key: "relation" as const,
                  type: "text",
                  placeholder: "Sister, Friend, etc.",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-foreground/70">{f.label}</label>
                  <input
                    required
                    type={f.type}
                    placeholder={f.placeholder}
                    maxLength={f.key === "name" ? 100 : f.key === "phone" ? 16 : 50}
                    minLength={f.key === "phone" ? 9 : undefined}
                    pattern={f.key === "phone" ? "\\+[1-9][0-9]{7,14}" : undefined}
                    title={
                      f.key === "phone"
                        ? "Enter a phone number with + and its country code, e.g. +919876543210."
                        : undefined
                    }
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/70 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-foreground/70">Priority Level</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(["High", "Medium", "Low"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${form.priority === p ? "bg-gradient-primary text-white shadow-soft" : "bg-white/70 border border-border"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-white/50 p-3 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={form.smsConsent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, smsConsent: event.target.checked }))
                  }
                  className="mt-1 accent-primary"
                />
                <span>
                  This contact has explicitly agreed to receive SMS safety notifications at this
                  number. Saving a contact alone does not send messages.
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-border bg-white/50 p-3 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={form.journeyShareConsent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      journeyShareConsent: event.target.checked,
                    }))
                  }
                  className="mt-1 accent-primary"
                />
                <span>
                  This contact has explicitly agreed to receive SMS updates for journeys I select
                  them to share. Updates may include destination and expected arrival.
                </span>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-primary text-white font-semibold shadow-soft disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Contact"}
            </button>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
