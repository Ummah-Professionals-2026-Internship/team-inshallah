import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

// Assignment #6 - Login & Sign Up API
//   POST /api/auth/signup -> create an account (writes to the database)
//   POST /api/auth/login  -> verify credentials (reads from the database)

const router = express.Router();

// a safe copy of the user to send back (no password hash)
const publicUser = (user) => ({
  id: user._id,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
});

// sign a login token the frontend can store and send back later
const createToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "60d" }
  );

const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// --- Sign Up ---
router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body ?? {};

    // validate input -> 400 with a clear message
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }
    const userRole = role ?? "student";
    if (!["student", "professional"].includes(userRole)) {
      return res
        .status(400)
        .json({ message: "Role must be 'student' or 'professional'." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // prevent duplicate accounts
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    // hash the password, then store the user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: cleanEmail,
      passwordHash,
      role: userRole,
    });

    return res
      .status(201)
      .json({ user: publicUser(user), token: createToken(user) });
  } catch (err) {
    console.log("SIGNUP ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// --- Login ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // same message for wrong email and wrong password (don't reveal which)
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({ user: publicUser(user), token: createToken(user) });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// --- Current user ---
// GET /api/auth/me -> returns the logged-in user (requires a valid token).
// the frontend calls this on page load to know who is signed in and stay logged in.
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.log("ME ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

export default router;
