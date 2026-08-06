import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ChatPanel.module.css";
import ChatAvatar from "./ChatAvatar";
import NewChatModal from "./NewChatModal";
import {
  fetchConversations,
  fetchMessages,
  openConversation,
  sendMessage,
} from "../api/messages";

// There are no websockets on the backend, so the panel polls instead. The
// thread you're reading refreshes faster than the inbox list behind it.
const INBOX_POLL_MS = 10000;
const THREAD_POLL_MS = 5000;

function formatTimestamp(value) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export default function ChatPanel({ open, onClose, userRole }) {
  const [conversations, setConversations] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [inboxError, setInboxError] = useState("");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  // the thread currently being read; null means we're on the inbox list
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);

  // These update state only from promise callbacks, never synchronously, so
  // they're safe to kick off from an effect. Loading flags are switched on by
  // whichever event handler starts the work.
  const loadInbox = useCallback(({ quiet = false } = {}) => {
    return fetchConversations()
      .then((body) => {
        setConversations(body.conversations || []);
        setInboxError("");
      })
      .catch((err) => {
        // a failed background poll shouldn't replace the list with an error
        if (!quiet) setInboxError(err.message);
      })
      .finally(() => setLoadingInbox(false));
  }, []);

  // load + poll the inbox while the panel is open
  useEffect(() => {
    if (!open) return undefined;

    loadInbox();
    const timer = setInterval(() => loadInbox({ quiet: true }), INBOX_POLL_MS);
    return () => clearInterval(timer);
  }, [open, loadInbox]);

  const loadThread = useCallback((conversationId, { quiet = false } = {}) => {
    return fetchMessages(conversationId)
      .then((body) => {
        setMessages(body.messages || []);
        setThreadError("");
      })
      .catch((err) => {
        if (!quiet) setThreadError(err.message);
      })
      .finally(() => setLoadingThread(false));
  }, []);

  // Opening a thread is always user-initiated, so this is where the spinner and
  // the reset of the previous thread's state belong.
  const openThread = (id, participant) => {
    setActive({ id, participant });
    setMessages([]);
    setDraft("");
    setThreadError("");
    setLoadingThread(true);
  };

  // load + poll the open thread. Reading it also clears its unread badge, so
  // refresh the inbox once on open.
  useEffect(() => {
    if (!active) return undefined;

    loadThread(active.id);
    loadInbox({ quiet: true });

    const timer = setInterval(
      () => loadThread(active.id, { quiet: true }),
      THREAD_POLL_MS
    );
    return () => clearInterval(timer);
  }, [active, loadThread, loadInbox]);

  // keep the newest message in view
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (tab === "unread" && !conversation.unreadCount) return false;
      if (!term) return true;

      const name = conversation.participant?.name?.toLowerCase() || "";
      return name.includes(term);
    });
  }, [conversations, tab, search]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const handleSend = async (event) => {
    event.preventDefault();

    const content = draft.trim();
    if (!content || sending || !active) return;

    setSending(true);
    try {
      const body = await sendMessage(active.id, content);
      setMessages((prev) => [...prev, body.message]);
      setDraft("");
      setThreadError("");
      loadInbox({ quiet: true });
    } catch (err) {
      setThreadError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handlePickContact = async (contact) => {
    try {
      const body = await openConversation({ withUserId: contact.id });
      setShowNewChat(false);
      openThread(body.conversation.id, body.participant);
    } catch (err) {
      setInboxError(err.message);
      setShowNewChat(false);
    }
  };

  const closeThread = () => {
    setActive(null);
    setMessages([]);
    setDraft("");
    setThreadError("");
  };

  if (!open) return null;

  return (
    <aside className={styles.panel} aria-label="Messages">
      {active ? (
        <>
          <header className={styles.threadHeader}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={closeThread}
              aria-label="Back to all chats"
            >
              &#8249;
            </button>
            <ChatAvatar
              src={active.participant?.profilePicture}
              name={active.participant?.name}
              size={38}
            />
            <div className={styles.threadWho}>
              <p className={styles.threadName}>{active.participant?.name}</p>
              <p className={styles.threadRole}>{active.participant?.role}</p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close messages"
            >
              &times;
            </button>
          </header>

          <div className={styles.messages} ref={scrollRef}>
            {loadingThread && <p className={styles.stateText}>Loading…</p>}

            {!loadingThread && messages.length === 0 && !threadError && (
              <p className={styles.stateText}>
                No messages yet — say hello.
              </p>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.bubbleRow} ${
                  message.mine ? styles.bubbleRowMine : ""
                }`}
              >
                <div
                  className={`${styles.bubble} ${
                    message.mine ? styles.bubbleMine : styles.bubbleTheirs
                  }`}
                >
                  <p className={styles.bubbleText}>{message.content}</p>
                  <span className={styles.bubbleTime}>
                    {formatTimestamp(message.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {threadError && (
            <p className={`${styles.stateText} ${styles.errorText}`}>
              {threadError}
            </p>
          )}

          <form className={styles.composer} onSubmit={handleSend}>
            <input
              type="text"
              className={styles.composerInput}
              placeholder="Write a message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={5000}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!draft.trim() || sending}
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        </>
      ) : (
        <>
          <header className={styles.inboxHeader}>
            <div className={styles.searchWrap}>
              <svg
                className={styles.searchIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search chats"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close messages"
            >
              &times;
            </button>
          </header>

          <div className={styles.tabsRow}>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${tab === "all" ? styles.tabActive : ""}`}
                onClick={() => setTab("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`${styles.tab} ${
                  tab === "unread" ? styles.tabActive : ""
                }`}
                onClick={() => setTab("unread")}
              >
                Unread{totalUnread ? ` (${totalUnread})` : ""}
              </button>
            </div>

            <button
              type="button"
              className={styles.newChatBtn}
              onClick={() => setShowNewChat(true)}
              aria-label="Start a new message"
            >
              +
            </button>
          </div>

          <div className={styles.list}>
            {loadingInbox && <p className={styles.stateText}>Loading…</p>}

            {!loadingInbox && inboxError && (
              <p className={`${styles.stateText} ${styles.errorText}`}>
                {inboxError}
              </p>
            )}

            {!loadingInbox && !inboxError && visibleConversations.length === 0 && (
              <p className={styles.stateText}>
                {conversations.length === 0
                  ? "No chats yet. Use + to start one."
                  : "Nothing here."}
              </p>
            )}

            {visibleConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={styles.chatRow}
                onClick={() =>
                  openThread(conversation.id, conversation.participant)
                }
              >
                <ChatAvatar
                  src={conversation.participant?.profilePicture}
                  name={conversation.participant?.name}
                />
                <span className={styles.chatText}>
                  <span className={styles.chatName}>
                    {conversation.participant?.name || "Unknown user"}
                  </span>
                  <span className={styles.chatPreview}>
                    {conversation.lastMessage || "No messages yet"}
                  </span>
                </span>
                <span className={styles.chatMeta}>
                  <span className={styles.chatTime}>
                    {formatTimestamp(conversation.lastMessageAt)}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <span className={styles.unreadBadge}>
                      {conversation.unreadCount}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {showNewChat && (
        <NewChatModal
          userRole={userRole}
          onClose={() => setShowNewChat(false)}
          onSelect={handlePickContact}
        />
      )}
    </aside>
  );
}
