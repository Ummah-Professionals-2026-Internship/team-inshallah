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
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  profilePicture: { type: String },
  aboutMe: { type: String, maxlength: 1000 },
  externalLinks: {
    linkedin: { type: String },
    portfolio: { type: String },
    github: { type: String },
    other: { type: String },
  },
  hearAboutService: { type: String, required: true },
  otherInformation: { type: String },
}, { timestamps: true });

export default mongoose.model("Student", studentSchema);
