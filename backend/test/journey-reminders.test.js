import assert from "node:assert/strict";
import { after, test } from "node:test";
import EmergencyContact from "../models/EmergencyContact.js";
import NotificationLog from "../models/NotificationLog.js";
import SafetyJourney from "../models/SafetyJourney.js";
import { processOverdueJourneys } from "../services/journeyReminderService.js";

const userId = "reminder-user";
const journey = {
  _id: "reminder-journey",
  user: userId,
  destination: "Library",
  status: "active",
  expectedArrivalAt: new Date(Date.now() - 60_000),
  notifyContactIds: ["reminder-contact"],
};
const contact = {
  _id: "reminder-contact",
  user: userId,
  phone: "+12025550174",
  smsConsent: true,
  journeyShareConsent: true,
};
const notifications = [];
const original = {
  findJourneys: SafetyJourney.find,
  updateJourney: SafetyJourney.findOneAndUpdate,
  updateJourneyById: SafetyJourney.updateOne,
  findContacts: EmergencyContact.find,
  findNotification: NotificationLog.findOne,
  createNotification: NotificationLog.create,
};
const twilioEnvironment = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID",
  "TWILIO_FROM",
].map((key) => [key, process.env[key]]);

after(() => {
  SafetyJourney.find = original.findJourneys;
  SafetyJourney.findOneAndUpdate = original.updateJourney;
  SafetyJourney.updateOne = original.updateJourneyById;
  EmergencyContact.find = original.findContacts;
  NotificationLog.findOne = original.findNotification;
  NotificationLog.create = original.createNotification;
  for (const [key, value] of twilioEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("overdue reminders persist a claim and create at most one notification event", async () => {
  for (const key of [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_MESSAGING_SERVICE_SID",
    "TWILIO_FROM",
  ]) {
    delete process.env[key];
  }
  journey.overdueReminderClaimedAt = undefined;
  journey.overdueReminderCompletedAt = undefined;
  notifications.length = 0;

  SafetyJourney.find = () => ({
    sort: () => ({
      limit: async () => (journey.overdueReminderCompletedAt ? [] : [journey]),
    }),
  });
  SafetyJourney.findOneAndUpdate = async (_filter, update) => {
    if (journey.overdueReminderCompletedAt) return null;
    journey.overdueReminderClaimedAt = update.$set.overdueReminderClaimedAt;
    return journey;
  };
  SafetyJourney.updateOne = async (_filter, update) => {
    if (update.$set?.overdueReminderCompletedAt) {
      journey.overdueReminderCompletedAt = update.$set.overdueReminderCompletedAt;
    }
    if (update.$unset?.overdueReminderClaimedAt) {
      journey.overdueReminderClaimedAt = undefined;
    }
    return { acknowledged: true, modifiedCount: 1 };
  };
  EmergencyContact.find = async () => [contact];
  NotificationLog.findOne = async ({ eventKey, contact: contactId }) =>
    notifications.find((item) => item.eventKey === eventKey && item.contact === contactId) ?? null;
  NotificationLog.create = async (data) => {
    const notification = { ...data, attemptedAt: new Date() };
    notifications.push(notification);
    return notification;
  };

  await processOverdueJourneys();
  await processOverdueJourneys();

  assert.ok(journey.overdueReminderCompletedAt instanceof Date);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].eventType, "journey_overdue");
  assert.equal(notifications[0].status, "not_configured");
});
