import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // "admin" is intentionally not accepted by /api/auth/signup — admins are
    // provisioned directly in the database so nobody can self-promote.
    role: { type: String, enum: ["student", "professional","admin"], default: "student" },
    // flipped to true by the email-verification flow once the code is confirmed
    emailVerified: { type: Boolean, default: false },
    profileComplete: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
