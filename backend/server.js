import express from "express";
import cors from "cors";
import validator from "validator";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";

import connectDB from "./config/db.js";
import Student from "./models/Student.js";
import Professional from "./models/Professional.js";

dotenv.config(); // grab the secret stuff from my .env file

const app = express();
app.use(express.json()); // lets the server read json data
app.use(cors()); // lets my frontend talk to this backend

connectDB(); // connect to mongodb using the shared file

// this is the setup for handling résumé uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // put the file in the uploads folder
  },
  filename: (req, file, cb) => {
    // give the file its own name so they don't overwrite each other
    const uniqueName = `resume-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// only let people upload pdfs or word docs
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true); // file is fine, allow it
  } else {
    cb(new Error("Only PDF and Word documents are allowed"), false); // nope
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max file size is 5mb
});

// cleans up text so no weird/harmful characters get through
const clean = (value) =>
  typeof value === "string" ? validator.escape(value.trim()) : value;

// all the fields the student form can send
const studentFields = [
  "name", "phone", "gender", "industry", "major",
  "desiredFutureCareer", "currentJob", "academicStanding",
  "hearAboutService", "otherInformation",
];
// the student fields that MUST be filled in
const requiredStudentFields = [
  "name", "phone", "gender", "industry", "major",
  "desiredFutureCareer", "academicStanding", "hearAboutService",
];

// all the fields the professional form can send
const professionalFields = [
  "name", "phone", "gender", "experienceLevel", "employer",
  "jobTitle", "industry", "volunteeringFor", "major",
  "almaMater", "mentorOpposingGender", "countyState",
  "hearAboutService", "otherInformation",
];
// the professional fields that MUST be filled in
const requiredProfessionalFields = [
  "name", "phone", "gender", "experienceLevel", "employer",
  "jobTitle", "industry", "volunteeringFor",
  "mentorOpposingGender", "countyState", "hearAboutService",
];

// takes the incoming data, keeps only the allowed fields, and cleans them
const buildData = (body, allowedFields) => {
  const data = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = clean(body[field]);
    }
  }
  return data;
};

// checks which required fields are empty or missing
const findMissing = (data, requiredFields) =>
  requiredFields.filter((field) => !data[field] || data[field].trim() === "");

// when the student form gets submitted, this runs
app.post("/api/student", upload.single("resume"), async (req, res) => {
  try {
    const data = buildData(req.body, studentFields); // grab + clean the data
    const missing = findMissing(data, requiredStudentFields); // see what's missing

    // résumé is required, so if there's no file, that's missing too
    if (!req.file) {
      missing.push("resume");
    }

    // if anything required is missing, send back an error and stop
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    data.resume = req.file.path; // save the résumé's file path

    const student = new Student(data); // make the record
    await student.save(); // save it to mongodb
    res.status(201).json({ message: "Student submission saved!", student }); // success
  } catch (err) {
    console.log("ERROR:", err); // show me the real error if something breaks
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// when the professional form gets submitted, this runs (same idea as student)
app.post("/api/professional", upload.single("resume"), async (req, res) => {
  try {
    const data = buildData(req.body, professionalFields);
    const missing = findMissing(data, requiredProfessionalFields);

    if (!req.file) {
      missing.push("resume");
    }

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    data.resume = req.file.path;

    const professional = new Professional(data);
    await professional.save();
    res.status(201).json({ message: "Professional submission saved!", professional });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// turn the server on and have it listen for submissions
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});