import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, HeartHandshake, Shield, Siren, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/hershield/AppLayout";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home · Her_Shield" },
      { name: "description", content: "Her_Shield — your personal safety dashboard." },
    ],
  }),
  component: Home,
});

const sections = [
  {
    to: "/emergency-protection",
    icon: HeartHandshake,
    number: "01",
    title: "Emergency & Protection",
    description:
      "Access SOS, trusted contacts, voice keyword checks, and other personal protection tools.",
    className: "from-rose-500/15 via-pink-500/10 to-transparent",
    iconClassName: "from-rose-500 to-pink-600",
  },
  {
    to: "/journey-safe-places",
    icon: Compass,
    number: "02",
    title: "Journey & Safe Places",
    description:
      "Plan a journey, manage check-ins, view your map, and explore nearby help listings.",
    className: "from-violet-500/15 via-purple-500/10 to-transparent",
    iconClassName: "from-violet-500 to-indigo-600",
  },
] as const;

function Home() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 px-6 py-10 shadow-card backdrop-blur sm:px-10 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-secondary/10 blur-3xl"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Shield className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Your safety, your choices
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Welcome to <span className="gradient-text">Her_Shield</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              A personal safety companion that brings your trusted tools together, with control over
              what you share and when.
            </p>
          </div>
        </section>

        <section className="mt-6 flex flex-col items-center gap-3 sm:mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Need help quickly?
          </p>
          <Link
            to="/sos"
            hash="activate-sos"
            aria-label="Open SOS Emergency and activate the alert"
            aria-describedby="home-sos-description"
            className="group flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border-2 border-white/90 bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-[0_6px_18px_-8px_rgba(190,18,60,0.7)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_22px_-8px_rgba(190,18,60,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 focus-visible:ring-offset-2 sm:h-28 sm:w-28"
          >
            <Siren className="h-6 w-6" aria-hidden="true" />
            <span className="text-xl font-bold tracking-wide">SOS</span>
            <span className="text-[10px] font-medium">Emergency</span>
          </Link>
          <span id="home-sos-description" className="sr-only">
            Opens the SOS screen and displays the alert status.
          </span>
        </section>

        <section aria-label="Safety areas" className="mt-8 grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className={`group relative flex min-h-56 flex-col overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br ${section.className} bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-8`}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${section.iconClassName} shadow-soft transition-transform duration-300 group-hover:scale-105`}
                >
                  <section.icon className="h-7 w-7 text-white" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold tracking-widest text-primary/60">
                  {section.number}
                </span>
              </div>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">{section.title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ArrowRight
                  className="mb-1 h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </section>

        <section aria-labelledby="about-heading" className="mt-10 py-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">About us</p>
          <h2 id="about-heading" className="mt-2 text-2xl font-bold text-foreground">
            Personal safety, with clarity and control
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
            Her_Shield brings together account-backed SOS records, a user-managed Trust Circle,
            journey check-ins, browser-based voice keyword checks, and map tools for exploring
            nearby places. Location, microphone access, and contact sharing are requested for
            specific actions and remain subject to your permission and choices.
          </p>
          <div className="mt-6">
            <h3 className="text-sm font-bold text-foreground">Important app information</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              SOS saves an account record and updates notification status in the app. Contact local
              emergency services directly when immediate assistance is needed.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
