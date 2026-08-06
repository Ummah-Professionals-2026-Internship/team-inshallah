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
    link: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    cancelReason: { type: String, default: "" },
    cancelledBy: { type: String, default: "" },
    feedback: {
      student: {
        meetingRating: { type: Number, min: 1, max: 5 },
        needsMetRating: { type: Number, min: 1, max: 5 },
        mentorRating: { type: Number, min: 1, max: 5 },
        comment: { type: String, default: "" },
        submittedAt: { type: Date },
      },
      professional: {
        meetingRating: { type: Number, min: 1, max: 5 },
        needsMetRating: { type: Number, min: 1, max: 5 },
        mentorRating: { type: Number, min: 1, max: 5 },
        comment: { type: String, default: "" },
        submittedAt: { type: Date },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);