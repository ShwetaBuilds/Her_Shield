import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import axios from "axios";
import { Shield, Mail, Lock, Eye, EyeOff } from "lucide-react";
import heroImg from "@/assets/hero.png";
import { authApi, userApi, type BloodGroup } from "@/lib/api";
import { clearAuth, setToken, setUser, getToken } from "@/lib/auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const bloodGroups: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Prefer not to say",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Login · Her_Shield" },
      { name: "description", content: "Sign in to Her_Shield safety tools." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [remember, setRemember] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const [sessionVerificationError, setSessionVerificationError] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return;

    let active = true;
    setCheckingSession(true);
    setSessionVerificationError(false);
    void userApi
      .getProfile()
      .then(({ data }) => {
        if (!active) return;
        setUser(data);
        void navigate({ to: "/home", replace: true });
      })
      .catch(() => {
        if (!active) return;
        if (getToken()) {
          setSessionVerificationError(true);
        } else {
          setError("Your saved session has expired. Please sign in again.");
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, sessionCheckAttempt]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkingSession) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (mode === "signup") {
      const parsedAge = Number(age);
      if (!name.trim() || name.trim().length > 100 || !phone.trim() || !address.trim()) {
        setError("Full name, phone number, age, and address are required.");
        return;
      }
      if (!/^\+?[1-9]\d{7,14}$/.test(phone.trim())) {
        setError("Enter a valid phone number with 8 to 15 digits, optionally starting with +.");
        return;
      }
      if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        setError("Age must be a whole number between 1 and 120.");
        return;
      }
      if (!address.trim() || address.trim().length > 500) {
        setError("Enter an address of 500 characters or fewer.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    clearAuth();

    try {
      const response =
        mode === "login"
          ? await authApi.login({ email: email.trim(), password })
          : await authApi.register({
              name: name.trim(),
              email: email.trim(),
              password,
              phone: phone.trim(),
              age: Number(age),
              address: address.trim(),
              bloodGroup: bloodGroup || undefined,
            });

      setToken(response.data.token, mode === "signup" || remember);
      setUser(response.data.user);
      void navigate({ to: "/home", replace: true });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(err)
          ? (err.response?.data?.message ?? "Unable to authenticate. Please try again.")
          : "Unable to authenticate. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    try {
      await authApi.forgotPassword(email);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(err)
          ? (err.response?.data?.message ?? "Password reset is unavailable.")
          : "Password reset is unavailable.",
      );
    }
  };

  if (sessionVerificationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div role="alert" className="max-w-md text-sm text-muted-foreground">
          Unable to verify your saved session. Check your connection and retry; your session remains
          saved.
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSessionCheckAttempt((attempt) => attempt + 1)}
            className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-white"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => {
              clearAuth();
              setSessionVerificationError(false);
            }}
            className="rounded-full border border-border bg-white/70 px-5 py-2.5 text-sm font-semibold"
          >
            Sign in instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 gap-6 p-4 sm:p-8">
      {/* Illustration side */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden rounded-3xl bg-gradient-soft">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="relative z-10 text-center px-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Safety tools, centered on you</span>
          </div>
          <img
            src={heroImg}
            alt="Women safety"
            className="w-80 h-80 mx-auto object-contain drop-shadow-2xl"
            width={320}
            height={320}
          />
          <h2 className="text-3xl font-bold gradient-text mt-6">You are never alone.</h2>
          <p className="text-muted-foreground mt-3 max-w-sm mx-auto">
            Account-backed safety tools, user-controlled location features, and browser-based voice
            keyword checks.
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl gradient-text">Her_Shield</span>
          </div>

          <div className="glass-strong rounded-3xl p-8 sm:p-10">
            <h1 className="text-3xl font-bold">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {mode === "login"
                ? "Sign in to continue to Her_Shield"
                : "Join Her_Shield and stay protected"}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div>
                  <label htmlFor="signup-name" className="text-xs font-semibold text-foreground/70">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your full name"
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-white/70 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              )}
              <div>
                <label htmlFor="login-email" className="text-xs font-semibold text-foreground/70">
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-foreground/70"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="login-password"
                    type={showPwd ? "text" : "password"}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/70 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <>
                  <div>
                    <label
                      htmlFor="signup-phone"
                      className="text-xs font-semibold text-foreground/70"
                    >
                      Phone number
                    </label>
                    <input
                      id="signup-phone"
                      type="tel"
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      pattern="\+?[1-9][0-9]{7,14}"
                      title="Enter 8 to 15 digits, optionally starting with +."
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="e.g. +919876543210"
                      className="mt-1.5 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="signup-age"
                        className="text-xs font-semibold text-foreground/70"
                      >
                        Age
                      </label>
                      <input
                        id="signup-age"
                        type="number"
                        required
                        min={1}
                        max={120}
                        step={1}
                        inputMode="numeric"
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-blood-group"
                        className="text-xs font-semibold text-foreground/70"
                      >
                        Blood group{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <select
                        id="signup-blood-group"
                        value={bloodGroup}
                        onChange={(event) =>
                          setBloodGroup(
                            bloodGroups.find((group) => group === event.target.value) ?? "",
                          )
                        }
                        className="mt-1.5 w-full rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select (optional)</option>
                        {bloodGroups.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="signup-address"
                      className="text-xs font-semibold text-foreground/70"
                    >
                      Address
                    </label>
                    <textarea
                      id="signup-address"
                      required
                      maxLength={500}
                      autoComplete="street-address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="Your address"
                      rows={3}
                      className="mt-1.5 w-full resize-y rounded-xl border border-border bg-white/70 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Your profile details stay in your account and are not shared with contacts.
                    Passwords are securely hashed.
                  </p>
                </>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void requestPasswordReset()}
                    className="text-primary font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || checkingSession}
                className="w-full py-3.5 rounded-xl bg-gradient-primary text-white font-semibold shadow-soft hover:shadow-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {checkingSession ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner /> Verifying saved session…
                  </span>
                ) : loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner /> Processing
                  </span>
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>

              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive mt-3">
                  {error}
                </div>
              )}

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white/0 text-muted-foreground">External sign-in</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled
                  className="py-2.5 rounded-xl bg-white/70 border border-border text-sm font-medium opacity-60"
                >
                  Google · not configured
                </button>
                <button
                  type="button"
                  disabled
                  className="py-2.5 rounded-xl bg-white/70 border border-border text-sm font-medium opacity-60"
                >
                  Apple · not configured
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-2">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-semibold hover:underline"
                >
                  {mode === "login" ? "Create one" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
