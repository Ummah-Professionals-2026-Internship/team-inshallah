import styles from "./MeetingDetailModal.module.css";

export default function MeetingDetailModal({ meeting, onClose, onReschedule, onCancel }) {
  if (!meeting) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

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

        <div className={styles.actions}>
          <button type="button" className={styles.rescheduleBtn} onClick={() => onReschedule?.(meeting)}>
            Reschedule
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => onCancel?.(meeting)}>
            Cancel Meeting
          </button>
        </div>
      </div>
    </div>
  );
}