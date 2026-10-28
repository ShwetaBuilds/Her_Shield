import * as React from "react";

export function LoadingSpinner({ className = "w-5 h-5" }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} aria-hidden="true" />;
}
