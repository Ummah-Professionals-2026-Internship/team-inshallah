import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Professional from "../models/Professional.js";
import Meeting from "../models/Meeting.js";
import { sendNewMessageEmail } from "../utils/mailer.js";
import { requireAuth } from "../middleware/auth.js";

// Issues #18 (backend) and #28 (who may message whom)
//
//   POST /api/conversations/open            -> open (find or create) a conversation
//   GET  /api/conversations                 -> inbox: every conversation you're in
//   GET  /api/conversations/contacts        -> who you're allowed to start a chat with
//   GET  /api/conversations/:id/messages    -> full message history (marks as read)
//   POST /api/conversations/:id/messages    -> send a new message (emails the other person)
//   POST /api/conversations/:id/read        -> mark a conversation as read
//
// Messaging never creates or edits meetings; it only reads them to decide who
// is allowed to talk to whom.

const router = express.Router();

const NOTIFY_THROTTLE_MS = 60 * 60 * 1000; // one email per hour per person per thread

// A cancelled meeting doesn't earn you the right to message someone, so only
// these statuses count when we look for a shared meeting.
const ACTIVE_MEETING_STATUSES = ["scheduled", "completed"];

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

// turn a string id into a Mongo ObjectId (returns null if it's not a valid id)
function toObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

// Student and Professional documents both store the owning account id in
// `userId` (required) and `user` (older documents), so match either.
const profileLink = (userId) => ({ $or: [{ userId }, { user: userId }] });

// the account id that owns a profile document
const ownerOf = (profile) => {
  const id = profile?.userId ?? profile?.user;
  return id ? String(id) : null;
};

// Read a value out of readStatus / lastNotifiedAt. These are Mongoose Maps on a
// full document but plain objects once .lean() is used, so handle both shapes.
function timestampFor(mapLike, userId) {
  if (!mapLike) return null;
  const key = String(userId);
  const value = typeof mapLike.get === "function" ? mapLike.get(key) : mapLike[key];
  return value ?? null;
}

function isParticipant(conversation, userId) {
  return (conversation.participants || []).some(
    (p) => String(p) === String(userId)
  );
}

function otherParticipantId(conversation, userId) {
  const other = (conversation.participants || []).find(
    (p) => String(p) !== String(userId)
  );
  return other ? String(other) : null;
}

// look up a friendly name/photo for a user. Names live on the Student /
// Professional profile documents; admins have no profile, so we fall back to
// the account email and the inbox still has something to show.
async function resolveParticipant(userId) {
  const [user, student, professional] = await Promise.all([
    User.findById(userId).lean(),
    Student.findOne(profileLink(userId)).lean(),
    Professional.findOne(profileLink(userId)).lean(),
  ]);
  const profile = student || professional;
  return {
    id: String(userId),
    name: profile?.name || user?.email || "Unknown user",
    email: user?.email || null,
    role: user?.role || null,
    profilePicture: profile?.profilePicture || profile?.photo || "",
  };
}

// how many messages in this thread the user hasn't seen yet
async function unreadCount(conversation, userId) {
  if (!isParticipant(conversation, userId)) return 0;
  const lastRead = timestampFor(conversation.readStatus, userId);
  const query = {
    conversation: conversation._id,
    sender: { $ne: toObjectId(userId) },
  };
  if (lastRead) query.createdAt = { $gt: lastRead };
  return Message.countDocuments(query);
}

const shapeConversation = (conversation) => ({
  id: String(conversation._id),
  meetingId: conversation.meeting ? String(conversation.meeting) : null,
  lastMessage: conversation.lastMessage,
  lastMessageAt: conversation.lastMessageAt,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

// ---------------------------------------------------------------------------
// MEETING INTEGRATION
//
// A meeting document points at the STUDENT / PROFESSIONAL PROFILE documents,
// not at the User accounts. Conversations are keyed by User account ids (that's
// what auth gives us and what emails need), so we translate between the two.
// ---------------------------------------------------------------------------

// find a meeting shared by these two accounts, whichever way round they are
async function findSharedMeeting(userAId, userBId) {
  const [aStudent, bStudent, aProfessional, bProfessional] = await Promise.all([
    Student.findOne(profileLink(userAId)).select("_id").lean(),
    Student.findOne(profileLink(userBId)).select("_id").lean(),
    Professional.findOne(profileLink(userAId)).select("_id").lean(),
    Professional.findOne(profileLink(userBId)).select("_id").lean(),
  ]);

  const studentIds = [aStudent, bStudent].filter(Boolean).map((p) => p._id);
  const professionalIds = [aProfessional, bProfessional]
    .filter(Boolean)
    .map((p) => p._id);

  if (studentIds.length === 0 || professionalIds.length === 0) return null;

  return Meeting.findOne({
    student: { $in: studentIds },
    professional: { $in: professionalIds },
    status: { $in: ACTIVE_MEETING_STATUSES },
  }).lean();
}

// given a meeting, return its two participants as USER account ids
async function meetingUserPair(meeting) {
  if (!meeting?.student || !meeting?.professional) return null;

  const [student, professional] = await Promise.all([
    Student.findById(meeting.student).select("userId user").lean(),
    Professional.findById(meeting.professional).select("userId user").lean(),
  ]);

  const studentUserId = ownerOf(student);
  const professionalUserId = ownerOf(professional);
  if (!studentUserId || !professionalUserId) return null;

  return { studentUserId, professionalUserId };
}

// ---------------------------------------------------------------------------
// WHO MAY MESSAGE WHOM  (issue #28)
//
//   anyone       <-> admin        : always, admins are staff support
//   professional <-> professional : always
//   student      <-> professional : only if they share a booked/completed meeting
//   student      <-> student      : never
// ---------------------------------------------------------------------------
async function canMessage(me, them) {
  if (!me || !them) {
    return { allowed: false, status: 404, reason: "User not found." };
  }
  if (String(me._id) === String(them._id)) {
    return { allowed: false, status: 400, reason: "You cannot message yourself." };
  }
  if (me.role === "admin" || them.role === "admin") {
    return { allowed: true };
  }
  if (me.role === "professional" && them.role === "professional") {
    return { allowed: true };
  }

  const pairing = [me.role, them.role].sort().join("+");
  if (pairing === "professional+student") {
    const meeting = await findSharedMeeting(me._id, them._id);
    if (!meeting) {
      return {
        allowed: false,
        status: 403,
        reason: "You can only message people you have a meeting with.",
      };
    }
    return { allowed: true, meeting };
  }

  return {
    allowed: false,
    status: 403,
    reason: "Students can only message professionals they have met with.",
  };
}

// Find the single thread for a pair, creating it if it doesn't exist yet.
async function findOrCreateConversation(userAId, userBId, meetingId) {
  const pairKey = Conversation.buildPairKey(userAId, userBId);

  const existing = await Conversation.findOne({ pairKey });
  if (existing) {
    // if we opened from a meeting and didn't know about one before, record it
    if (!existing.meeting && meetingId) {
      existing.meeting = meetingId;
      await existing.save();
    }
    return existing;
  }

  // keep participants in the same order as pairKey so the pair is canonical
  const participants = [toObjectId(userAId), toObjectId(userBId)].sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  try {
    return await Conversation.create({
      participants,
      pairKey,
      meeting: meetingId || undefined,
    });
  } catch (err) {
    // two "open" calls raced each other; the other one won, so use its thread
    if (err?.code === 11000) return Conversation.findOne({ pairKey });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------

// POST /api/conversations/open
// Body: { meetingId } (opened from a meeting card) OR { withUserId } (opened
// from the "+" new-message picker). Finds the existing thread or creates one
// after confirming the two people are allowed to talk.
router.post("/open", requireAuth, async (req, res) => {
  try {
    const { meetingId, withUserId } = req.body ?? {};
    const me = await User.findById(req.userId).lean();
    if (!me) return res.status(404).json({ message: "User not found." });

    let conversation;
    let otherId;

    if (meetingId) {
      const meeting = await Meeting.findById(meetingId).lean();
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found." });
      }

      const pair = await meetingUserPair(meeting);
      if (!pair) {
        return res
          .status(400)
          .json({ message: "Could not resolve the meeting's participants." });
      }

      const { studentUserId, professionalUserId } = pair;
      if (
        String(req.userId) !== studentUserId &&
        String(req.userId) !== professionalUserId
      ) {
        return res
          .status(403)
          .json({ message: "You are not a participant of this meeting." });
      }

      otherId =
        String(req.userId) === studentUserId ? professionalUserId : studentUserId;
      conversation = await findOrCreateConversation(
        req.userId,
        otherId,
        meeting._id
      );
    } else if (withUserId) {
      if (!toObjectId(withUserId)) {
        return res.status(400).json({ message: "Invalid user id." });
      }

      const them = await User.findById(withUserId).lean();
      const verdict = await canMessage(me, them);
      if (!verdict.allowed) {
        return res.status(verdict.status).json({ message: verdict.reason });
      }

      otherId = String(withUserId);
      conversation = await findOrCreateConversation(
        req.userId,
        otherId,
        verdict.meeting?._id
      );
    } else {
      return res
        .status(400)
        .json({ message: "Provide a meetingId or a withUserId." });
    }

    return res.status(200).json({
      conversation: shapeConversation(conversation),
      participant: await resolveParticipant(otherId),
    });
  } catch (err) {
    console.log("OPEN CONVERSATION ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// GET /api/conversations
// The inbox: every conversation the logged-in user is part of, newest activity
// first, with the other participant's info, the last message, and unread count.
router.get("/", requireAuth, async (req, res) => {
  try {
    const me = toObjectId(req.userId);

    const conversations = await Conversation.find({ participants: me })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const items = await Promise.all(
      conversations.map(async (conversation) => {
        const otherId = otherParticipantId(conversation, req.userId);
        const [participant, unread] = await Promise.all([
          otherId ? resolveParticipant(otherId) : null,
          unreadCount(conversation, req.userId),
        ]);
        return {
          ...shapeConversation(conversation),
          participant,
          unreadCount: unread,
        };
      })
    );

    return res.json({ conversations: items });
  } catch (err) {
    console.log("INBOX ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// GET /api/conversations/contacts
// Powers the "+" new-message picker: everyone the logged-in user is allowed to
// start a conversation with, and why.
//
// NOTE: declared before the "/:id/..." routes so "contacts" is never read as an id.
router.get("/contacts", requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId).lean();
    if (!me) return res.status(404).json({ message: "User not found." });

    const contacts = [];
    const seenUserIds = new Set([String(me._id)]);

    const add = (userId, name, role, profilePicture, reason) => {
      const id = String(userId);
      if (!userId || seenUserIds.has(id)) return;
      seenUserIds.add(id);
      contacts.push({
        id,
        name: name || "Unknown user",
        role,
        profilePicture: profilePicture || "",
        reason,
      });
    };

    if (me.role === "student") {
      // professionals this student has met, or is about to meet
      const myProfile = await Student.findOne(profileLink(me._id))
        .select("_id")
        .lean();

      if (myProfile) {
        const meetings = await Meeting.find({
          student: myProfile._id,
          status: { $in: ACTIVE_MEETING_STATUSES },
        })
          .sort({ date: -1 })
          .lean();

        const now = new Date();
        const professionalIds = [
          ...new Set(meetings.map((m) => String(m.professional))),
        ];

        const professionals = await Professional.find({
          _id: { $in: professionalIds.map(toObjectId).filter(Boolean) },
        }).lean();

        const byId = new Map(professionals.map((p) => [String(p._id), p]));

        for (const meeting of meetings) {
          const professional = byId.get(String(meeting.professional));
          if (!professional) continue;
          add(
            ownerOf(professional),
            professional.name,
            "professional",
            professional.profilePicture || professional.photo,
            new Date(meeting.date) > now ? "Upcoming meeting" : "Previous meeting"
          );
        }
      }
    } else if (me.role === "professional") {
      // every other professional on the platform
      const professionals = await Professional.find({}).lean();
      for (const professional of professionals) {
        add(
          ownerOf(professional),
          professional.name,
          "professional",
          professional.profilePicture || professional.photo,
          professional.jobTitle || "Professional"
        );
      }
    } else if (me.role === "admin") {
      // admins support everyone, so they can reach anybody
      const [students, professionals] = await Promise.all([
        Student.find({}).lean(),
        Professional.find({}).lean(),
      ]);
      for (const student of students) {
        add(ownerOf(student), student.name, "student", student.profilePicture, "Student");
      }
      for (const professional of professionals) {
        add(
          ownerOf(professional),
          professional.name,
          "professional",
          professional.profilePicture || professional.photo,
          professional.jobTitle || "Professional"
        );
      }
    }

    // everyone can always reach an admin
    const admins = await User.find({ role: "admin" }).lean();
    for (const admin of admins) {
      add(admin._id, admin.email, "admin", "", "Admin");
    }

    return res.json({ contacts });
  } catch (err) {
    console.log("CONTACTS ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// GET /api/conversations/:id/messages
// Full history (oldest -> newest) for a conversation you belong to. Viewing the
// messages marks the thread as read for you.
router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    if (!toObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid conversation id." });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    if (!isParticipant(conversation, req.userId)) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation." });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    // mark read: record that this user has now seen everything up to "now"
    conversation.readStatus.set(String(req.userId), new Date());
    await conversation.save();

    return res.json({
      messages: messages.map((m) => ({
        id: String(m._id),
        conversationId: String(m.conversation),
        senderId: String(m.sender),
        content: m.content,
        createdAt: m.createdAt,
        mine: String(m.sender) === String(req.userId),
      })),
    });
  } catch (err) {
    console.log("FETCH MESSAGES ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// POST /api/conversations/:id/messages
// Body: { content }. Sends a message, updates the conversation preview, and
// emails the other participant (at most once per hour per thread).
router.post("/:id/messages", requireAuth, async (req, res) => {
  try {
    const content = (req.body?.content ?? "").trim();
    if (!content) {
      return res.status(400).json({ message: "Message content is required." });
    }
    if (content.length > 5000) {
      return res
        .status(400)
        .json({ message: "Message is too long (5000 characters max)." });
    }
    if (!toObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid conversation id." });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    if (!isParticipant(conversation, req.userId)) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation." });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.userId,
      content,
    });

    // update the thread preview + mark the sender's own side as read
    const now = new Date();
    conversation.lastMessage = content;
    conversation.lastMessageAt = now;
    conversation.lastSender = req.userId;
    conversation.readStatus.set(String(req.userId), now);

    const recipientId = otherParticipantId(conversation, req.userId);

    // throttle: only email if we haven't emailed this recipient in the last hour
    const lastNotified = timestampFor(conversation.lastNotifiedAt, recipientId);
    const shouldNotify =
      recipientId &&
      (!lastNotified ||
        now.getTime() - new Date(lastNotified).getTime() >= NOTIFY_THROTTLE_MS);

    if (shouldNotify) {
      conversation.lastNotifiedAt.set(String(recipientId), now);
    }

    await conversation.save();

    // send the email after saving, and never let an email failure break sending
    if (shouldNotify) {
      try {
        const [recipient, sender] = await Promise.all([
          resolveParticipant(recipientId),
          resolveParticipant(req.userId),
        ]);
        if (recipient.email) {
          await sendNewMessageEmail(recipient.email, {
            senderName: sender.name,
            preview: content,
          });
        }
      } catch (mailErr) {
        console.log("MESSAGE EMAIL ERROR (non-fatal):", mailErr);
      }
    }

    return res.status(201).json({
      message: {
        id: String(message._id),
        conversationId: String(conversation._id),
        senderId: String(req.userId),
        content: message.content,
        createdAt: message.createdAt,
        mine: true,
      },
    });
  } catch (err) {
    console.log("SEND MESSAGE ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

// POST /api/conversations/:id/read
// Explicitly mark a conversation as read (e.g. when opening it in the UI).
router.post("/:id/read", requireAuth, async (req, res) => {
  try {
    if (!toObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid conversation id." });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }
    if (!isParticipant(conversation, req.userId)) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation." });
    }

    conversation.readStatus.set(String(req.userId), new Date());
    await conversation.save();

    return res.json({ message: "Conversation marked as read." });
  } catch (err) {
    console.log("MARK READ ERROR:", err);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
});

export default router;
