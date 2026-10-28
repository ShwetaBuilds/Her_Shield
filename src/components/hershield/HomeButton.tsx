import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function HomeButton() {
  return (
    <Link
      to="/home"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-semibold text-foreground/80 hover:bg-white/90 hover:-translate-y-0.5 transition-all border border-white/60"
    >
      <Home className="w-4 h-4 text-primary" />
      Go to Home
    </Link>
  );
}
