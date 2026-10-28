import mongoose from "mongoose";

const smsRateLimitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  windowStartedAt: { type: Date, required: true },
  smsCount: { type: Number, default: 0, required: true },
});

smsRateLimitSchema.index({ user: 1, windowStartedAt: 1 }, { unique: true });
smsRateLimitSchema.index({ windowStartedAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.model("SmsRateLimit", smsRateLimitSchema);
