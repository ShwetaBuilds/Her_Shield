import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/hershield/AppLayout";
import { MapPin, Share2 } from "lucide-react";
import { useState } from "react";
import { LiveMap } from "@/components/hershield/LiveMap";
import { locationApi } from "@/lib/api";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Live Location Map · Her_Shield" }] }),
  component: MapPage,
});

const filters = ["All", "Hospital", "Police"] as const;

function MapPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setError(null);
    setShareResult(null);
    setShared(false);
    setSharing(true);
    let coords: { latitude: number; longitude: number };
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      );
      coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      setError("Location permission was unavailable. No location was saved or shared.");
      setSharing(false);
      return;
    }

    try {
      await locationApi.record(coords);
    } catch {
      setError("Could not save your location to your account. Nothing was shared.");
      setSharing(false);
      return;
    }

    const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My current location",
          text: "I'm sharing my current location.",
          url,
        });
        setShareResult("Location saved. The sharing sheet closed; delivery is not confirmed.");
        setShared(true);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareResult("Location saved and a map link copied to your clipboard; it was not sent.");
        setShared(true);
      } else {
        setShareResult(
          "Location saved to your account, but this browser cannot share or copy a link.",
        );
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        setShareResult("Location saved to your account; sharing was canceled.");
      } else {
        setError("Location was saved, but the map link could not be shared or copied.");
      }
      setShared(false);
    } finally {
      setSharing(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Live Map & Nearby Help"
        subtitle="Find nearby hospitals and police stations. Your GPS location is requested only for this map."
        icon={MapPin}
      />
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {shareResult && (
        <div role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">
          {shareResult}
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {filters.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === c
                ? "bg-gradient-primary text-white shadow-soft"
                : "glass hover:bg-white/90"
            }`}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={share}
          disabled={sharing}
          aria-busy={sharing}
          className="ml-auto px-4 py-2 rounded-full bg-gradient-primary text-white text-sm font-semibold flex items-center gap-2 shadow-soft"
        >
          <Share2 className="w-4 h-4" />{" "}
          {sharing ? "Saving location…" : shared ? "Location saved" : "Share current location"}
        </button>
      </div>

      <LiveMap filter={filter} />
    </AppLayout>
  );
}
