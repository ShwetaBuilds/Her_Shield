import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { User, Users, LogOut, ChevronRight, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { dashboardApi, userApi, type UserProfile } from "@/lib/api";
import { clearAuth, setUser } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const [user, setProfile] = useState<UserProfile | null>(null);
  const [counts, setCounts] = useState<{ alerts: number; contacts: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "" as UserProfile["gender"] | "",
    bloodGroup: "",
    address: "",
  });

  useEffect(() => {
    userApi
      .getProfile()
      .then(({ data }) => {
        setProfile(data);
        setUser({ id: data.id, name: data.name, email: data.email });
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          age: data.age ? String(data.age) : "",
          gender: data.gender || "",
          bloodGroup: data.bloodGroup || "",
          address: data.address || "",
        });
      })
      .catch((error: unknown) => {
        setProfileError(
          axios.isAxiosError<{ message?: string }>(error)
            ? (error.response?.data?.message ?? "Could not load your profile.")
            : "Could not load your profile.",
        );
      })
      .finally(() => setProfileLoading(false));
    dashboardApi
      .get()
      .then(({ data }) =>
        setCounts({ alerts: data.sosHistory.length, contacts: data.emergencyContacts.length }),
      )
      .catch(() => setSummaryError("Could not load your account summary."))
      .finally(() => setSummaryLoading(false));
  }, []);

  const logout = () => {
    clearAuth();
    void navigate({ to: "/", replace: true });
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const { data } = await userApi.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        age: form.age ? Number(form.age) : null,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup.trim(),
        address: form.address.trim(),
      });
      setProfile(data);
      setUser({ id: data.id, name: data.name, email: data.email });
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        age: data.age ? String(data.age) : "",
        gender: data.gender || "",
        bloodGroup: data.bloodGroup || "",
        address: data.address || "",
      });
      setEditing(false);
      setSaved(true);
    } catch (error: unknown) {
      setSaveError(
        axios.isAxiosError<{ message?: string }>(error)
          ? (error.response?.data?.message ?? "Could not save profile changes.")
          : "Could not save profile changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const sections: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    to: "/safety-settings" | "/trust-circle";
  }[] = [
    {
      icon: ShieldAlert,
      title: "Safety Settings",
      desc: "Local trigger preferences, microphone tests and foreground keywords.",
      to: "/safety-settings",
    },
    {
      icon: Users,
      title: "Trusted Contacts",
      desc: `Manage your trust circle${counts ? ` — ${counts.contacts} saved` : ""}.`,
      to: "/trust-circle",
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Profile"
        subtitle="Manage your account, safety, and privacy."
        icon={User}
      />
      {(profileError || summaryError || saveError) && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {[profileError, summaryError, saveError].filter(Boolean).join(" ")}
        </div>
      )}
      {saved && (
        <div role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          Profile changes saved to your account.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-strong rounded-3xl p-8 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-primary flex items-center justify-center text-white text-3xl font-bold shadow-glow">
            {profileLoading ? "…" : user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="mt-4 font-bold text-lg capitalize">
            {profileLoading ? "Loading profile…" : user?.name || "Profile unavailable"}
          </div>
          <div className="text-sm text-muted-foreground">{user?.email || "—"}</div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/60">
              <div className="text-xl font-bold gradient-text">
                {summaryLoading ? "…" : (counts?.alerts ?? "—")}
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold">ALERTS</div>
            </div>
            <div className="p-3 rounded-xl bg-white/60">
              <div className="text-xl font-bold gradient-text">
                {summaryLoading ? "…" : (counts?.contacts ?? "—")}
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold">CONTACTS</div>
            </div>
            <div className="p-3 rounded-xl bg-white/60">
              <div className="text-xl font-bold gradient-text">
                {profileLoading ? "…" : (user?.age ?? "—")}
              </div>
              <div className="text-[10px] text-muted-foreground font-semibold">AGE</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full mt-6 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {sections.map((s) => {
            return (
              <Link
                key={s.title}
                to={s.to}
                className="w-full glass rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0">
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            );
          })}

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">User Details</div>
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setSaved(false);
                  if (editing && user) {
                    setForm({
                      name: user.name || "",
                      phone: user.phone || "",
                      age: user.age ? String(user.age) : "",
                      gender: user.gender || "",
                      bloodGroup: user.bloodGroup || "",
                      address: user.address || "",
                    });
                    setEditing(false);
                  } else {
                    setEditing(true);
                  }
                }}
                disabled={!user || profileLoading}
                className="text-sm font-semibold text-primary"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>
            {profileLoading && (
              <p role="status" className="text-sm text-muted-foreground">
                Loading your account details…
              </p>
            )}
            {editing ? (
              <form onSubmit={saveProfile} className="space-y-3">
                {(
                  [
                    ["name", "Full Name"],
                    ["phone", "Phone"],
                    ["age", "Age"],
                    ["bloodGroup", "Blood Group"],
                    ["address", "Address"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block text-xs font-semibold text-muted-foreground">
                    {label}
                    <input
                      value={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      required={key === "name"}
                      type={key === "age" ? "number" : "text"}
                      min={key === "age" ? 1 : undefined}
                      max={key === "age" ? 120 : undefined}
                      maxLength={
                        key === "address"
                          ? 500
                          : key === "phone"
                            ? 30
                            : key === "name"
                              ? 100
                              : key === "bloodGroup"
                                ? 5
                                : undefined
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground"
                    />
                  </label>
                ))}
                <label className="block text-xs font-semibold text-muted-foreground">
                  Gender
                  <select
                    value={form.gender}
                    onChange={(event) => {
                      const value = event.target.value;
                      const gender =
                        value === "Female" || value === "Male" || value === "Other" ? value : "";
                      setForm({ ...form, gender });
                    }}
                    className="mt-1 w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </form>
            ) : (
              [
                { k: "Full Name", v: user?.name || "—" },
                { k: "Email", v: user?.email || "—" },
                { k: "Phone", v: user?.phone || "—" },
                { k: "Age", v: user?.age ?? "—" },
                { k: "Gender", v: user?.gender || "—" },
                { k: "Blood Group", v: user?.bloodGroup || "—" },
                { k: "Address", v: user?.address || "—" },
              ]
                .filter(() => !profileLoading)
                .map((d) => (
                  <div
                    key={d.k}
                    className="flex justify-between gap-4 py-2.5 border-b border-border/50 last:border-0 text-sm"
                  >
                    <span className="text-muted-foreground">{d.k}</span>
                    <span className="font-semibold text-right">{d.v}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
