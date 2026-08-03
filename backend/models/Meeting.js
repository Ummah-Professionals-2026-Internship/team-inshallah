import mongoose from "mongoose";

// tracks a meeting between a student and a professional.
const meetingSchema = new mongoose.Schema(
  {
    professional: { type: mongoose.Schema.Types.ObjectId, ref: "Professional", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true },
    purpose: {
      type: String,
      enum: ["Résumé Review", "Mock Interview", "General Career Advice", ""],
      default: "",
    },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    cancelReason: { type: String, default: "" },
    cancelledBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);