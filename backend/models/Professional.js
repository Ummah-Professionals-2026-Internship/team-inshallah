import mongoose from "mongoose";

const professionalSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 255 },
  phone: { type: String, required: true },
  gender: { type: String, required: true },
  experienceLevel: { type: String, required: true },
  employer: { type: String, required: true },
  jobTitle: { type: String, required: true },
  industry: { type: String, required: true },
  volunteeringFor: { type: [String], required: true },
  major: { type: String },
  almaMater: { type: String },
  mentorOpposingGender: { type: String, required: true },
  resume: { type: String, required: true },
  countyState: { type: String, required: true },
  hearAboutService: { type: String, required: true },
  otherInformation: { type: String },
  // fields for the mentor card / View Professionals page
  summary: { type: String, default: "" },
  photo: { type: String, default: "" },
  linkedin: { type: String, default: "" },
  website: { type: String, default: "" },
  github: { type: String, default: "" },
  services: { type: [String], default: [] }, // e.g. "Resume Review", "Mock Interview"
}, { timestamps: true });

export default mongoose.model("Professional", professionalSchema);
