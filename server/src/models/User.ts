import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "user" | "admin";
  trustedContacts: mongoose.Types.ObjectId[];
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    trustedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact" }],
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);
