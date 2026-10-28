import mongoose from "mongoose";

const emergencyContactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "High" },
    smsConsent: { type: Boolean, default: false },
    smsConsentAt: { type: Date },
    journeyShareConsent: { type: Boolean, default: false },
    journeyShareConsentAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model("EmergencyContact", emergencyContactSchema);
