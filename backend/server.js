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
import Meeting from "./models/Meeting.js";
import authRoutes from "./routes/auth.js";
import emailVerificationRoutes from "./routes/emailVerification.js";
import { requireAuth } from "./middleware/auth.js";
import User from "./models/User.js";

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
  "summary", "photo", "linkedin", "website", "github", "services",
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
      if (field === "volunteeringFor" || field === "services") {
        try {
          data[field] = JSON.parse(body[field]);
        } catch {
          data[field] = body[field];
        }
      } else {
        data[field] = clean(body[field]);
      }
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
app.post("/api/student", requireAuth, upload.single("resume"), async (req, res) => {
  try {
    const data = buildData(req.body, studentFields);
    const missing = findMissing(data, requiredStudentFields);

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
    data.userId = req.userId;

    const student = new Student(data);
    await student.save();

    await User.findByIdAndUpdate(req.userId, { profileComplete: true });

    res.status(201).json({ message: "Student submission saved!", student });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

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
    data.userId = req.userId;

    const professional = new Professional(data);
    await professional.save();

    await User.findByIdAndUpdate(req.userId, { profileComplete: true });

    res.status(201).json({ message: "Professional submission saved!", professional });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== GET /api/professionals — paginated list with filters + visibility rules =====
app.get("/api/professionals", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const { industry, services } = req.query;

    const filter = {};
    if (industry) {
      filter.industry = industry;
    }
    if (services) {
      const serviceList = services.split(",").map((s) => s.trim());
      filter.services = { $in: serviceList };
    }

    const allMatching = await Professional.find(filter).sort({ createdAt: -1 });

    const now = new Date();
    const visibleProfessionals = [];

    for (const professional of allMatching) {
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      const meetingsLastWeek = await Meeting.countDocuments({
        professional: professional._id,
        status: { $in: ["scheduled", "completed"] },
        date: { $gte: oneWeekAgo },
      });

      const meetingsLastMonth = await Meeting.countDocuments({
        professional: professional._id,
        status: { $in: ["scheduled", "completed"] },
        date: { $gte: oneMonthAgo },
      });

      const mostRecentMeeting = await Meeting.findOne({
        professional: professional._id,
        status: { $in: ["scheduled", "completed"] },
      }).sort({ date: -1 });

      let isHidden = false;

      if (mostRecentMeeting) {
        const daysSinceLastMeeting = (now - mostRecentMeeting.date) / (24 * 60 * 60 * 1000);

        if (meetingsLastMonth >= 2 && daysSinceLastMeeting < 21) {
          isHidden = true;
        } else if (meetingsLastWeek >= 1 && daysSinceLastMeeting < 7) {
          isHidden = true;
        }
      }

      if (!isHidden) {
        visibleProfessionals.push(professional);
      }
    }

    const startIndex = (page - 1) * limit;
    const paginatedResults = visibleProfessionals.slice(startIndex, startIndex + limit);

    const cardData = paginatedResults.map((p) => ({
      id: p._id,
      name: p.name,
      jobTitle: p.jobTitle,
      summary: p.summary,
      photo: p.photo,
      linkedin: p.linkedin,
      website: p.website,
      github: p.github,
      industry: p.industry,
      services: p.services,
    }));

    res.json({
      professionals: cardData,
      currentPage: page,
      totalPages: Math.ceil(visibleProfessionals.length / limit),
      totalResults: visibleProfessionals.length,
    });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== DELETE /api/professional/:id — remove a professional by ID (for cleanup/testing) =====
app.delete("/api/professional/:id", async (req, res) => {
  try {
    const deleted = await Professional.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Professional not found." });
    }
    res.json({ message: "Professional deleted.", deleted });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== PATCH /api/professional/:id — update specific fields (e.g. add services, photo, links) =====
app.patch("/api/professional/:id", async (req, res) => {
  try {
    const allowedUpdates = ["name","summary", "photo", "linkedin", "website", "github", "services"];
    const updates = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await Professional.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Professional not found." });
    }
    res.json({ message: "Professional updated.", professional: updated });
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});



