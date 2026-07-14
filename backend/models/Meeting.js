import mongoose from "mongoose";

// tracks a meeting between a student and a professional.
// used to figure out how many meetings a professional has had recently,
// so we can apply the "invisible for X days after Y meetings" rules.
const meetingSchema = new mongoose.Schema(
  {
    professional: { type: mongoose.Schema.Types.ObjectId, ref: "Professional", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true }, // when the meeting is scheduled for
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", meetingSchema);