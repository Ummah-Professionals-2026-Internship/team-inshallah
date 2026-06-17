const mongoose = require("mongoose");

const professionalSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 255 },
  phone: { type: String, required: true },
  linkedin: { type: String },
  experienceLevel: { type: String, required: true },
  employer: { type: String, required: true },
  jobTitle: { type: String, required: true },
  industry: { type: String, required: true },
  volunteeringFor: { type: String, required: true },
  major: { type: String },
  almaMater: { type: String },
  countyState: { type: String },
  hearAboutService: { type: String },
  otherInformation: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Professional", professionalSchema);
