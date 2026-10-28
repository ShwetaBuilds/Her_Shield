import express from "express";
import NotificationLog from "../models/NotificationLog.js";
import { verifyTwilioSignature } from "../services/twilioSmsService.js";

const router = express.Router();
const terminalStatuses = new Set(["sent", "delivered", "failed", "undelivered"]);

router.post("/", async (req, res, next) => {
  const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL;
  const signature = req.get("X-Twilio-Signature");
  if (!callbackUrl || !process.env.TWILIO_AUTH_TOKEN) {
    return res.status(503).json({ message: "Twilio status callback is not configured" });
  }
  if (
    !verifyTwilioSignature({
      url: callbackUrl,
      params: req.body,
      signature,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    })
  ) {
    return res.status(403).json({ message: "Invalid provider signature" });
  }

  const { MessageSid, MessageStatus, ErrorCode } = req.body;
  if (
    typeof MessageSid !== "string" ||
    typeof MessageStatus !== "string" ||
    !terminalStatuses.has(MessageStatus)
  ) {
    return res.status(400).json({ message: "Invalid provider status update" });
  }

  try {
    const update = {
      status: MessageStatus,
      ...(ErrorCode ? { providerErrorCode: String(ErrorCode).slice(0, 32) } : {}),
      ...(MessageStatus === "delivered" ? { deliveredAt: new Date() } : {}),
    };
    const log = await NotificationLog.findOneAndUpdate(
      { provider: "twilio", providerMessageSid: MessageSid },
      update,
      { new: true, runValidators: true },
    );
    if (!log) return res.status(404).json({ message: "Notification attempt not found" });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
