import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

import connectDB from "./config/db.js";
import Student from "./models/Student.js";
import Professional from "./models/Professional.js";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

connectDB();

// login / sign up API (assignment #6)
app.use("/api/auth", authRoutes);

// ===== AWS S3 SETUP =====
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".doc", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and Word documents are allowed"), false);
  }
};

// multer sends files straight to S3 instead of a local folder
const upload = multer({
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueName = `resumes/resume-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
});

// helper to delete a file from S3 (used when validation fails)
const deleteFromS3 = async (key) => {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    console.log("Failed to delete S3 file:", err);
  }
};

// ===== HELPERS =====
const clean = (value) =>
  typeof value === "string" ? value.trim() : value;

const studentFields = [
  "name", "phone", "gender", "industry", "major",
  "desiredFutureCareer", "currentJob", "academicStanding",
  "hearAboutService", "otherInformation",
];
const requiredStudentFields = [
  "name", "phone", "gender", "industry", "major",
  "desiredFutureCareer", "academicStanding", "hearAboutService",
];

const professionalFields = [
  "name", "phone", "gender", "experienceLevel", "employer",
  "jobTitle", "industry", "volunteeringFor", "major",
  "almaMater", "mentorOpposingGender", "countyState",
  "hearAboutService", "otherInformation",
];
const requiredProfessionalFields = [
  "name", "phone", "gender", "experienceLevel", "employer",
  "jobTitle", "industry", "volunteeringFor",
  "mentorOpposingGender", "countyState", "hearAboutService",
];

const buildData = (body, allowedFields) => {
  const data = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = clean(body[field]);
    }
  }
  return data;
};

const findMissing = (data, requiredFields) =>
  requiredFields.filter(
    (field) =>
      !data[field] ||
      (typeof data[field] === "string" && data[field].trim() === "")
  );

// ===== STUDENT endpoint =====
app.post("/api/student", upload.single("resume"), async (req, res) => {
  try {
    const data = buildData(req.body, studentFields);
    const missing = findMissing(data, requiredStudentFields);

    if (!req.file) {
      missing.push("resume");
    }

    if (missing.length > 0) {
      // delete the orphaned résumé from S3 if validation failed
      if (req.file) {
        await deleteFromS3(req.file.key);
      }
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // store the S3 file location (URL) in MongoDB
    data.resume = req.file.location;

    const student = new Student(data);
    await student.save();
    res.status(201).json({ message: "Student submission saved!", student });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== PROFESSIONAL endpoint =====
app.post("/api/professional", upload.single("resume"), async (req, res) => {
  try {
    const data = buildData(req.body, professionalFields);
    const missing = findMissing(data, requiredProfessionalFields);

    if (!req.file) {
      missing.push("resume");
    }

    if (missing.length > 0) {
      if (req.file) {
        await deleteFromS3(req.file.key);
      }
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    data.resume = req.file.location;

    const professional = new Professional(data);
    await professional.save();
    res.status(201).json({ message: "Professional submission saved!", professional });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});