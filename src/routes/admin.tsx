import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { LayoutDashboard, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

function Admin() {
  return (
    <AppLayout>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Administrative reporting is not connected to the backend."
        icon={LayoutDashboard}
      />
      <div className="glass-strong rounded-3xl p-8 max-w-2xl">
        <div className="flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h2 className="font-bold text-lg">No live admin data is available</h2>
            <p className="text-sm text-muted-foreground mt-2">
              The previous dashboard showed fabricated metrics and user/location examples. Those
              have been removed. This project has no admin reporting API yet; administrative access
              and analytics require a separately authorized backend implementation.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
