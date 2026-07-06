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
import emailVerificationRoutes from "./routes/emailVerification.js";
import { requireAuth } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

connectDB();

// login / sign up API (assignment #6)
app.use("/api/auth", authRoutes);

app.use("/api/email-verification", emailVerificationRoutes);

// ===== AWS S3 SETUP =====
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const fileFilter = (req, file, cb) => {
  const resumeTypes = [".pdf", ".doc", ".docx"];
  const imageTypes = [".jpg", ".jpeg", ".png", ".webp"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === "resume" && resumeTypes.includes(ext)) {
    cb(null, true);
  } else if (file.fieldname === "profilePicture" && imageTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
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
      const folder =
        file.fieldname === "profilePicture" ? "profile-pictures" : "resumes";

      const uniqueName = `${folder}/${file.fieldname}-${Date.now()}${path.extname(
        file.originalname
      )}`;

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

const isValidUrl = (value) => {
  if (!value) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const buildProfileData = (body, allowedFields) => {
  const data = buildData(body, allowedFields);

  data.aboutMe = clean(body.aboutMe || "");

  data.externalLinks = {
    linkedin: clean(body.linkedin || ""),
    website: clean(body.website || ""),
    github: clean(body.github || ""),
    other: clean(body.other || ""),
  };

  return data;
};

const validateProfile = (data, requiredFields) => {
  const missing = findMissing(data, requiredFields);

  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (data.aboutMe && data.aboutMe.length > 1000) {
    return "About must be 1000 characters or less.";
  }

  if (!isValidUrl(data.externalLinks.linkedin)) return "LinkedIn URL is invalid.";
  if (!isValidUrl(data.externalLinks.website)) return "Website URL is invalid.";
  if (!isValidUrl(data.externalLinks.github)) return "GitHub URL is invalid.";
  if (!isValidUrl(data.externalLinks.other)) return "Other link URL is invalid.";

  return null;
};

// ===== STUDENT endpoint =====
app.post("/api/student", requireAuth, upload.single("resume"), async (req, res) => {
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
    data.user = req.userId;


    const student = new Student(data);
    await student.save();
    res.status(201).json({ message: "Student submission saved!", student });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== GET STUDENT PROFILE =====
app.get("/api/student/profile", requireAuth, async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId });

    if (!student) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    res.json({ profile: student });
  } catch (err) {
    console.log("GET STUDENT PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== UPDATE STUDENT PROFILE =====
app.put(
  "/api/student/profile",
  requireAuth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const student = await Student.findOne({ user: req.userId });

      if (!student) {
        return res.status(404).json({ message: "Student profile not found." });
      }

      const data = buildProfileData(req.body, studentFields);
      const error = validateProfile(data, requiredStudentFields);

      if (error) {
        if (req.file) {
          await deleteFromS3(req.file.key);
        }

        return res.status(400).json({ message: error });
      }

      if (req.file) {
        data.profilePicture = req.file.location;
      }

      Object.assign(student, data);

      await student.save();

      res.json({
        message: "Student profile updated successfully.",
        profile: student,
      });
    } catch (err) {
      console.log("UPDATE STUDENT PROFILE ERROR:", err);
      res.status(500).json({ message: "Server error. Please try again later." });
    }
  }
);

// ===== PROFESSIONAL endpoint =====
app.post("/api/professional", requireAuth, upload.single("resume"), async (req, res) => {
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
    data.user = req.userId;

    const professional = new Professional(data);
    await professional.save();
    res.status(201).json({ message: "Professional submission saved!", professional });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== GET PROFESSIONAL PROFILE =====
app.get("/api/professional/profile", requireAuth, async (req, res) => {
  try {
    const professional = await Professional.findOne({ user: req.userId });

    if (!professional) {
      return res.status(404).json({ message: "Professional profile not found." });
    }

    res.json({ profile: professional });
  } catch (err) {
    console.log("GET PROFESSIONAL PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== UPDATE PROFESSIONAL PROFILE =====
app.put(
  "/api/professional/profile",
  requireAuth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const professional = await Professional.findOne({ user: req.userId });

      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found." });
      }

      const data = buildProfileData(req.body, professionalFields);
      const error = validateProfile(data, requiredProfessionalFields);

      if (error) {
        if (req.file) {
          await deleteFromS3(req.file.key);
        }

        return res.status(400).json({ message: error });
      }

      if (req.file) {
        data.profilePicture = req.file.location;
      }

      Object.assign(professional, data);

      await professional.save();

      res.json({
        message: "Professional profile updated successfully.",
        profile: professional,
      });
    } catch (err) {
      console.log("UPDATE PROFESSIONAL PROFILE ERROR:", err);
      res.status(500).json({ message: "Server error. Please try again later." });
    }
  }
);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});