import SafetyJourney from "../models/SafetyJourney.js";
import { notifyJourneyContacts } from "./journeyNotificationService.js";

const REMINDER_INTERVAL_MS = 60_000;
const CLAIM_LEASE_MS = 5 * 60_000;
const BATCH_SIZE = 100;

export async function processOverdueJourneys(now = new Date()) {
  const leaseCutoff = new Date(now.getTime() - CLAIM_LEASE_MS);
  const candidates = await SafetyJourney.find({
    status: "active",
    expectedArrivalAt: { $lte: now },
    overdueReminderCompletedAt: { $exists: false },
    $or: [
      { overdueReminderClaimedAt: { $exists: false } },
      { overdueReminderClaimedAt: { $lte: leaseCutoff } },
    ],
  })
    .sort({ expectedArrivalAt: 1 })
    .limit(BATCH_SIZE);

  for (const candidate of candidates) {
    const claimedAt = new Date();
    const journey = await SafetyJourney.findOneAndUpdate(
      {
        _id: candidate._id,
        status: "active",
        expectedArrivalAt: { $lte: now },
        overdueReminderCompletedAt: { $exists: false },
        $or: [
          { overdueReminderClaimedAt: { $exists: false } },
          { overdueReminderClaimedAt: { $lte: leaseCutoff } },
        ],
      },
      { $set: { overdueReminderClaimedAt: claimedAt } },
      { new: true },
    );
    if (!journey) continue;

    try {
      await notifyJourneyContacts(
        journey,
        "journey_overdue",
        `journey:${journey._id}:overdue`,
        `Her_Shield reminder: the expected arrival time for the journey to ${journey.destination} has passed. Please check in with the traveler directly; their location is not being tracked.`,
      );
      await SafetyJourney.updateOne(
        { _id: journey._id, overdueReminderClaimedAt: claimedAt },
        { $set: { overdueReminderCompletedAt: new Date() } },
      );
    } catch (error) {
      await SafetyJourney.updateOne(
        { _id: journey._id, overdueReminderClaimedAt: claimedAt },
        { $unset: { overdueReminderClaimedAt: 1 } },
      );
      throw error;
    }
  }
}

export function startJourneyReminderScheduler() {
  const run = () => {
    void processOverdueJourneys().catch((error) => {
      console.error("Journey overdue reminder pass failed:", error);
    });
  };
  run();
  return setInterval(run, REMINDER_INTERVAL_MS);
}
