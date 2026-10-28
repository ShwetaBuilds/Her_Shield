import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Shield, LogOut } from "lucide-react";
import { useEffect } from "react";
import { HomeButton } from "./HomeButton";
import { clearAuth } from "@/lib/auth";
import { AuthGuard } from "@/lib/authGuard";

const routeHistoryKey = "her-shield-route-history";

type RouteHistory = {
  startIndex: number;
  paths: Record<number, string>;
};

function getHistoryIndex() {
  const index = (window.history.state as { __TSR_index?: unknown } | null)?.__TSR_index;
  return typeof index === "number" ? index : 0;
}

function getBackFallback(pathname: string) {
  if (
    [
      "/sos",
      "/trust-circle",
      "/alert-history",
      "/voice-ai",
      "/fake-call",
      "/audio-capture",
      "/contacts",
    ].includes(pathname)
  ) {
    return "/emergency-protection";
  }
  if (["/map", "/help-centers", "/safe-journey"].includes(pathname)) {
    return "/journey-safe-places";
  }
  return "/home";
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const backFallback = getBackFallback(pathname);

  useEffect(() => {
    const historyIndex = getHistoryIndex();
    const storedHistory = sessionStorage.getItem(routeHistoryKey);
    let routeHistory: RouteHistory | null = null;
    if (storedHistory) {
      try {
        const parsed: unknown = JSON.parse(storedHistory);
        if (
          parsed &&
          typeof parsed === "object" &&
          "startIndex" in parsed &&
          typeof parsed.startIndex === "number" &&
          "paths" in parsed &&
          parsed.paths &&
          typeof parsed.paths === "object"
        ) {
          routeHistory = parsed as RouteHistory;
        }
      } catch {
        routeHistory = null;
      }
    }

    if (!routeHistory || historyIndex < routeHistory.startIndex) {
      routeHistory = { startIndex: historyIndex, paths: {} };
    }
    routeHistory.paths[historyIndex] = pathname;
    sessionStorage.setItem(routeHistoryKey, JSON.stringify(routeHistory));
  }, [pathname]);

  const logout = () => {
    clearAuth();
    void navigate({ to: "/", replace: true });
  };

  const goBack = () => {
    const historyIndex = getHistoryIndex();
    const storedHistory = sessionStorage.getItem(routeHistoryKey);
    let routeHistory: RouteHistory | null = null;
    if (storedHistory) {
      try {
        routeHistory = JSON.parse(storedHistory) as RouteHistory;
      } catch {
        routeHistory = null;
      }
    }
    const previousPath = routeHistory?.paths[historyIndex - 1];
    if (
      routeHistory &&
      historyIndex > routeHistory.startIndex &&
      previousPath &&
      previousPath !== "/"
    ) {
      window.history.back();
      return;
    }
    navigate({ to: backFallback });
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 glass-strong border-b border-white/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/home" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg gradient-text">Her_Shield</span>
            </Link>

            <nav
              aria-label="Main navigation"
              className="order-3 -mx-1 flex w-full max-w-full items-center gap-1 overflow-x-auto px-1 md:order-none md:ml-auto md:w-auto"
            >
              <Link
                to="/home"
                activeProps={{ className: "bg-white/80 text-primary" }}
                className="inline-flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-foreground/80 hover:bg-white/70 transition-all"
              >
                Home
              </Link>
              <Link
                to="/emergency-protection"
                activeProps={{ className: "bg-white/80 text-primary" }}
                className="inline-flex shrink-0 items-center px-3 py-2 rounded-full text-xs font-semibold text-foreground/80 hover:bg-white/70 transition-all"
              >
                Emergency & Protection
              </Link>
              <Link
                to="/journey-safe-places"
                activeProps={{ className: "bg-white/80 text-primary" }}
                className="inline-flex shrink-0 items-center px-3 py-2 rounded-full text-xs font-semibold text-foreground/80 hover:bg-white/70 transition-all"
              >
                Journey & Safe Places
              </Link>
              <Link
                to="/profile"
                activeProps={{ className: "bg-white/80 text-primary" }}
                className="inline-flex shrink-0 items-center px-3 py-2 rounded-full text-xs font-semibold text-foreground/80 hover:bg-white/70 transition-all"
              >
                Profile
              </Link>
              <Link
                to="/safety-settings"
                activeProps={{ className: "bg-white/80 text-primary" }}
                className="inline-flex shrink-0 items-center px-3 py-2 rounded-full text-xs font-semibold text-foreground/80 hover:bg-white/70 transition-all"
              >
                Settings
              </Link>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {children}
          {pathname !== "/home" && (
            <div className="mt-10 flex justify-center border-t border-primary/15 pt-6">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-5 py-2.5 text-sm font-semibold text-foreground/80 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`Go back or return to ${backFallback === "/home" ? "Home" : backFallback === "/emergency-protection" ? "Emergency & Protection" : "Journey & Safe Places"}`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            </div>
          )}
        </main>

        <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-muted-foreground">
          © 2026 Her_Shield · Built with care for women's safety
        </footer>
      </div>
    </AuthGuard>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  showHome = true,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  showHome?: boolean;
}) {
  return (
    <div className="mb-8">
      {showHome && (
        <div className="mb-4">
          <HomeButton />
        </div>
      )}
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <Icon className="w-7 h-7 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
