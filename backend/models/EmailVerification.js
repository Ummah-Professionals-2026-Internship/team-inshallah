import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // one active verification record per user
  },
  hashedCode: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true, // we'll set this to "now + 1 hour" in the route
  },
  lastSentAt: {
    type: Date,
    default: Date.now, // used later for the resend cooldown
  },
});

// TTL index: Mongo will delete the document once expiresAt is in the past
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('EmailVerification', emailVerificationSchema);