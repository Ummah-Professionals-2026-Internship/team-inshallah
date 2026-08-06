import styles from "./MeetingTile.module.css";
import chatIcon from "../assets/meetingtilechaticon.svg";
import joinMeetingButton from "../assets/joinmeetingbutton.svg";
import feedbackIcon from "../assets/feedbackicon.svg";

function statusClass(status) {
  switch (status) {
    case "cancelled":
      return styles.cancelled;
    case "rescheduled":
      return styles.rescheduled;
    case "completed":
      return styles.completed;
    case "upcoming":
    case "scheduled":
    default:
      return styles.upcoming;
  }
}

export default function MeetingTile({ meeting, onClick, onFeedback }) {
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

      {/* Right: chat + join buttons */}
      {!isCancelled && (
        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={(e) => e.stopPropagation()}
            aria-label="Chat (coming soon)"
          >
            <img src={chatIcon} alt="" className={styles.iconImg} />
          </button>

          {meeting.status === "completed" ? (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={(e) => {
                e.stopPropagation();
                onFeedback?.(meeting);
              }}
              aria-label="Give feedback"
            >
              <img src={feedbackIcon} alt="" className={`${styles.iconImg} ${styles.feedbackImg}`} />
              </button>
          ) : (
            <a
              href={meeting.link || "https://meet.google.com"}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.iconBtn}
              onClick={(e) => e.stopPropagation()}
              aria-label="Join meeting"
            >
              <img src={joinMeetingButton} alt="" className={styles.iconImg} />
            </a>
          )}
        </div>
      )}

    </div>
  );
}