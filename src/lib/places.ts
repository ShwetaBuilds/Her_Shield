export type PlaceCategory = "Hospital" | "Police" | "Medical Store" | "Public Park";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  phone?: string;
  openingHours?: string;
  coords: [number, number];
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export async function fetchNearbyPlaces(latitude: number, longitude: number): Promise<Place[]> {
  const query = `[out:json][timeout:20];(
    nwr(around:5000,${latitude},${longitude})["amenity"~"^(hospital|clinic|police|pharmacy)$"];
    nwr(around:5000,${latitude},${longitude})["leisure"="park"];
  );out center tags;`;
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) throw new Error(`Nearby places service returned ${response.status}`);

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  if (!Array.isArray(payload.elements))
    throw new Error("Nearby places service returned invalid data");

  return payload.elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const amenity = tags.amenity;
    const category: PlaceCategory | null =
      amenity === "police"
        ? "Police"
        : amenity === "hospital" || amenity === "clinic"
          ? "Hospital"
          : amenity === "pharmacy"
            ? "Medical Store"
            : tags.leisure === "park"
              ? "Public Park"
              : null;
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (!category || latitude === undefined || longitude === undefined) return [];

    const address = [
      [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
      tags["addr:suburb"],
      tags["addr:city"],
    ]
      .filter(Boolean)
      .join(", ");

    return [
      {
        id: `${element.type}-${element.id}`,
        name: tags.name || `${category} (name not listed)`,
        category,
        address: address || "Address not listed in OpenStreetMap",
        phone: tags.phone || tags["contact:phone"],
        openingHours: tags.opening_hours,
        coords: [latitude, longitude],
      },
    ];
  });
}
