import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    studentID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    professionalID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Professional",
      required: true,
    },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    timezone: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["Résumé Review", "Mock Interview", "General Career Advice"],
      required: true,
    },
    notes: { type: String, default: "" },
    calendarEventIds: {
      student: { type: String, default: "" },
      professional: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed", "no_show"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);