import mongoose from "mongoose";

// the users collection - stores login credentials only (not the form data).
// we save a hash of the password, never the real password.
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "professional"],
      default: "student",
    },
    // flipped to true by the email-verification flow once the code is confirmed
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

export default mongoose.model("User", userSchema);
