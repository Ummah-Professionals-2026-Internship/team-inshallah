// Talks to the messaging endpoints in backend/routes/messages.js.
// Auth is the same Bearer token the rest of the app stores in localStorage.
import { API_BASE_URL } from "../config";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/conversations${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });

  // every endpoint answers with JSON, but guard in case a proxy returns HTML
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Something went wrong. Please try again.");
  }

  return body;
}

// the inbox: all threads you're part of, newest activity first
export const fetchConversations = () => request("");

// who you're allowed to start a new chat with (powers the "+" button)
export const fetchContacts = () => request("/contacts");

// full history for one thread (also marks it read for you)
export const fetchMessages = (conversationId) =>
  request(`/${conversationId}/messages`);

export const sendMessage = (conversationId, content) =>
  request(`/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

// open by meeting (from a meeting card) or by user (from the "+" picker)
export const openConversation = ({ meetingId, withUserId }) =>
  request("/open", {
    method: "POST",
    body: JSON.stringify(meetingId ? { meetingId } : { withUserId }),
  });

export const markConversationRead = (conversationId) =>
  request(`/${conversationId}/read`, { method: "POST" });
