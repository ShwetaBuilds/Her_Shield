import express from "express";
import { body, header } from "express-validator";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/errorMiddleware.js";
import EmergencyContact from "../models/EmergencyContact.js";
import NotificationLog from "../models/NotificationLog.js";
import SOSHistory from "../models/SOSHistory.js";
import { notifyContacts } from "../services/notificationService.js";

const router = express.Router();
router.use(protect);

const notificationView = (log) => ({
  contactName: log.contact?.name ?? "Trusted contact",
  status: log.status,
  attemptedAt: log.attemptedAt,
  deliveredAt: log.deliveredAt,
  providerErrorCode: log.providerErrorCode,
});

const getSmsConfigurationWarning = (attempts) =>
  attempts.some((attempt) => attempt.status === "not_configured")
    ? "SOS alert recorded. SMS was not sent because Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM in backend/.env, then restart the backend."
    : undefined;

router.get("/", async (req, res, next) => {
  try {
    const history = await SOSHistory.find({ user: req.user._id }).sort({ triggeredAt: -1 });
    const notificationLogs = await NotificationLog.find({
      user: req.user._id,
      eventType: "sos",
      eventId: { $in: history.map((record) => record._id) },
    }).populate("contact", "name");
    const logsByEvent = new Map();
    for (const log of notificationLogs) {
      const logs = logsByEvent.get(String(log.eventId)) ?? [];
      logs.push(notificationView(log));
      logsByEvent.set(String(log.eventId), logs);
    }
    res.json(
      history.map((record) => ({
        ...(record.toObject ? record.toObject() : record),
        notificationAttempts: logsByEvent.get(String(record._id)) ?? [],
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  [
    body("location").optional().isObject().withMessage("Location must include valid coordinates"),
    body("location.latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Valid latitude is required"),
    body("location.longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Valid longitude is required"),
    body("notes").optional().isString().trim().isLength({ max: 500 }),
    body("contactIds").optional().isArray({ max: 5 }).withMessage("Select up to five contacts"),
    body("contactIds.*").optional().isMongoId().withMessage("Invalid trusted contact"),
    header("idempotency-key").optional().isUUID().withMessage("Invalid request identifier"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { location, notes } = req.body;
      const contactIds = req.body.contactIds ?? [];
      if (location && (location.latitude === undefined || location.longitude === undefined)) {
        return res.status(400).json({ message: "Both latitude and longitude are required" });
      }
      if (new Set(contactIds).size !== contactIds.length) {
        return res.status(400).json({ message: "A trusted contact can only be selected once" });
      }

      const idempotencyKey = req.get("Idempotency-Key");
      if (idempotencyKey) {
        const existing = await SOSHistory.findOne({ user: req.user._id, idempotencyKey });
        if (existing) {
          const notificationAttempts = await NotificationLog.find({
            user: req.user._id,
            eventType: "sos",
            eventId: existing._id,
          }).populate("contact", "name");
          return res.status(200).json({
            ...(existing.toObject ? existing.toObject() : existing),
            notificationAttempts: notificationAttempts.map(notificationView),
            ...(getSmsConfigurationWarning(notificationAttempts)
              ? { notificationError: getSmsConfigurationWarning(notificationAttempts) }
              : {}),
          });
        }
      }

      let contacts = [];
      if (contactIds.length) {
        contacts = await EmergencyContact.find({
          _id: { $in: contactIds },
          user: req.user._id,
          smsConsent: true,
        });
        if (contacts.length !== contactIds.length) {
          return res.status(400).json({
            message:
              "Every selected contact must belong to your account and have SMS consent enabled",
          });
        }
        if (contacts.some((contact) => !/^\+[1-9]\d{7,14}$/.test(contact.phone))) {
          return res.status(400).json({
            message: "Selected contacts need valid E.164 phone numbers before SMS can be sent",
          });
        }
      }

      const sos = await SOSHistory.create({
        user: req.user._id,
        location,
        notes,
        status: "Recorded; SMS attempts are tracked separately",
        idempotencyKey,
      });

      const locationMessage = location
        ? ` Current location: https://maps.google.com/?q=${location.latitude},${location.longitude}`
        : " Current location was unavailable.";
      let notificationError;
      try {
        await notifyContacts({
          userId: req.user._id,
          eventType: "sos",
          eventId: sos._id,
          eventKey: `sos:${sos._id}`,
          contacts,
          message: `Her_Shield SOS: ${req.user.name} requested help. This message was sent to you as their trusted contact.${locationMessage} Call them directly if appropriate.`,
        });
      } catch (error) {
        console.error("SOS notification attempt could not be recorded:", error);
        notificationError =
          "The SOS record was saved, but notification attempts could not be recorded. Check your SOS history and contact your trusted contacts directly if needed.";
      }

      let notificationAttempts = [];
      try {
        notificationAttempts = await NotificationLog.find({
          user: req.user._id,
          eventType: "sos",
          eventId: sos._id,
        }).populate("contact", "name");
      } catch (error) {
        console.error("SOS notification attempts could not be loaded:", error);
        notificationError ??=
          "The SOS record was saved, but notification status could not be loaded. Check your SOS history and contact your trusted contacts directly if needed.";
      }
      notificationError ??= getSmsConfigurationWarning(notificationAttempts);
      res.status(201).json({
        ...(sos.toObject ? sos.toObject() : sos),
        notificationAttempts: notificationAttempts.map(notificationView),
        ...(notificationError ? { notificationError } : {}),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
