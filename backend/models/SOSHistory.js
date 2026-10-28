import mongoose from "mongoose";

const sosHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    triggeredAt: { type: Date, default: Date.now },
    location: { latitude: Number, longitude: Number },
    status: {
      type: String,
      required: true,
      default: "Recorded; no external notification sent",
    },
    notes: { type: String, trim: true },
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);

sosHistorySchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);
sosHistorySchema.index({ user: 1, triggeredAt: -1 });

export default mongoose.model("SOSHistory", sosHistorySchema);
