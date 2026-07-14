import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

async function getSignedFileUrl(storedUrl) {
  if (!storedUrl) return "";

  const key = storedUrl.split(".amazonaws.com/")[1];
  if (!key) return storedUrl;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  const lowerKey = key.toLowerCase();
  if (lowerKey.endsWith(".pdf")) {
    params.ResponseContentDisposition = "inline";
    params.ResponseContentType = "application/pdf";
  } else if (lowerKey.endsWith(".docx")) {
    params.ResponseContentDisposition = "attachment";
    params.ResponseContentType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (lowerKey.endsWith(".doc")) {
    params.ResponseContentDisposition = "attachment";
    params.ResponseContentType = "application/msword";
  }

  const command = new GetObjectCommand(params);
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

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

const upload = multer({
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
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

// ===== HELPERS =====
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

const deleteUploadedFiles = async (files) => {
  if (!files) return;

  if (Array.isArray(files)) {
    for (const file of files) {
      if (file?.key) await deleteFromS3(file.key);
    }
    return;
  }

  for (const fieldName of Object.keys(files)) {
    for (const file of files[fieldName]) {
      if (file?.key) await deleteFromS3(file.key);
    }
  }
};

const clean = (value) => (typeof value === "string" ? value.trim() : value);

const parseVolunteeringFor = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const studentFields = [
  "name",
  "phone",
  "gender",
  "industry",
  "major",
  "desiredFutureCareer",
  "currentJob",
  "academicStanding",
  "hearAboutService",
  "otherInformation",
];

const requiredStudentFields = [
  "name",
  "phone",
  "gender",
  "industry",
  "major",
  "desiredFutureCareer",
  "academicStanding",
  "hearAboutService",
];

// combined list: main's base fields + the mentor-card fields from dashboard-design
const professionalFields = [
  "name",
  "phone",
  "gender",
  "experienceLevel",
  "employer",
  "jobTitle",
  "industry",
  "volunteeringFor",
  "major",
  "almaMater",
  "mentorOpposingGender",
  "countyState",
  "hearAboutService",
  "otherInformation",
  "summary",
  "photo",
  "linkedin",
  "website",
  "github",
  "services",
];

const requiredProfessionalFields = [
  "name",
  "phone",
  "gender",
  "experienceLevel",
  "employer",
  "jobTitle",
  "industry",
  "volunteeringFor",
  "mentorOpposingGender",
  "countyState",
  "hearAboutService",
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
  requiredFields.filter((field) => {
    const value = data[field];

    if (!value) return true;

    if (typeof value === "string" && value.trim() === "") {
      return true;
    }

    if (Array.isArray(value) && value.length === 0) {
      return true;
    }

    return false;
  });

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

// ===== STUDENT FORM SUBMIT =====
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
    data.user = req.userId;
    data.userId = req.userId;

    const student = new Student(data);
    await student.save();

    await User.findByIdAndUpdate(req.userId, { profileComplete: true });

    res.status(201).json({ message: "Student submission saved!", student });
  } catch (err) {
    console.log("STUDENT POST ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== GET STUDENT PROFILE =====
app.get("/api/student/profile", requireAuth, async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.userId }).populate(
      "user",
      "email role"
    );

    if (!student) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const profile = student.toObject();
    profile.profilePicture = await getSignedFileUrl(profile.profilePicture);
    profile.resume = await getSignedFileUrl(profile.resume);

    res.json({ profile });
  } catch (err) {
    console.log("GET STUDENT PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== UPDATE STUDENT PROFILE =====
app.put(
  "/api/student/profile",
  requireAuth,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const student = await Student.findOne({ user: req.userId });

      if (!student) {
        return res.status(404).json({ message: "Student profile not found." });
      }

      const data = buildProfileData(req.body, studentFields);
      const error = validateProfile(data, requiredStudentFields);

      if (error) {
        if (req.files?.profilePicture) await deleteFromS3(req.files.profilePicture[0].key);
        if (req.files?.resume) await deleteFromS3(req.files.resume[0].key);
        return res.status(400).json({ message: error });
      }

      if (req.files?.profilePicture) {
        data.profilePicture = req.files.profilePicture[0].location;
      }
      if (req.files?.resume) {
        data.resume = req.files.resume[0].location;
      }

      Object.assign(student, data);
      await student.save();

      const profile = student.toObject();
      profile.profilePicture = await getSignedFileUrl(profile.profilePicture);
      profile.resume = await getSignedFileUrl(profile.resume);

      res.json({
        message: "Student profile updated successfully.",
        profile,
      });
    } catch (err) {
      console.log("UPDATE STUDENT PROFILE ERROR:", err);
      res.status(500).json({ message: "Server error. Please try again later." });
    }
  }
);

// ===== PROFESSIONAL FORM SUBMIT =====
app.post("/api/professional", requireAuth, upload.single("resume"), async (req, res) => {
  try {
    const data = buildData(req.body, professionalFields);

    data.volunteeringFor = parseVolunteeringFor(req.body.volunteeringFor);

    const missing = findMissing(data, requiredProfessionalFields);

    if (!req.file) {
      missing.push("resume");
    }

    if (missing.length > 0) {
      if (req.file) await deleteFromS3(req.file.key);

      return res.status(400).json({
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    data.resume = req.file.location;
    data.user = req.userId;
    data.userId = req.userId;

    const professional = new Professional(data);
    await professional.save();

    await User.findByIdAndUpdate(req.userId, { profileComplete: true });

    res.status(201).json({
      message: "Professional submission saved!",
      professional,
    });
  } catch (err) {
    console.log("PROFESSIONAL POST ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== GET PROFESSIONAL PROFILE (your own profile) =====
app.get("/api/professional/profile", requireAuth, async (req, res) => {
  try {
    const professional = await Professional.findOne({ user: req.userId }).populate(
      "user",
      "email role"
    );

    if (!professional) {
      return res.status(404).json({ message: "Professional profile not found." });
    }

    const profile = professional.toObject();
    profile.profilePicture = await getSignedFileUrl(profile.profilePicture);
    profile.resume = await getSignedFileUrl(profile.resume);

    res.json({ profile });
  } catch (err) {
    console.log("GET PROFESSIONAL PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== UPDATE PROFESSIONAL PROFILE (your own profile) =====
app.put(
  "/api/professional/profile",
  requireAuth,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const professional = await Professional.findOne({ user: req.userId });

      if (!professional) {
        return res.status(404).json({ message: "Professional profile not found." });
      }

      const data = buildProfileData(req.body, professionalFields);

      data.volunteeringFor =
        req.body.volunteeringFor !== undefined
          ? parseVolunteeringFor(req.body.volunteeringFor)
          : professional.volunteeringFor;

      for (const field of requiredProfessionalFields) {
        if (data[field] === undefined) {
          data[field] = professional[field];
        }
      }

      const error = validateProfile(data, requiredProfessionalFields);

      if (error) {
        await deleteUploadedFiles(req.files);
        return res.status(400).json({ message: error });
      }

      if (req.files?.profilePicture?.[0]) {
        data.profilePicture = req.files.profilePicture[0].location;
      }

      if (req.files?.resume?.[0]) {
        data.resume = req.files.resume[0].location;
      }

      Object.assign(professional, data);
      await professional.save();

      const profile = professional.toObject();
      profile.profilePicture = await getSignedFileUrl(profile.profilePicture);
      profile.resume = await getSignedFileUrl(profile.resume);

      res.json({
        message: "Professional profile updated successfully.",
        profile,
      });
    } catch (err) {
      console.log("UPDATE PROFESSIONAL PROFILE ERROR:", err);
      res.status(500).json({ message: "Server error. Please try again later." });
    }
  }
);

// ===== GET /api/professionals — paginated list with filters + visibility rules (browsing page) =====
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
    const allowedUpdates = ["name", "industry", "summary", "photo", "linkedin", "website", "github", "services"];
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



