import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/help-centers")({
  beforeLoad: () => {
    throw redirect({ to: "/map" });
  },
});
