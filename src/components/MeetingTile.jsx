import styles from "./MeetingTile.module.css";

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
      className={`${styles.tile} ${isCancelled ? styles.tileCancelled : ""}`}
      onClick={() => onClick?.(meeting)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) onClick(meeting);
      }}
    >
      {/* Left: colored time box */}
      <div className={`${styles.timeBox} ${statusClass(meeting.status)}`}>
        <span className={styles.dayLabel}>{meeting.day}</span>
        <span className={styles.time}>{meeting.time}</span>
      </div>

      {/* Middle: name + type */}
      <div className={`${styles.info} ${isCancelled ? styles.struck : ""}`}>
        <p className={styles.name}>{meeting.with}</p>
        <p className={styles.type}>{meeting.type}</p>
      </div>

      {/* Right: video/link button */}
      {meeting.link && !isCancelled && (
        <a
          href={meeting.link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.videoBtn}
          onClick={(e) => e.stopPropagation()}
          aria-label="Join meeting"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        </a>
      )}
    </div>
  );
}