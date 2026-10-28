import SafetyJourney from "../models/SafetyJourney.js";
import EmergencyContact from "../models/EmergencyContact.js";
import NotificationLog from "../models/NotificationLog.js";
import {
  journeyEventTypes,
  notifyJourneyContacts,
} from "../services/journeyNotificationService.js";

const toJourneyView = (journey, notificationAttempts = []) => ({
  ...(journey.toObject ? journey.toObject() : journey),
  notificationAttempts: notificationAttempts.map((log) => ({
    eventType: log.eventType,
    contactName: log.contact?.name ?? "Trusted contact",
    status: log.status,
    attemptedAt: log.attemptedAt,
    deliveredAt: log.deliveredAt,
    providerErrorCode: log.providerErrorCode,
  })),
});

async function getJourneyNotificationLogs(userId, journeys) {
  if (!journeys.length) return new Map();
  const logs = await NotificationLog.find({
    user: userId,
    eventType: { $in: journeyEventTypes },
    eventId: { $in: journeys.map((journey) => journey._id) },
  }).populate("contact", "name");
  const result = new Map();
  for (const log of logs) {
    const key = String(log.eventId);
    const eventLogs = result.get(key) ?? [];
    eventLogs.push(log);
    result.set(key, eventLogs);
  }
  return result;
}

async function getJourneyResponse(userId, journey) {
  const logsByJourney = await getJourneyNotificationLogs(userId, [journey]);
  return toJourneyView(journey, logsByJourney.get(String(journey._id)) ?? []);
}

export const listJourneys = async (req, res, next) => {
  try {
    const journeys = await SafetyJourney.find({ user: req.user._id }).sort({ createdAt: -1 });
    const logsByJourney = await getJourneyNotificationLogs(req.user._id, journeys);
    res.json(
      journeys.map((journey) =>
        toJourneyView(journey, logsByJourney.get(String(journey._id)) ?? []),
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const createJourney = async (req, res, next) => {
  try {
    const expectedArrivalAt = new Date(req.body.expectedArrivalAt);
    if (!Number.isFinite(expectedArrivalAt.getTime()) || expectedArrivalAt <= new Date()) {
      return res.status(400).json({ message: "Expected arrival must be a future date and time" });
    }
    const notifyContactIds = req.body.notifyContactIds ?? [];
    if (new Set(notifyContactIds).size !== notifyContactIds.length) {
      return res.status(400).json({ message: "A contact can only be selected once" });
    }
    const contacts = notifyContactIds.length
      ? await EmergencyContact.find({
          _id: { $in: notifyContactIds },
          user: req.user._id,
          smsConsent: true,
          journeyShareConsent: true,
        })
      : [];
    if (contacts.length !== notifyContactIds.length) {
      return res.status(400).json({
        message:
          "Every journey contact must belong to your account and have SMS and journey-sharing consent",
      });
    }
    if (contacts.some((contact) => !/^\+[1-9]\d{7,14}$/.test(contact.phone))) {
      return res.status(400).json({
        message: "Selected contacts need valid E.164 phone numbers before SMS can be sent",
      });
    }

    const journey = await SafetyJourney.create({
      user: req.user._id,
      destination: req.body.destination,
      expectedArrivalAt,
      notifyContactIds,
    });
    await notifyJourneyContacts(
      journey,
      "journey_started",
      `journey:${journey._id}:started`,
      `Her_Shield journey update: ${req.user.name} started a journey to ${journey.destination}. Expected arrival: ${expectedArrivalAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    );
    res.status(201).json(await getJourneyResponse(req.user._id, journey));
  } catch (error) {
    next(error);
  }
};

export const checkInJourney = async (req, res, next) => {
  try {
    const idempotencyKey = req.get("Idempotency-Key");
    if (idempotencyKey && idempotencyKey.length > 100) {
      return res.status(400).json({ message: "Idempotency key is too long" });
    }
    if (idempotencyKey) {
      const duplicate = await SafetyJourney.findOne({
        _id: req.params.id,
        user: req.user._id,
        "checkIns.idempotencyKey": idempotencyKey,
      });
      if (duplicate) return res.json(await getJourneyResponse(req.user._id, duplicate));
    }
    const journey = await SafetyJourney.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        status: "active",
        ...(idempotencyKey ? { "checkIns.idempotencyKey": { $ne: idempotencyKey } } : {}),
      },
      {
        $push: {
          checkIns: { checkedInAt: new Date(), idempotencyKey },
        },
      },
      { new: true, runValidators: true },
    );
    if (!journey && idempotencyKey) {
      const duplicate = await SafetyJourney.findOne({
        _id: req.params.id,
        user: req.user._id,
        "checkIns.idempotencyKey": idempotencyKey,
      });
      if (duplicate) return res.json(await getJourneyResponse(req.user._id, duplicate));
    }
    if (!journey) return res.status(404).json({ message: "Active journey not found" });
    const checkIn = journey.checkIns[journey.checkIns.length - 1];
    await notifyJourneyContacts(
      journey,
      "journey_checkin",
      `journey:${journey._id}:checkin:${checkIn._id ?? idempotencyKey ?? checkIn.checkedInAt.getTime()}`,
      `Her_Shield journey update: ${req.user.name} checked in during their journey to ${journey.destination} at ${checkIn.checkedInAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    );
    res.json(await getJourneyResponse(req.user._id, journey));
  } catch (error) {
    next(error);
  }
};

export const completeJourney = async (req, res, next) => {
  try {
    const journey = await SafetyJourney.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "active" },
      { status: "completed", completedAt: new Date() },
      { new: true, runValidators: true },
    );
    if (!journey) return res.status(404).json({ message: "Active journey not found" });
    await notifyJourneyContacts(
      journey,
      "journey_completed",
      `journey:${journey._id}:completed`,
      `Her_Shield journey update: ${req.user.name} marked their journey to ${journey.destination} complete.`,
    );
    res.json(await getJourneyResponse(req.user._id, journey));
  } catch (error) {
    next(error);
  }
};

export const extendJourney = async (req, res, next) => {
  try {
    const expectedArrivalAt = new Date(req.body.expectedArrivalAt);
    if (!Number.isFinite(expectedArrivalAt.getTime()) || expectedArrivalAt <= new Date()) {
      return res.status(400).json({ message: "Expected arrival must be a future date and time" });
    }
    const existing = await SafetyJourney.findOne({
      _id: req.params.id,
      user: req.user._id,
      status: "active",
    });
    if (!existing) return res.status(404).json({ message: "Active journey not found" });
    if (expectedArrivalAt <= new Date(existing.expectedArrivalAt)) {
      return res.status(400).json({ message: "A journey can only be extended to a later time" });
    }
    const journey = await SafetyJourney.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "active" },
      { expectedArrivalAt },
      { new: true, runValidators: true },
    );
    if (!journey) return res.status(404).json({ message: "Active journey not found" });
    await notifyJourneyContacts(
      journey,
      "journey_extended",
      `journey:${journey._id}:extended:${expectedArrivalAt.getTime()}`,
      `Her_Shield journey update: the expected arrival time for ${journey.destination} was extended to ${expectedArrivalAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    );
    res.json(await getJourneyResponse(req.user._id, journey));
  } catch (error) {
    next(error);
  }
};

export const cancelJourney = async (req, res, next) => {
  try {
    const journey = await SafetyJourney.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: "active" },
      { status: "cancelled", cancelledAt: new Date() },
      { new: true, runValidators: true },
    );
    if (!journey) return res.status(404).json({ message: "Active journey not found" });
    await notifyJourneyContacts(
      journey,
      "journey_cancelled",
      `journey:${journey._id}:cancelled`,
      `Her_Shield journey update: ${req.user.name} cancelled their journey to ${journey.destination}.`,
    );
    res.json(await getJourneyResponse(req.user._id, journey));
  } catch (error) {
    next(error);
  }
};

export const deleteJourney = async (req, res, next) => {
  try {
    const journey = await SafetyJourney.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!journey) return res.status(404).json({ message: "Journey not found" });
    res.json({ message: "Journey deleted" });
  } catch (error) {
    next(error);
  }
};
