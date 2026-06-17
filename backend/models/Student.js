const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 255 },
  phone: { type: String, required: true },
  gender: { type: String, required: true },
  industry: { type: String, required: true },
  major: { type: String, required: true },
  desiredFutureCareer: { type: String, required: true },
  academicStanding: { type: String, required: true },
  lookingFor: { type: String, required: true },
  hearAboutService: { type: String },
  otherInformation: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
