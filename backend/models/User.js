import mongoose from "mongoose";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Prefer not to say"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: {
      type: String,
      trim: true,
      required: function () {
        return this.isNew;
      },
      validate: {
        validator: function (value) {
          if (!this.isNew && typeof this.isModified === "function" && !this.isModified("phone")) {
            return true;
          }
          return /^\+?[1-9]\d{7,14}$/.test(value);
        },
        message: "Enter a valid phone number with 8 to 15 digits",
      },
    },
    age: {
      type: Number,
      min: 1,
      max: 120,
      required: function () {
        return this.isNew;
      },
    },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Female" },
    bloodGroup: {
      type: String,
      trim: true,
      validate: {
        validator: function (value) {
          if (
            !this.isNew &&
            typeof this.isModified === "function" &&
            !this.isModified("bloodGroup")
          ) {
            return true;
          }
          return !value || bloodGroups.includes(value);
        },
        message: "Select a valid blood group",
      },
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      required: function () {
        return this.isNew;
      },
    },
    password: { type: String, required: true, select: false },
    emergencyContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "EmergencyContact" }],
    profileImage: { type: String },
    isVerified: { type: Boolean, default: true }, // Auto-verified (no email verification)
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
