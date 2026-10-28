import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, MapPinned, Route as RouteIcon } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { ModuleCardGrid, type ModuleCardItem } from "@/components/hershield/ModuleCardGrid";

export const Route = createFileRoute("/journey-safe-places")({
  head: () => ({
    meta: [
      { title: "Journey & Safe Places · Her_Shield" },
      { name: "description", content: "Journey check-ins, location map, and nearby places." },
    ],
  }),
  component: JourneySafePlaces,
});

const modules: ModuleCardItem[] = [
  {
    to: "/safe-journey",
    icon: RouteIcon,
    title: "Safe Journey",
    description: "Create a journey, check in, manage its status, and review journey history.",
    accent: "from-indigo-500 to-blue-600",
  },
  {
    to: "/map",
    icon: MapPin,
    title: "Live Map & Nearby Help",
    description: "View nearby hospitals and police stations on a map and open directions.",
    accent: "from-purple-500 to-fuchsia-600",
  },
];

function JourneySafePlaces() {
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
        title="Journey & Safe Places"
        subtitle="Plan a journey, check in manually, or explore map and nearby public listings."
        icon={MapPinned}
        showHome={false}
      />
      <ModuleCardGrid items={modules} />
      <p className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
        Nearby listings are informational. Journey check-ins are manual, and location is not
        continuously tracked.
      </p>
    </AppLayout>
  );
}
