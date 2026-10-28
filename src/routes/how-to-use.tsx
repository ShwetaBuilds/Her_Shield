import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import {
  BookOpen,
  Siren,
  MapPin,
  Mic,
  PhoneCall,
  AudioLines,
  Users,
  Route as RouteIcon,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/how-to-use")({
  head: () => ({
    meta: [
      { title: "How to Use · Her_Shield" },
      {
        name: "description",
        content:
          "Step-by-step guide to using Her_Shield's account-backed records, map, contacts, and browser-based tools.",
      },
    ],
  }),
  component: HowToUse,
});

const guides = [
  {
    icon: Siren,
    color: "from-rose-500 to-pink-600",
    to: "/sos",
    title: "SOS Emergency",
    steps: [
      "Open the SOS module from the homepage.",
      "Tap the large red SOS button and confirm.",
      "The event is saved to your account and includes GPS coordinates only if you grant permission.",
      "The app saves the SOS record and updates notification status. Contact local emergency services directly when needed.",
    ],
  },
  {
    icon: Mic,
    color: "from-purple-500 to-fuchsia-600",
    to: "/voice-ai",
    title: "Voice SOS Activation",
    steps: [
      "Enable voice activation and configure a phrase in Safety Settings.",
      "Press Start to ask your browser for speech-recognition permission. Listening is visible and runs only while this page is open.",
      "A recognized phrase automatically saves an SOS record and updates its in-app notification status.",
      "Choose a 30-second to 10-minute cooldown. Keep this page open while listening.",
    ],
  },
  {
    icon: MapPin,
    color: "from-pink-500 to-purple-500",
    to: "/map",
    title: "Live Map & Nearby Help",
    steps: [
      "Allow browser location access or search for a place or address.",
      "OpenStreetMap shows nearby hospitals, police stations, pharmacies, and parks returned within 5 km after you grant location access.",
      "Select a result for its returned address, phone number, or current opening status and open directions.",
      "Listings are informational and may be incomplete. Confirm details independently.",
    ],
  },
  {
    icon: RouteIcon,
    color: "from-indigo-500 to-blue-600",
    to: "/safe-journey",
    title: "Safe Journey",
    steps: [
      "Save a destination and expected arrival time in your account.",
      "Use manual check-ins or mark the journey complete from the open page.",
      "Review your journey history, check-in timestamps, and current status in the same module.",
      "Journeys are manual and do not track your route. SMS reminders require an eligible consented contact and configured Twilio.",
    ],
  },
  {
    icon: Users,
    color: "from-purple-500 to-indigo-500",
    to: "/trust-circle",
    title: "Trust Circle",
    steps: [
      "Add trusted contacts, set their priority, and manage notification consent.",
      "Contact information is stored in your account.",
      "Select a saved contact in Voice SOS to include their name in the activation status.",
      "Edit or remove contacts using the account-backed controls.",
    ],
  },
  {
    icon: PhoneCall,
    color: "from-amber-500 to-orange-500",
    to: "/fake-call",
    title: "Fake Call",
    steps: [
      "Pick a caller name and a delay.",
      "Start a visual call simulation; it does not place or receive a phone call.",
      "Keep this browser tab open during the countdown.",
    ],
  },
  {
    icon: AudioLines,
    color: "from-rose-500 to-orange-400",
    to: "/audio-capture",
    title: "Manual Audio Capture",
    steps: [
      "Start recording manually and grant microphone permission.",
      "The recording stays in page memory; download it before closing the page.",
      "Recordings stay in this browser session and are not started by SOS.",
    ],
  },
];

const workflow = [
  "User opens Her_Shield and is signed in to their safety dashboard.",
  "Listening begins only after you press Start and grant microphone access.",
  "Manual SOS or a recognized voice phrase saves an account event and updates notification status in the app.",
  "Location is used after browser permission; explicit sharing saves a location record to your account.",
  "Manual audio recordings stay in page memory; Alert History shows only saved SOS records.",
];

function HowToUse() {
  return (
    <AppLayout>
      <PageHeader
        title="How to Use Her_Shield"
        subtitle="A complete user guide to every safety module."
        icon={BookOpen}
      />

      <section className="glass-strong rounded-3xl p-8 mb-10">
        <h2 className="text-2xl font-bold">What is Her_Shield?</h2>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Her_Shield provides account-backed trusted contacts and SOS records, browser-based voice
          phrase detection with explicit SOS confirmation, and OpenStreetMap nearby listings. It
          does not dispatch emergency services or verify that a listed place is safe.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-5">Module-by-module guide</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {guides.map((g) => (
            <div key={g.title} className="glass rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${g.color} flex items-center justify-center shadow-soft`}
                >
                  <g.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">{g.title}</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {g.steps.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
              <Link
                to={g.to}
                className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary hover:gap-2 transition-all"
              >
                Open module <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-strong rounded-3xl p-8">
        <h2 className="text-2xl font-bold">Full Emergency Workflow</h2>
        <ol className="mt-4 space-y-3">
          {workflow.map((w, i) => (
            <li key={w} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <p className="text-sm pt-1">{w}</p>
            </li>
          ))}
        </ol>
      </section>
    </AppLayout>
  );
}
