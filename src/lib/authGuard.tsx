import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { userApi } from "./api";
import { getToken, setUser } from "./auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [verificationError, setVerificationError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    const handleSessionExpired = () => {
      setIsAuthorized(false);
      setIsChecking(false);
      void navigate({ to: "/", replace: true });
    };
    window.addEventListener("her-shield:session-expired", handleSessionExpired);

    const verifySession = () => {
      if (!getToken()) {
        handleSessionExpired();
        return;
      }
      setIsChecking(true);
      setVerificationError(false);
      void userApi
        .getProfile()
        .then(({ data }) => {
          if (!active) return;
          setUser({ id: data.id, name: data.name, email: data.email });
          setIsAuthorized(true);
        })
        .catch(() => {
          if (!active) return;
          if (getToken()) setVerificationError(true);
          else setIsAuthorized(false);
        })
        .finally(() => {
          if (active) setIsChecking(false);
        });
    };

    verifySession();
    return () => {
      active = false;
      window.removeEventListener("her-shield:session-expired", handleSessionExpired);
    };
  }, [navigate, retryCount]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        Checking your session…
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3" role="alert">
        <p>Unable to verify your session. Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => setRetryCount((count) => count + 1)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return <>{children}</>;
}
