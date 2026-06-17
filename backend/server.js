const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const validator = require("validator");
require("dotenv").config();

const Student = require("./models/Student");
const Professional = require("./models/Professional");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => console.log("Error:", err));

// Helper: clean a string input
const clean = (value) =>
  typeof value === "string" ? validator.escape(value.trim()) : value;

// Allowed fields for each form
const studentFields = [
  "name", "phone", "gender", "industry", "major",
  "desiredFutureCareer", "academicStanding", "lookingFor",
  "hearAboutService", "otherInformation",
];
const requiredStudentFields = [
  "name", "phone", "gender", "industry", "major",
  "desiredFutureCareer", "academicStanding", "lookingFor",
];

const professionalFields = [
  "name", "phone", "linkedin", "experienceLevel", "employer",
  "jobTitle", "industry", "volunteeringFor", "major",
  "almaMater", "countyState", "hearAboutService", "otherInformation",
];
const requiredProfessionalFields = [
  "name", "phone", "experienceLevel", "employer",
  "jobTitle", "industry", "volunteeringFor",
];

// Build a clean object using only allowed fields
const buildData = (body, allowedFields) => {
  const data = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = clean(body[field]);
    }
  }
  return data;
};

// Check required fields are present
const findMissing = (data, requiredFields) =>
  requiredFields.filter((field) => !data[field] || data[field].trim() === "");

// STUDENT endpoint
app.post("/api/student", async (req, res) => {
  try {
    const data = buildData(req.body, studentFields);
    const missing = findMissing(data, requiredStudentFields);

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const student = new Student(data);
    await student.save();
    res.status(201).json({ message: "Student submission saved!", student });
  } catch (err) {
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// PROFESSIONAL endpoint
app.post("/api/professional", async (req, res) => {
  try {
    const data = buildData(req.body, professionalFields);
    const missing = findMissing(data, requiredProfessionalFields);

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const professional = new Professional(data);
    await professional.save();
    res.status(201).json({ message: "Professional submission saved!", professional });
  } catch (err) {
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
