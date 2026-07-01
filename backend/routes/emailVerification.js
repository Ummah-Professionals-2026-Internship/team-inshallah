import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import EmailVerification from '../models/EmailVerification.js';
import { sendVerificationEmail } from '../utils/mailer.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const CODE_TTL_MS = 60 * 60 * 1000;     // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 seconds

// ===== REQUEST a verification code =====
router.post('/request', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const existing = await EmailVerification.findOne({ userId });
    if (existing) {
      const sinceLast = Date.now() - existing.lastSentAt.getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000);
        return res.status(429).json({ error: `Please wait ${wait}s before requesting another code` });
      }
    }

    const code = crypto.randomInt(10000, 100000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await EmailVerification.findOneAndUpdate(
      { userId },
      { userId, hashedCode, expiresAt: new Date(Date.now() + CODE_TTL_MS), lastSentAt: new Date() },
      { upsert: true, new: true }
    );

    await sendVerificationEmail(user.email, code);

    return res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Error sending verification code:', err);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// ===== VERIFY a submitted code =====
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const record = await EmailVerification.findOne({ userId });
    if (!record) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(code, record.hashedCode);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    user.emailVerified = true;
    await user.save();
    await EmailVerification.deleteOne({ userId });

    return res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Error verifying code:', err);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
});

export default router;