import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Pending", "Reviewed", "Resolved"], default: "Pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
