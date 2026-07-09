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
const MAX_ATTEMPTS = 5;                 // lock out after this many wrong codes

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

    // Send the email FIRST. If this throws, we never write the record,
    // so a failed send doesn't trap the user in the resend cooldown.
    await sendVerificationEmail(user.email, code);

    // Only after a successful send do we store the code (attempts reset to 0).
    await EmailVerification.findOneAndUpdate(
      { userId },
      { userId, hashedCode, expiresAt: new Date(Date.now() + CODE_TTL_MS), lastSentAt: new Date(), attempts: 0 },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Error sending verification code:', err);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
});

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

    // Too many wrong attempts: block and force a new code.
    if (record.attempts >= MAX_ATTEMPTS) {
      await EmailVerification.deleteOne({ userId });
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    const isMatch = await bcrypt.compare(code, record.hashedCode);
    if (!isMatch) {
      // Count this failed attempt.
      record.attempts += 1;
      await record.save();
      const remaining = MAX_ATTEMPTS - record.attempts;
      return res.status(400).json({
        error: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. No attempts remaining — request a new code.',
      });
    }

    user.emailVerified = true;
    await user.save();
    await EmailVerification.deleteOne({ userId });

    return res.json({
      message: 'Email verified successfully',
      user: { id: user._id, email: user.email, role: user.role },
    }); }
    
    catch (err) {
    console.error('Error verifying code:', err);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
});

export default router;
