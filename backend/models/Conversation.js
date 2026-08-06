import mongoose from "mongoose";

// One conversation thread between two users.
//
// We keep ONE thread per pair of people — even if they end up sharing several
// meetings — because that matches how people expect chat to work (one thread
// per person, not one per meeting). `meeting` records the meeting the
// conversation was first opened from, when there was one.
//
// Participants is a plain 2-user array rather than named student/professional
// fields, because the spec allows pairs that aren't one of each: professionals
// message other professionals, and anyone can message an admin.
//
// We also denormalize the last message + timestamps onto the conversation so
// the inbox screen can be rendered from a single query, without having to dig
// into the Messages collection for every row.
const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 2,
        message: "A conversation must have exactly 2 participants.",
      },
    },

    // Sorted "idA:idB" string for the two participants. This exists only so we
    // can put a unique index on it: a unique index directly on `participants`
    // would be a multikey index, which enforces that no two conversations share
    // ANY participant — that would cap every user at one conversation total.
    pairKey: { type: String, required: true, unique: true },

    // the meeting this conversation was opened from (absent for professional
    // to professional and admin threads, which don't need a meeting)
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
    },

    // a copy of the most recent message + who sent it (for the inbox preview)
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date },
    lastSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // userId -> the last time that user read this thread, used for unread counts
    readStatus: { type: Map, of: Date, default: () => new Map() },

    // userId -> the last time we emailed that user about this thread, so a
    // burst of messages doesn't turn into a burst of emails
    lastNotifiedAt: { type: Map, of: Date, default: () => new Map() },
  },
  { timestamps: true } // createdAt = when the conversation started, updatedAt = last activity
);

// list a user's inbox quickly
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// Build the canonical key for a pair of users. Sorting means we get the same
// key regardless of who started the conversation.
conversationSchema.statics.buildPairKey = function (userA, userB) {
  return [String(userA), String(userB)].sort().join(":");
};

export default mongoose.model("Conversation", conversationSchema);
