import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { Contact, Phone, Shield, Hospital, Flame } from "lucide-react";

export const Route = createFileRoute("/contacts")({
  component: Contacts,
});

const emergency = [
  { name: "Emergency Response", number: "112", icon: Shield, color: "from-rose-500 to-red-600" },
  { name: "Police", number: "100", icon: Shield, color: "from-blue-500 to-indigo-600" },
  { name: "Ambulance", number: "102", icon: Hospital, color: "from-rose-500 to-pink-600" },
  { name: "Fire", number: "101", icon: Flame, color: "from-orange-500 to-red-500" },
  { name: "Women Helpline", number: "1091", icon: Shield, color: "from-purple-500 to-fuchsia-600" },
  { name: "Child Helpline", number: "1098", icon: Shield, color: "from-emerald-500 to-teal-500" },
];

function Contacts() {
  return (
    <AppLayout>
      <PageHeader
        title="Emergency Resources"
        subtitle="India-based quick-dial references and links to your saved Trust Circle."
        icon={Contact}
      />

      <div className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900">
        Tap a number to open your device dialer. Confirm local helpline availability with official
        sources.
      </div>
      <h2 className="text-lg font-bold mb-4">India quick-dial numbers</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {emergency.map((e) => (
          <a
            key={e.name}
            href={`tel:${e.number}`}
            className="glass rounded-2xl p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-all"
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${e.color} flex items-center justify-center shadow-soft`}
            >
              <e.icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold">{e.name}</div>
              <div className="text-2xl font-bold gradient-text">{e.number}</div>
            </div>
            <Phone className="w-5 h-5 text-primary" />
          </a>
        ))}
      </div>

      <div className="glass-strong rounded-3xl p-6 text-center">
        <h3 className="font-bold text-lg">Your Trust Circle</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage contact details stored in your account. Selected opted-in contacts may receive SMS
          after you confirm an SOS or select them for a journey; saving a contact alone sends
          nothing.
        </p>
        <Link
          to="/trust-circle"
          className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-2xl bg-gradient-primary text-white font-semibold shadow-soft"
        >
          Open Trust Circle
        </Link>
      </div>
    </AppLayout>
  );
}
