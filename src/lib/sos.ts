import { sosApi, type EmergencyContact, type SosRecord } from "@/lib/api";

const priorityOrder = { High: 0, Medium: 1, Low: 2 } as const;

export function orderTrustedContacts(contacts: EmergencyContact[]) {
  return contacts
    .slice()
    .sort(
      (left, right) =>
        priorityOrder[left.priority] - priorityOrder[right.priority] ||
        left.name.localeCompare(right.name),
    );
}

export function getSosContactLabel(
  contacts: EmergencyContact[],
  selectedContactIds: string[],
  contactsUnavailable = false,
) {
  if (contactsUnavailable) return "Trusted contact unavailable";
  if (contacts.length === 0) return "No trusted contact added";

  const contact =
    contacts.find((candidate) => selectedContactIds.includes(candidate._id)) ?? contacts[0];
  const name = contact.name.trim() || "Trusted contact";
  return name;
}

export async function createSosRecord({
  notes,
  idempotencyKey,
}: {
  notes?: string;
  idempotencyKey: string;
}): Promise<{ record: SosRecord; locationIncluded: boolean; locationWarning?: string }> {
  let location: { latitude: number; longitude: number } | undefined;
  let locationWarning: string | undefined;

  if (!navigator.geolocation) {
    locationWarning = "Location is unavailable; the SOS record was saved without coordinates.";
  } else {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        }),
      );
      location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch {
      locationWarning =
        "Location permission was unavailable; the SOS record was saved without coordinates.";
    }
  }

  const { data: record } = await sosApi.create({ location, notes }, idempotencyKey);
  return { record, locationIncluded: Boolean(location), locationWarning };
}
