import styles from "./MeetingTile.module.css";

// Maps a meeting's status to its color theme.
// Ticket: upcoming = yellow, cancelled = red (crossed out), rescheduled = blue.
function statusClass(status) {
  switch (status) {
    case "cancelled":
      return styles.cancelled;
    case "rescheduled":
      return styles.rescheduled;
    case "upcoming":
    case "scheduled":
    default:
      return styles.upcoming;
  }
}

export default function MeetingTile({ meeting, onClick }) {
  const isCancelled = meeting.status === "cancelled";

  return (
    <div
      className={`${styles.tile} ${statusClass(meeting.status)}`}
      onClick={() => onClick?.(meeting)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) onClick(meeting);
      }}
    >
      <div className={`${styles.info} ${isCancelled ? styles.struck : ""}`}>
        <p className={styles.name}>{meeting.with}</p>
        <p className={styles.meta}>
          {meeting.day} · {meeting.time} · {meeting.type}
        </p>
      </div>

      {meeting.link && (
        <a
          href={meeting.link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkBtn}
          onClick={(e) => e.stopPropagation()}
          aria-label="Open meeting link"
        >
          Join
        </a>
      )}
    </div>
  );
}