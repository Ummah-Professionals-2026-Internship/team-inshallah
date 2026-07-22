import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import connectDB from "./config/db.js";
import Student from "./models/Student.js";
import Professional from "./models/Professional.js";
import Meeting from "./models/Meeting.js";
import Availability from "./models/Availability.js";
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

  // Extract the key (the path after the bucket domain)
  const key = storedUrl.split(".amazonaws.com/")[1];
  if (!key) return storedUrl;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  // Only PDFs can render in the browser; force inline for them.
  // Word docs get their correct type so they download as .docx, not .zip.
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
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

const fileFilter = (req, file, cb) => {
  const resumeTypes = [".pdf", ".doc", ".docx"];
  const imageTypes = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === "resume" && resumeTypes.includes(ext)) {
    cb(null, true);
  } else if (
    file.fieldname === "profilePicture" &&
    imageTypes.includes(ext)
  ) {
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
        file.fieldname === "profilePicture"
          ? "profile-pictures"
          : "resumes";

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

const clean = (value) =>
  typeof value === "string" ? value.trim() : value;

const parseArrayField = (value) => {
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
        data[field] = parseArrayField(body[field]);
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
    if (typeof value === "string" && value.trim() === "") return true;
    if (Array.isArray(value) && value.length === 0) return true;

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

  if (!isValidUrl(data.externalLinks.linkedin)) {
    return "LinkedIn URL is invalid.";
  }

  if (!isValidUrl(data.externalLinks.website)) {
    return "Website URL is invalid.";
  }

  if (!isValidUrl(data.externalLinks.github)) {
    return "GitHub URL is invalid.";
  }

  if (!isValidUrl(data.externalLinks.other)) {
    return "Other link URL is invalid.";
  }

  return null;
};

// ===== STUDENT FORM SUBMIT =====
app.post(
  "/api/student",
  requireAuth,
  upload.single("resume"),
  async (req, res) => {
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

      await User.findByIdAndUpdate(req.userId, {
        profileComplete: true,
      });

      res.status(201).json({
        message: "Student submission saved!",
        student,
      });
    } catch (err) {
      console.log("STUDENT POST ERROR:", err);
      res.status(500).json({
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ===== GET STUDENT PROFILE =====
app.get("/api/student/profile", requireAuth, async (req, res) => {
  try {
    const student = await Student.findOne({
      user: req.userId,
    }).populate("user", "email role");

    if (!student) {
      return res.status(404).json({
        message: "Student profile not found.",
      });
    }

    const profile = student.toObject();
    profile.profilePicture = await getSignedFileUrl(
      profile.profilePicture
    );
    profile.resume = await getSignedFileUrl(profile.resume);

    res.json({ profile });
  } catch (err) {
    console.log("GET STUDENT PROFILE ERROR:", err);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
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
      const student = await Student.findOne({
        user: req.userId,
      });

      if (!student) {
        return res.status(404).json({
          message: "Student profile not found.",
        });
      }

      const data = buildProfileData(req.body, studentFields);

      for (const field of requiredStudentFields) {
        if (data[field] === undefined) {
          data[field] = student[field];
        }
      }

      const error = validateProfile(
        data,
        requiredStudentFields
      );

      if (error) {
        await deleteUploadedFiles(req.files);
        return res.status(400).json({ message: error });
      }

      if (req.files?.profilePicture?.[0]) {
        data.profilePicture =
          req.files.profilePicture[0].location;
      }

      if (req.files?.resume?.[0]) {
        data.resume = req.files.resume[0].location;
      }

      Object.assign(student, data);
      await student.save();

      const profile = student.toObject();
      profile.profilePicture = await getSignedFileUrl(
        profile.profilePicture
      );
      profile.resume = await getSignedFileUrl(profile.resume);

      res.json({
        message: "Student profile updated successfully.",
        profile,
      });
    } catch (err) {
      console.log("UPDATE STUDENT PROFILE ERROR:", err);
      res.status(500).json({
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ===== PROFESSIONAL FORM SUBMIT =====
app.post(
  "/api/professional",
  requireAuth,
  upload.single("resume"),
  async (req, res) => {
    try {
      const data = buildData(req.body, professionalFields);
      const missing = findMissing(
        data,
        requiredProfessionalFields
      );

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

      const professional = new Professional(data);
      await professional.save();

      await User.findByIdAndUpdate(req.userId, {
        profileComplete: true,
      });

      res.status(201).json({
        message: "Professional submission saved!",
        professional,
      });
    } catch (err) {
      console.log("PROFESSIONAL POST ERROR:", err);
      res.status(500).json({
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ===== GET PROFESSIONAL PROFILE =====
app.get(
  "/api/professional/profile",
  requireAuth,
  async (req, res) => {
    try {
      const professional = await Professional.findOne({
        user: req.userId,
      }).populate("user", "email role");

      if (!professional) {
        return res.status(404).json({
          message: "Professional profile not found.",
        });
      }

      const profile = professional.toObject();
      profile.profilePicture = await getSignedFileUrl(
        profile.profilePicture
      );
      profile.resume = await getSignedFileUrl(
        profile.resume
      );

      res.json({ profile });
    } catch (err) {
      console.log("GET PROFESSIONAL PROFILE ERROR:", err);
      res.status(500).json({
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ===== UPDATE PROFESSIONAL PROFILE =====
app.put(
  "/api/professional/profile",
  requireAuth,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const professional = await Professional.findOne({
        user: req.userId,
      });

      if (!professional) {
        return res.status(404).json({
          message: "Professional profile not found.",
        });
      }


      const data = buildProfileData(
        req.body,
        professionalFields
      );

      data.volunteeringFor =
        req.body.volunteeringFor !== undefined
          ? parseArrayField(req.body.volunteeringFor)
          : professional.volunteeringFor;

      if (req.body.services === undefined) {
        data.services = professional.services;
      }

      for (const field of requiredProfessionalFields) {
        if (data[field] === undefined) {
          data[field] = professional[field];
        }
      }

      const error = validateProfile(
        data,
        requiredProfessionalFields
      );

      if (error) {
        await deleteUploadedFiles(req.files);
        return res.status(400).json({
          message: error,
        });
      }

      if (req.files?.profilePicture?.[0]) {
        data.profilePicture =
          req.files.profilePicture[0].location;
      }

      if (req.files?.resume?.[0]) {
        data.resume =
          req.files.resume[0].location;
      }

      Object.assign(professional, data);
      await professional.save();

      const profile = professional.toObject();
      profile.profilePicture = await getSignedFileUrl(
        profile.profilePicture
      );
      profile.resume = await getSignedFileUrl(
        profile.resume
      );

      res.json({
        message:
          "Professional profile updated successfully.",
        profile,
      });
    } catch (err) {
      console.log(
        "UPDATE PROFESSIONAL PROFILE ERROR:",
        err
      );
      res.status(500).json({
        message: "Server error. Please try again later.",
      });
    }
  }
);

// ===== GET PROFESSIONALS =====
app.get("/api/professionals", async (req, res) => {
  try {
    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.max(
      parseInt(req.query.limit, 10) || 12,
      1
    );

    const { industry, services } = req.query;

    const filter = {};

    if (industry) {
      filter.industry = industry;
    }

    if (services) {
      const serviceList = services
        .split(",")
        .map((service) => service.trim())
        .filter(Boolean);

      if (serviceList.length > 0) {
        filter.services = {
          $in: serviceList,
        };
      }
    }

    const allMatching = await Professional.find(
      filter
    ).sort({
      createdAt: -1,
    });

    const now = new Date();

    const oneWeekAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    const oneMonthAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    const visibleProfessionals = [];

    for (const professional of allMatching) {
      const meetingsLastWeek =
        await Meeting.countDocuments({
          professional: professional._id,
          status: {
            $in: ["scheduled", "completed"],
          },
          date: {
            $gte: oneWeekAgo,
          },
        });

      const meetingsLastMonth =
        await Meeting.countDocuments({
          professional: professional._id,
          status: {
            $in: ["scheduled", "completed"],
          },
          date: {
            $gte: oneMonthAgo,
          },
        });

      const mostRecentMeeting =
        await Meeting.findOne({
          professional: professional._id,
          status: {
            $in: ["scheduled", "completed"],
          },
        }).sort({
          date: -1,
        });

      let isHidden = false;

      if (mostRecentMeeting) {
        const daysSinceLastMeeting =
          (now.getTime() -
            mostRecentMeeting.date.getTime()) /
          (24 * 60 * 60 * 1000);

        if (
          meetingsLastMonth >= 2 &&
          daysSinceLastMeeting < 21
        ) {
          isHidden = true;
        } else if (
          meetingsLastWeek >= 1 &&
          daysSinceLastMeeting < 7
        ) {
          isHidden = true;
        }
      }

      if (!isHidden) {
        visibleProfessionals.push(professional);
      }
    }

    const startIndex = (page - 1) * limit;

    const paginatedResults =
      visibleProfessionals.slice(
        startIndex,
        startIndex + limit
      );

    const cardData = await Promise.all(
  paginatedResults.map(
    async (professional) => ({
      id: professional._id,
      userId: professional.user,
      name: professional.name,
      jobTitle: professional.jobTitle,
      summary: professional.summary || professional.aboutMe,
      aboutMe: professional.aboutMe,                    
      phone: professional.phone,                        
      resume: await getSignedFileUrl(professional.resume),
      photo: await getSignedFileUrl(
        professional.photo || professional.profilePicture
      ),
      linkedin: professional.linkedin,
      website: professional.website,
      github: professional.github,
      other: professional.externalLinks?.other || "",
      industry: professional.industry,
      services: professional.services,
      volunteeringFor: professional.volunteeringFor,
      otherInformation: professional.otherInformation,  // NEW
    })
  )
);

    res.json({
      professionals: cardData,
      currentPage: page,
      totalPages: Math.ceil(
        visibleProfessionals.length / limit
      ),
      totalResults: visibleProfessionals.length,
    });
  } catch (err) {
    console.log("GET PROFESSIONALS ERROR:", err);

    res.status(500).json({
      message:
        "Server error. Please try again later.",
    });
  }
});

// ===== DELETE PROFESSIONAL =====
// This route is protected because it deletes database records.
app.delete(
  "/api/professional/:id",
  requireAuth,
  async (req, res) => {
    try {
      const deleted =
        await Professional.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          message: "Professional not found.",
        });
      }

      res.json({
        message: "Professional deleted.",
        deleted,
      });
    } catch (err) {
      console.log(
        "DELETE PROFESSIONAL ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error. Please try again later.",
      });
    }
  }
);

// ===== PATCH PROFESSIONAL =====
// This route is protected because it changes database records.
app.patch(
  "/api/professional/:id",
  requireAuth,
  async (req, res) => {
    try {
      const allowedUpdates = [
        "name",
        "industry",
        "summary",
        "photo",
        "linkedin",
        "website",
        "github",
        "services",
      ];

      const updates = {};

      for (const field of allowedUpdates) {
        if (req.body[field] !== undefined) {
          updates[field] =
            field === "services"
              ? parseArrayField(req.body[field])
              : clean(req.body[field]);
        }
      }

      const updated =
        await Professional.findByIdAndUpdate(
          req.params.id,
          updates,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return res.status(404).json({
          message: "Professional not found.",
        });
      }

      res.json({
        message: "Professional updated.",
        professional: updated,
      });
    } catch (err) {
      console.log(
        "PATCH PROFESSIONAL ERROR:",
        err
      );

      res.status(500).json({
        message:
          "Server error. Please try again later.",
      });
    }
  }
);

// ===== HELPERS for availability validation =====
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const validateBlock = (block) => {
  if (!block.type || !["weekly", "specific"].includes(block.type)) {
    return "Each block must have type 'weekly' or 'specific'.";
  }
  if (block.type === "weekly" && (block.dayOfWeek === undefined || block.dayOfWeek < 0 || block.dayOfWeek > 6)) {
    return "Weekly blocks need a valid dayOfWeek (0-6).";
  }
  if (block.type === "specific" && !block.date) {
    return "Specific blocks need a date (e.g. '2026-06-23').";
  }
  if (!block.start || !block.end) {
    return "Each block needs a start and end time.";
  }
  const startMinutes = timeToMinutes(block.start);
  const endMinutes = timeToMinutes(block.end);
  if (startMinutes >= endMinutes) {
    return "Start time must be before end time.";
  }
  if (endMinutes - startMinutes < 60) {
    return "Each block must be at least 1 hour long.";
  }
  return null;
};

const blocksOverlap = (a, b) => {
  if (a.type !== b.type) return false;
  if (a.type === "weekly" && a.dayOfWeek !== b.dayOfWeek) return false;
  if (a.type === "specific" && a.date !== b.date) return false;

  const aStart = timeToMinutes(a.start);
  const aEnd = timeToMinutes(a.end);
  const bStart = timeToMinutes(b.start);
  const bEnd = timeToMinutes(b.end);

  return aStart < bEnd && bStart < aEnd;
};

const validateBlocks = (blocks) => {
  for (const block of blocks) {
    const error = validateBlock(block);
    if (error) return error;
  }
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      if (blocksOverlap(blocks[i], blocks[j])) {
        return "Availability blocks cannot overlap.";
      }
    }
  }
  return null;
};


// ===== GET /api/availability — get the logged-in user's availability =====
app.get("/api/availability", requireAuth, async (req, res) => {
  try {
    const availability = await Availability.findOne({ userId: req.userId });
    if (!availability) {
      return res.status(404).json({ message: "No availability set yet." });
    }
    res.json({ availability });
  } catch (err) {
    console.log("GET AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== POST /api/availability — create the logged-in user's availability (first time) =====
app.post("/api/availability", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "professional") {
      return res.status(403).json({ message: "Only professionals can manage availability." });
    }

    const { timezone, availability } = req.body;

    if (!timezone) {
      return res.status(400).json({ message: "Timezone is required." });
    }
    if (!Array.isArray(availability)) {
      return res.status(400).json({ message: "Availability must be an array of blocks." });
    }

    const validationError = validateBlocks(availability);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existing = await Availability.findOne({ userId: req.userId });
    if (existing) {
      return res.status(400).json({ message: "Availability already exists. Use PUT to update it." });
    }

    const created = await Availability.create({
      userId: req.userId,
      timezone,
      availability,
    });

    res.status(201).json({ message: "Availability created.", availability: created });
  } catch (err) {
    console.log("POST AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== PUT /api/availability — update the logged-in user's availability =====
app.put("/api/availability", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "professional") {
      return res.status(403).json({ message: "Only professionals can manage availability." });
    }

    const { timezone, availability } = req.body;

    if (!Array.isArray(availability)) {
      return res.status(400).json({ message: "Availability must be an array of blocks." });
    }

    const validationError = validateBlocks(availability);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const updated = await Availability.findOneAndUpdate(
      { userId: req.userId },
      { timezone, availability, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({ message: "Availability updated.", availability: updated });
  } catch (err) {
    console.log("PUT AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== DELETE /api/availability — clear the logged-in user's availability =====
app.delete("/api/availability", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== "professional") {
      return res.status(403).json({ message: "Only professionals can manage availability." });
    }

    const deleted = await Availability.findOneAndDelete({ userId: req.userId });
    if (!deleted) {
      return res.status(404).json({ message: "No availability found to delete." });
    }
    res.json({ message: "Availability deleted." });
  } catch (err) {
    console.log("DELETE AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== POST /api/meetings — book a meeting with a professional =====
app.post("/api/meetings", requireAuth, async (req, res) => {
  try {
    const { professionalId, date, purpose, notes } = req.body;
    if (!professionalId || !date) {
      return res.status(400).json({ message: "professionalId and date are required." });
    }

    const meetingDate = new Date(date);
    if (isNaN(meetingDate.getTime())) {
      return res.status(400).json({ message: "Invalid date." });
    }

    const student = await Student.findOne({ user: req.userId });
    if (!student) {
      return res.status(404).json({ message: "Student profile not found." });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return res.status(404).json({ message: "Professional not found." });
    }

    // Purpose must be one the professional actually offers
    if (purpose && !professional.volunteeringFor.includes(purpose)) {
      return res.status(400).json({
        message: "This professional does not offer that meeting type.",
      });
    }

    const startOfWeek = new Date(meetingDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const meetingThisWeek = await Meeting.findOne({
  professional: professional._id,
  status: { $in: ["scheduled", "completed"] },
  date: { $gte: startOfWeek, $lt: endOfWeek },
});

if (meetingThisWeek) {
  return res.status(400).json({
    message: "This professional already has a meeting booked this week.",
  });
}

// enforce: student can only book one meeting per week (with any professional)
const studentMeetingThisWeek = await Meeting.findOne({
  student: student._id,
  status: { $in: ["scheduled", "completed"] },
  date: { $gte: startOfWeek, $lt: endOfWeek },
});

if (studentMeetingThisWeek) {
  return res.status(400).json({
    message: "You already have a meeting booked this week.",
  });
}

const meeting = await Meeting.create({
      professional: professional._id,
      student: student._id,
      date: meetingDate,
      purpose: purpose || "",
      notes: notes || "",
      status: "scheduled",
    });

    res.status(201).json({ message: "Meeting booked!", meeting });
  } catch (err) {
    console.log("BOOK MEETING ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ===== GET /api/availability/:professionalUserId — public view of a professional's availability + booked slots =====
app.get("/api/availability/:professionalUserId", async (req, res) => {
  try {
    const availability = await Availability.findOne({ userId: req.professionalUserId || req.params.professionalUserId });
    if (!availability) {
      return res.status(404).json({ message: "No availability set for this professional." });
    }

    const professional = await Professional.findOne({ user: req.params.professionalUserId });
    if (!professional) {
      return res.status(404).json({ message: "Professional not found." });
    }

    // find their upcoming booked meetings so we know which slots are taken
    const now = new Date();
    const bookedMeetings = await Meeting.find({
      professional: professional._id,
      status: { $in: ["scheduled", "completed"] },
      date: { $gte: now },
    }).select("date -_id");

    res.json({
      timezone: availability.timezone,
      availability: availability.availability,
      bookedSlots: bookedMeetings.map((m) => m.date),
    });
  } catch (err) {
    console.log("GET PUBLIC AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

app.listen(process.env.PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT}`
  );
});