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
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  profilePicture: { type: String },
  aboutMe: { type: String, maxlength: 1000 },
  externalLinks: {
    linkedin: { type: String },
    website: { type: String },
    github: { type: String },
    other: { type: String },
  },                  
  countyState: { type: String, required: true },
  hearAboutService: { type: String, required: true },
  otherInformation: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export default mongoose.model("Professional", professionalSchema);
