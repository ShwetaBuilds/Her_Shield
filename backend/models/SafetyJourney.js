import mongoose from "mongoose";

const safetyJourneySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    destination: { type: String, required: true, trim: true, maxlength: 120 },
    expectedArrivalAt: { type: Date, required: true },
    startedAt: { type: Date, default: Date.now, required: true },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
      required: true,
    },
    notifyContactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "EmergencyContact" }],
    checkIns: [
      {
        checkedInAt: { type: Date, default: Date.now },
        idempotencyKey: { type: String },
      },
    ],
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    overdueReminderClaimedAt: { type: Date },
    overdueReminderCompletedAt: { type: Date },
  },
  { timestamps: true },
);

safetyJourneySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("SafetyJourney", safetyJourneySchema);
