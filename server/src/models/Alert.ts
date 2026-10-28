import mongoose from "mongoose";

export interface IAlert extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  type: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  status: string;
  sentTo: string;
  metadata?: Record<string, unknown>;
}

const alertSchema = new mongoose.Schema<IAlert>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, trim: true },
    risk: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" },
    status: { type: String, required: true, trim: true },
    sentTo: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<IAlert>("Alert", alertSchema);
