import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { FileRoutesByTo } from "../../routeTree.gen";
import { ArrowRight } from "lucide-react";

export type ModuleCardItem = {
  to: keyof FileRoutesByTo;
  hash?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
};

export function ModuleCardGrid({ items }: { items: ModuleCardItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={`${item.to}-${item.title}`}
          to={item.to}
          hash={item.hash}
          className="group flex min-h-48 flex-col rounded-3xl border border-white/70 bg-white/75 p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} shadow-soft`}
            >
              <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <ArrowRight
              className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
              aria-hidden="true"
            />
          </div>
          <h2 className="mt-5 text-lg font-bold text-foreground">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}
