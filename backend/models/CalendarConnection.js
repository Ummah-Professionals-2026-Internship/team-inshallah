import mongoose from "mongoose";

// tracks a user's connection to an external calendar (Google/Outlook)
// accessToken/refreshToken are stored encrypted - never store them plain
const calendarConnectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: String, enum: ["google", "outlook"], required: true },
    accessToken: { type: String, required: true },   // encrypted before saving
    refreshToken: { type: String, required: true },  // encrypted before saving
    calendarId: { type: String, default: "primary" },
    lastSynced: { type: Date },
    syncStatus: { type: String, enum: ["ok", "failed", "expired"], default: "ok" },
  },
  { timestamps: true }
);

// one user can only have one connection per provider
calendarConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.model("CalendarConnection", calendarConnectionSchema);