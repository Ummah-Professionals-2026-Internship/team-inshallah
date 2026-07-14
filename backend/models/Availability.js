import mongoose from "mongoose";

// one block of available time - either recurring weekly, or a specific one-off date
const blockSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["weekly", "specific"], required: true },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // used when type is "weekly" - 0=Sunday, 1=Monday, etc.
    date: { type: String }, // used when type is "specific" - e.g. "2026-06-23"
    start: { type: String, required: true }, // "10:00"
    end: { type: String, required: true },   // "15:00"
  },
  { _id: false }
);

// one user's full availability schedule
const availabilitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    timezone: { type: String, required: true, default: "America/New_York" },
    availability: { type: [blockSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Availability", availabilitySchema);