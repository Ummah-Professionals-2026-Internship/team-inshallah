import mongoose from "mongoose";

// One conversation thread between a student and a professional.
//
// We keep ONE thread per (student, professional) pair — even if they end up
// sharing several meetings — because that matches how people expect chat to
// work (one thread per person, not one per meeting). `meeting` records the
// meeting the conversation was first opened from.
//
// We also denormalize the last message + timestamps onto the conversation so
// the inbox screen can be rendered from a single query, without having to dig
// into the Messages collection for every row (this is what the ticket means by
// "having this data helps to optimize query calls for inboxing").
const conversationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    professional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // the meeting this conversation was opened from
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

    
    readStatus: {
      student: { type: Date, default: null },
      professional: { type: Date, default: null },
    },

   
    lastNotifiedAt: {
      student: { type: Date, default: null },
      professional: { type: Date, default: null },
    },
  },
  { timestamps: true } // createdAt = when the conversation started, updatedAt = last activity
);

// only ever one thread per student/professional pair
conversationSchema.index({ student: 1, professional: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);
