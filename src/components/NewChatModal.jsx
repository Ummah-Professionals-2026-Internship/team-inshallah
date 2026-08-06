import { useEffect, useMemo, useState } from "react";
import styles from "./ChatPanel.module.css";
import ChatAvatar from "./ChatAvatar";
import { fetchContacts } from "../api/messages";

// The "+" picker. The backend decides who is eligible (students see
// professionals they've met plus admins; professionals see other professionals
// plus admins), so this just renders whatever /contacts returns.
export default function NewChatModal({ onClose, onSelect, userRole }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchContacts()
      .then((body) => {
        if (!cancelled) setContacts(body.contacts || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((contact) =>
      contact.name.toLowerCase().includes(term)
    );
  }, [contacts, search]);

  const emptyHint =
    userRole === "student"
      ? "You can message professionals once you have a meeting booked with them."
      : "There's nobody available to message yet.";

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Start a new conversation"
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>New Message</h3>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <input
          type="text"
          className={styles.modalSearch}
          placeholder="Search people"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.modalList}>
          {loading && <p className={styles.stateText}>Loading…</p>}

          {!loading && error && (
            <p className={`${styles.stateText} ${styles.errorText}`}>{error}</p>
          )}

          {!loading && !error && visible.length === 0 && (
            <p className={styles.stateText}>
              {contacts.length === 0 ? emptyHint : "No matches."}
            </p>
          )}

          {!loading &&
            !error &&
            visible.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className={styles.contactRow}
                onClick={() => onSelect(contact)}
              >
                <ChatAvatar src={contact.profilePicture} name={contact.name} size={40} />
                <span className={styles.contactText}>
                  <span className={styles.contactName}>{contact.name}</span>
                  <span className={styles.contactReason}>{contact.reason}</span>
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
