import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventType: {
      type: String,
      enum: [
        "sos",
        "journey_started",
        "journey_checkin",
        "journey_extended",
        "journey_completed",
        "journey_cancelled",
        "journey_overdue",
      ],
      required: true,
    },
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
    eventKey: { type: String, required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "EmergencyContact", required: true },
    provider: { type: String, enum: ["twilio"], default: "twilio", required: true },
    providerMessageSid: { type: String },
    status: {
      type: String,
      enum: [
        "not_configured",
        "rate_limited",
        "skipped_consent",
        "accepted",
        "queued",
        "sending",
        "sent",
        "delivered",
        "failed",
        "undelivered",
      ],
      required: true,
    },
    providerErrorCode: { type: String },
    attemptedAt: { type: Date, default: Date.now, required: true },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

notificationLogSchema.index({ user: 1, eventKey: 1, contact: 1 }, { unique: true });
notificationLogSchema.index({ providerMessageSid: 1 }, { unique: true, sparse: true });
notificationLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("NotificationLog", notificationLogSchema);
