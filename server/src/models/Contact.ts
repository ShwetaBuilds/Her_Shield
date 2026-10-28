import mongoose from "mongoose";

export interface IContact extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  relation: string;
  priority: "High" | "Medium" | "Low";
}

const contactSchema = new mongoose.Schema<IContact>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "High" },
  },
  { timestamps: true }
);

export default mongoose.model<IContact>("Contact", contactSchema);
