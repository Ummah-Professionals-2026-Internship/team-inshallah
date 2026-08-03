import { useState } from "react";
import styles from "./MeetingDetailModal.module.css";

export default function MeetingDetailModal({ meeting, onClose, onReschedule, onCancelled }) {
  const [mode, setMode] = useState("details"); // "details" or "cancel"
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!meeting) return null;

  async function handleConfirmCancel() {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5050/api/meetings/${meeting.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel.");

      onCancelled?.(meeting); // tell the dashboard to refresh
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

        {mode === "details" ? (
          <>
            <h2 className={styles.title}>Meeting Details</h2>

            <div className={styles.section}>
              <p className={styles.label}>With</p>
              <p className={styles.value}>{meeting.with}</p>
            </div>

            <div className={styles.section}>
              <p className={styles.label}>When</p>
              <p className={styles.value}>{meeting.day} · {meeting.time}</p>
            </div>

            <div className={styles.section}>
              <p className={styles.label}>Type</p>
              <p className={styles.value}>{meeting.type}</p>
            </div>

            <div className={styles.section}>
              <p className={styles.label}>Status</p>
              <p className={styles.value}>{meeting.status}</p>
            </div>

            {meeting.notes && (
              <div className={styles.section}>
                <p className={styles.label}>Notes</p>
                <p className={styles.value}>{meeting.notes}</p>
              </div>
            )}

            {meeting.status !== "cancelled" && (
              <div className={styles.actions}>
                <button type="button" className={styles.rescheduleBtn} onClick={() => onReschedule?.(meeting)}>
                  Reschedule
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => setMode("cancel")}>
                  Cancel Meeting
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className={styles.title}>Cancel Meeting</h2>
            <p className={styles.value}>Cancel your {meeting.type} with {meeting.with}?</p>

            <div className={styles.section}>
              <p className={styles.label}>Reason for cancelling</p>
              <textarea
                className={styles.reasonInput}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Let them know why (optional)"
              />
            </div>

            {error && <p className={styles.errorText}>{error}</p>}

            <p className={styles.note}>
              Cancelling will send a notification email to both parties.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.backBtn} onClick={() => setMode("details")}>
                Back
              </button>
              <button type="button" className={styles.cancelBtn} onClick={handleConfirmCancel} disabled={submitting}>
                {submitting ? "Cancelling…" : "Cancel Meeting"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}