import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Professional from "../models/Professional.js";
import { sendNewMessageEmail } from "../utils/mailer.js";
import { requireAuth } from "../middleware/auth.js";

// Issue #18 - Backend Messaging Functionality
//
//   POST /api/conversations/open            -> open (find or create) a conversation
//   GET  /api/conversations                 -> inbox: every conversation you're in
//   GET  /api/conversations/:id/messages    -> full message history (marks as read)
//   POST /api/conversations/:id/messages    -> send a new message (emails the other person)
//   POST /api/conversations/:id/read        -> mark a conversation as read
//
// The rule "you can only message people you've had a meeting with" is enforced
// by checking the team's meetings collection (see the MEETING INTEGRATION
// section below). Messaging never creates or edits meetings.

const router = express.Router();

const NOTIFY_THROTTLE_MS = 60 * 60 * 1000; // one email per hour per person per thread

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

// which side of the conversation is this user? returns "student", "professional", or null
function roleInConversation(conversation, userId) {
  const id = String(userId);
  if (String(conversation.student) === id) return "student";
  if (String(conversation.professional) === id) return "professional";
  return null;
}

// look up a friendly name/photo for a user. Names live on the Student /
// Professional profile documents; if there's no profile yet we fall back to
// the account email so the inbox still has something to show.
async function resolveParticipant(userId) {
  // profiles link back to the account via `userId` (and older docs via `user`)
  const link = { $or: [{ userId }, { user: userId }] };
  const [user, student, professional] = await Promise.all([
    User.findById(userId).lean(),
    Student.findOne(link).lean(),
    Professional.findOne(link).lean(),
  ]);
  const profile = student || professional;
  return {
    id: String(userId),
    name: profile?.name || user?.email || "Unknown user",
    email: user?.email || null,
    role: user?.role || null,
    profilePicture: profile?.profilePicture || "",
  };
}

// how many messages in this thread the user hasn't seen yet
async function unreadCount(conversation, userId) {
  const role = roleInConversation(conversation, userId);
  if (!role) return 0;
  const lastRead = conversation.readStatus?.[role];
  const query = {
    conversation: conversation._id,
    sender: { $ne: toObjectId(userId) },
  };
  if (lastRead) query.createdAt = { $gt: lastRead };
  return Message.countDocuments(query);
}

// ---------------------------------------------------------------------------
// MEETING INTEGRATION  (the ONE place messaging touches the meetings module)
//
// We read the `meetings` collection directly instead of importing a Meeting
// model, so this file works no matter how the scheduler team finishes their
// module and doesn't crash if the collection doesn't exist yet.
//
// IMPORTANT: a meeting document points at the STUDENT / PROFESSIONAL PROFILE
// documents, not at the User accounts. Conversations, on the other hand, are
// keyed by User account ids (that's what auth gives us and what emails need).
// So here we translate between the two:
//   - readMeetingPair()  -> pulls the two PROFILE ids out of a meeting
//   - userIdFor*Profile()-> profile id  ->  User account id
//   - *ProfileIdForUser()-> User account id  ->  profile id
//
// The scheduler branches currently disagree on field names
// (`student`/`professional` vs `studentID`/`professionalID`), so we accept
// both. If they settle on something else, adjust readMeetingPair / the
// findSharedMeeting query below — that's the only place that needs to change.
// ---------------------------------------------------------------------------

// pull the student + professional PROFILE ids out of a raw meeting document
function readMeetingPair(meeting) {
  if (!meeting) return null;
  const student = meeting.student ?? meeting.studentID ?? meeting.studentId ?? null;
  const professional =
    meeting.professional ?? meeting.professionalID ?? meeting.professionalId ?? null;
  if (student && professional) {
    return {
      studentProfile: String(student),
      professionalProfile: String(professional),
    };
  }
  return null;
}

// profile id -> the User account that owns it
async function userIdForStudentProfile(profileId) {
  const s = await Student.findById(profileId).select("userId user").lean();
  const id = s?.userId ?? s?.user;
  return id ? String(id) : null;
}
async function userIdForProfessionalProfile(profileId) {
  const p = await Professional.findById(profileId).select("userId user").lean();
  const id = p?.userId ?? p?.user;
  return id ? String(id) : null;
}

// User account id -> their profile id (null if they don't have that profile)
async function studentProfileIdForUser(userId) {
  const s = await Student.findOne({ $or: [{ userId }, { user: userId }] })
    .select("_id")
    .lean();
  return s?._id ?? null;
}
async function professionalProfileIdForUser(userId) {
  const p = await Professional.findOne({ $or: [{ userId }, { user: userId }] })
    .select("_id")
    .lean();
  return p?._id ?? null;
}

// the raw meetings collection (no schema needed)
function meetingsCollection() {
  return mongoose.connection.collection("meetings");
}

// find a single meeting document by its id
async function findMeetingById(meetingId) {
  const oid = toObjectId(meetingId);
  if (!oid) return null;
  return meetingsCollection().findOne({ _id: oid });
}

// find any meeting shared by these two USER accounts. We first resolve each
// account to its student/professional profile, then look for a meeting linking
// those profiles (either user could be the student).
async function findSharedMeeting(userAId, userBId) {
  const [aStudent, bStudent, aProf, bProf] = await Promise.all([
    studentProfileIdForUser(userAId),
    studentProfileIdForUser(userBId),
    professionalProfileIdForUser(userAId),
    professionalProfileIdForUser(userBId),
  ]);

  const studentIds = [aStudent, bStudent].filter(Boolean).map(toObjectId);
  const professionalIds = [aProf, bProf].filter(Boolean).map(toObjectId);
  if (studentIds.length === 0 || professionalIds.length === 0) return null;

  return meetingsCollection().findOne({
    $or: [
      { student: { $in: studentIds }, professional: { $in: professionalIds } },
      { studentID: { $in: studentIds }, professionalID: { $in: professionalIds } },
    ],
  });
}

// given a meeting document, return the two participants as USER account ids
async function meetingUserPair(meeting) {
  const pair = readMeetingPair(meeting);
  if (!pair) return null;
  const [studentUserId, professionalUserId] = await Promise.all([
    userIdForStudentProfile(pair.studentProfile),
    userIdForProfessionalProfile(pair.professionalProfile),
  ]);
  if (!studentUserId || !professionalUserId) return null;
  return { studentUserId, professionalUserId };
}

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------

// POST /api/conversations/open
// Body: { meetingId } (preferred - opened from a meeting card) OR { withUserId }.
// Finds the existing conversation for the pair, or creates one after confirming
// the two users actually share a meeting.
router.post("/open", requireAuth, async (req, res) => {
  try {
    const me = req.userId;
    const { meetingId, withUserId } = req.body ?? {};

    let studentId;
    let professionalId;
    let meeting = null;

    if (meetingId) {
      meeting = await findMeetingById(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found." });
      }
    } else if (withUserId) {
      meeting = await findSharedMeeting(me, withUserId);
      if (!meeting) {
        return res.status(403).json({
          message: "You can only message people you have a meeting with.",
        });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Provide a meetingId or a withUserId." });
    }

    // translate the meeting's profile ids into the two User account ids
    const pair = await meetingUserPair(meeting);
    if (!pair) {
      return res
        .status(400)
        .json({ message: "Could not resolve the meeting's participants." });
    }
    studentId = pair.studentUserId;
    professionalId = pair.professionalUserId;

    // the requester must be one of the two people in the meeting
    if (String(me) !== String(studentId) && String(me) !== String(professionalId)) {
      return res
        .status(403)
        .json({ message: "You are not a participant of this meeting." });
    }

    // find or create the single thread for this pair
    let conversation = await Conversation.findOne({
      student: studentId,
      professional: professionalId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        student: studentId,
        professional: professionalId,
        meeting: meeting?._id,
      });
    }

    const other =
      String(me) === String(conversation.student)
        ? conversation.professional
        : conversation.student;

    return res.status(200).json({
      conversation: {
        id: String(conversation._id),
        meetingId: conversation.meeting ? String(conversation.meeting) : null,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      participant: await resolveParticipant(other),
    });
  } catch (err) {
    // duplicate-key from two "open" calls racing: just fetch the existing one
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Conversation already exists. Please retry." });
    }
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

    const conversations = await Conversation.find({
      $or: [{ student: me }, { professional: me }],
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const items = await Promise.all(
      conversations.map(async (c) => {
        const otherId =
          String(req.userId) === String(c.student) ? c.professional : c.student;
        const [participant, unread] = await Promise.all([
          resolveParticipant(otherId),
          unreadCount(c, req.userId),
        ]);
        return {
          id: String(c._id),
          meetingId: c.meeting ? String(c.meeting) : null,
          participant,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: unread,
          updatedAt: c.updatedAt,
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

// GET /api/conversations/:id/messages
// Full history (oldest -> newest) for a conversation you belong to. Viewing the
// messages marks the thread as read for you.
router.get("/:id/messages", requireAuth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const role = roleInConversation(conversation, req.userId);
    if (!role) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation." });
    }

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    // mark read: record that this user has now seen everything up to "now"
    conversation.readStatus[role] = new Date();
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

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const role = roleInConversation(conversation, req.userId);
    if (!role) {
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
    conversation.readStatus[role] = now;

    // figure out who should be notified
    const recipientRole = role === "student" ? "professional" : "student";
    const recipientId =
      recipientRole === "student"
        ? conversation.student
        : conversation.professional;

    // throttle: only email if we haven't emailed this recipient in the last hour
    const lastNotified = conversation.lastNotifiedAt?.[recipientRole];
    const shouldNotify =
      !lastNotified || now.getTime() - new Date(lastNotified).getTime() >= NOTIFY_THROTTLE_MS;

    if (shouldNotify) {
      conversation.lastNotifiedAt[recipientRole] = now;
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
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const role = roleInConversation(conversation, req.userId);
    if (!role) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation." });
    }

    conversation.readStatus[role] = new Date();
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
