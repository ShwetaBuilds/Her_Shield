import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Hospital, LocateFixed, MapPin, Navigation, Shield } from "lucide-react";
import { fetchNearbyPlaces, type Place, type PlaceCategory } from "@/lib/places";

type PlaceFilter = "All" | "Hospital" | "Police";
type Coordinates = { latitude: number; longitude: number };

const initialCenter: [number, number] = [20.5937, 78.9629];

function placeColor(category: PlaceCategory) {
  switch (category) {
    case "Hospital":
      return "#e11d48";
    case "Police":
      return "#1d4ed8";
    case "Medical Store":
      return "#b45309";
    case "Public Park":
      return "#15803d";
  }
}

function getLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });
  });
}

function isGeolocationError(value: unknown): value is GeolocationPositionError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "number"
  );
}

export function LiveMap({ filter = "All" }: { filter?: PlaceFilter }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const layersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visiblePlaces = useMemo(
    () => places.filter((place) => filter === "All" || place.category === filter),
    [filter, places],
  );

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let map: LeafletMap | null = null;

    void import("leaflet")
      .then((leaflet) => {
        if (cancelled || !mapElement.current) return;

        leafletRef.current = leaflet;
        map = leaflet.map(mapElement.current, { scrollWheelZoom: false }).setView(initialCenter, 5);
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);
        mapRef.current = map;
        layersRef.current = leaflet.layerGroup().addTo(map);
        resizeObserver = new ResizeObserver(() => map?.invalidateSize());
        resizeObserver.observe(mapElement.current);
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapError("The interactive map could not be loaded. Please refresh and try again.");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
      layersRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const layers = layersRef.current;
    if (!mapReady || !map || !leaflet || !layers) return;

    layers.clearLayers();

    if (location) {
      leaflet
        .circleMarker([location.latitude, location.longitude], {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#7c3aed",
          fillOpacity: 1,
        })
        .bindPopup("Your current location")
        .addTo(layers);
    }

    for (const place of visiblePlaces) {
      const popup = document.createElement("div");
      const category = document.createElement("strong");
      category.textContent = place.category;
      popup.append(category, document.createElement("br"), document.createTextNode(place.name));
      const marker = leaflet
        .circleMarker(place.coords, {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: placeColor(place.category),
          fillOpacity: 1,
        })
        .bindPopup(popup)
        .addTo(layers);
      marker.on("click", () => setSelectedPlaceId(place.id));
    }

    const selectedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId);
    if (location && selectedPlace) {
      leaflet
        .polyline(
          [
            [location.latitude, location.longitude],
            selectedPlace.coords,
          ],
          { color: "#7c3aed", dashArray: "7 8", weight: 4 },
        )
        .addTo(layers);
      map.fitBounds(
        [
          [location.latitude, location.longitude],
          selectedPlace.coords,
        ],
        { padding: [36, 36], maxZoom: 14 },
      );
    } else if (location) {
      map.setView([location.latitude, location.longitude], 14);
    } else if (selectedPlace) {
      map.setView(selectedPlace.coords, 15);
    }
  }, [location, mapReady, selectedPlaceId, visiblePlaces]);

  const locateNearbyPlaces = async () => {
    if (!navigator.geolocation) {
      setError("Location services are not available in this browser.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedPlaceId(null);
    setLocation(null);
    setPlaces([]);

    try {
      const position = await getLocation();
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(currentLocation);

      const nearbyPlaces = await fetchNearbyPlaces(
        currentLocation.latitude,
        currentLocation.longitude,
      );
      setPlaces(nearbyPlaces);
    } catch (locationError) {
      if (isGeolocationError(locationError)) {
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access in your browser to find nearby help."
            : "Your location could not be determined. Check your device location settings and try again.",
        );
      } else {
        setError(
          "Your location is shown, but nearby places could not be loaded. Check your connection and try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-label="Interactive map and nearby places" className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-border bg-white/80 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-foreground">Live map & nearby help</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              OpenStreetMap data · nearby listings may be incomplete or out of date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void locateNearbyPlaces()}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition disabled:cursor-wait disabled:opacity-70"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {loading ? "Finding nearby help…" : location ? "Refresh nearby places" : "Use my location"}
          </button>
        </div>

        {error && (
          <p role="alert" className="border-b border-destructive/15 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {mapError && (
          <p role="alert" className="border-b border-destructive/15 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {mapError}
          </p>
        )}

        <div
          ref={mapElement}
          className="h-[55vh] min-h-[380px] w-full bg-[#e9f0e7]"
          role="application"
          aria-label="Interactive OpenStreetMap map"
        />
      </div>

      <div>
        <div className="mb-3">
          <div>
            <h2 className="font-bold text-foreground">Nearby help</h2>
            <p className="text-xs text-muted-foreground">
              {location
                ? `${visiblePlaces.length} listing${visiblePlaces.length === 1 ? "" : "s"} shown within 5 km.`
                : "Use your location to find hospitals, police, pharmacies, and parks nearby."}
            </p>
          </div>
        </div>

        {visiblePlaces.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {visiblePlaces.map((place) => {
              const Icon = place.category === "Hospital" ? Hospital : place.category === "Police" ? Shield : MapPin;
              const selected = selectedPlaceId === place.id;
              const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}`;
              return (
                <article
                  key={place.id}
                  className={`rounded-2xl border bg-white/80 p-4 shadow-sm transition ${
                    selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPlaceId(selected ? null : place.id)}
                    aria-pressed={selected}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: placeColor(place.category) }}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{place.name}</span>
                      <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                        {place.category}
                      </span>
                      <span className="mt-2 block text-sm text-muted-foreground">{place.address}</span>
                      {place.phone && (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          <a href={`tel:${place.phone}`} onClick={(event) => event.stopPropagation()}>
                            {place.phone}
                          </a>
                        </span>
                      )}
                      {place.openingHours && (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Listed hours: {place.openingHours}
                        </span>
                      )}
                    </span>
                  </button>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                    Open directions
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-white/70 p-4 text-sm text-muted-foreground">
            {loading
              ? "Loading nearby places…"
              : location
                ? `No ${filter === "All" ? "" : `${filter.toLowerCase()} `}places were found nearby.`
                : "Nearby results will appear here after you choose Use my location."}
          </p>
        )}
      </div>

      <p role="note" className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-5 text-amber-950">
        Map listings and opening hours come from OpenStreetMap contributors and are not safety-verified.
        Confirm details independently; this map does not contact emergency services.
      </p>
    </section>
  );
}
