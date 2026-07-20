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

      console.log("DEBUG professional userId:", professional.userId);

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

app.listen(process.env.PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT}`
  );
});
