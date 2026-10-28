import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, AudioLines, History, Mic, PhoneCall, Siren, Users } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { ModuleCardGrid, type ModuleCardItem } from "@/components/hershield/ModuleCardGrid";

export const Route = createFileRoute("/emergency-protection")({
  head: () => ({
    meta: [
      { title: "Emergency & Protection · Her_Shield" },
      { name: "description", content: "SOS, trusted contacts, voice, and protection tools." },
    ],
  }),
  component: EmergencyProtection,
});

const modules: ModuleCardItem[] = [
  {
    to: "/sos",
    icon: Siren,
    title: "SOS Emergency",
    description: "Save an SOS record and optionally message selected, opted-in contacts.",
    accent: "from-rose-500 to-pink-600",
  },
  {
    to: "/trust-circle",
    icon: Users,
    title: "Trust Circle",
    description: "Manage trusted contacts and their notification and journey-sharing consent.",
    accent: "from-pink-500 to-purple-600",
  },
  {
    to: "/alert-history",
    icon: History,
    title: "SOS Record History",
    description: "Review SOS events saved to your account and any recorded SMS outcomes.",
    accent: "from-violet-500 to-fuchsia-600",
  },
  {
    to: "/voice-ai",
    icon: Mic,
    title: "Voice SOS Activation",
    description: "Configure a phrase and test foreground browser keyword detection.",
    accent: "from-purple-500 to-indigo-600",
  },
  {
    to: "/fake-call",
    icon: PhoneCall,
    title: "Fake Call Simulation",
    description: "Open an on-screen incoming-call simulation. It is not a real phone call.",
    accent: "from-amber-500 to-orange-600",
  },
  {
    to: "/audio-capture",
    icon: AudioLines,
    title: "Audio Capture",
    description: "Start a browser recording manually with microphone permission.",
    accent: "from-rose-500 to-orange-500",
  },
];

function EmergencyProtection() {
  return (
    <AppLayout>
      <div className="mb-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </Link>
      </div>
      <PageHeader
        title="Emergency & Protection"
        subtitle="Choose a tool. Location and microphone access are requested only when needed."
        icon={Siren}
        showHome={false}
      />
      <ModuleCardGrid items={modules} />
    </AppLayout>
  );
}
