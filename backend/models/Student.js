import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 255 },
  phone: { type: String, required: true },
  gender: { type: String, required: true },
  industry: { type: String, required: true },
  major: { type: String, required: true },
  desiredFutureCareer: { type: String, required: true },
  currentJob: { type: String },
  academicStanding: { type: String, required: true },
  resume: { type: String, required: true },
  hearAboutService: { type: String, required: true },
  otherInformation: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.model("Student", studentSchema);
