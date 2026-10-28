import EmergencyContact from "../models/EmergencyContact.js";
import NotificationLog from "../models/NotificationLog.js";
import { notifyContacts } from "./notificationService.js";

export const journeyEventTypes = [
  "journey_started",
  "journey_checkin",
  "journey_extended",
  "journey_completed",
  "journey_cancelled",
  "journey_overdue",
];

export async function notifyJourneyContacts(journey, eventType, eventKey, message) {
  const contactIds = (journey.notifyContactIds ?? []).map(String);
  if (!contactIds.length) return [];

  const contacts = await EmergencyContact.find({
    _id: { $in: contactIds },
    user: journey.user,
    smsConsent: true,
    journeyShareConsent: true,
  });
  const eligibleIds = new Set(contacts.map((contact) => String(contact._id)));
  for (const contactId of contactIds.filter((id) => !eligibleIds.has(id))) {
    const existing = await NotificationLog.findOne({
      user: journey.user,
      eventKey,
      contact: contactId,
    });
    if (!existing) {
      await NotificationLog.create({
        user: journey.user,
        eventType,
        eventId: journey._id,
        eventKey,
        contact: contactId,
        status: "skipped_consent",
      });
    }
  }

  return notifyContacts({
    userId: journey.user,
    eventType,
    eventId: journey._id,
    eventKey,
    contacts,
    message,
  });
}
