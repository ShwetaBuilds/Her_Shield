import NotificationLog from "../models/NotificationLog.js";
import { isTwilioConfigured, sendTwilioSms } from "./twilioSmsService.js";
import { reserveSmsCapacity } from "./smsRateLimitService.js";

export async function notifyContacts({
  userId,
  eventType,
  eventId,
  eventKey,
  contacts,
  message,
}) {
  if (contacts.length === 0) return [];

  const configured = isTwilioConfigured();
  const rateLimitAllowed =
    configured && (await reserveSmsCapacity(userId, contacts.length));
  const logs = [];

  for (const contact of contacts) {
    const existing = await NotificationLog.findOne({
      user: userId,
      eventKey,
      contact: contact._id,
    });
    if (existing) {
      logs.push(existing);
      continue;
    }

    const log = await NotificationLog.create({
      user: userId,
      eventType,
      eventId,
      eventKey,
      contact: contact._id,
      status: !configured ? "not_configured" : !rateLimitAllowed ? "rate_limited" : "sending",
    });
    if (!configured || !rateLimitAllowed) {
      logs.push(log);
      continue;
    }

    try {
      const result = await sendTwilioSms({ to: contact.phone, body: message });
      log.providerMessageSid = result.sid;
      log.status = result.status;
    } catch (error) {
      log.status = "failed";
      log.providerErrorCode = error.providerCode ?? "provider_unavailable";
    }
    await log.save();
    logs.push(log);
  }

  return logs;
}
