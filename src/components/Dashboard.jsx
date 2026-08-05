// shared dashboard layout - used by both the professional and student dashboards
import { useState } from "react";
import styles from "./Dashboard.module.css";
import logoFull from "../assets/Brand Kit/Logos/PNGs/horizontal white.png";
import inboxIcon from "../assets/inbox chat button.png";
import MeetingTile from "./MeetingTile";
import MeetingDetailModal from "./MeetingDetailModal";
import ScheduleMeeting from "./ScheduleMeeting";

export default function Dashboard({
  userName,
  userRole,
  profilePhoto,
  navLinks,
  todoItems,
  upcomingMeetings,
  previousMeetings,
  onNavClick,
  onProfileClick,
  onMenuToggle,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checked, setChecked] = useState({});
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [reschedulingMeeting, setReschedulingMeeting] = useState(null);

  const toggleTodo = (index) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Check if all items in the list are checked
  const allCompleted =
    todoItems.length > 0 && todoItems.every((_, index) => !!checked[index]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div>
            <img src={logoFull} alt="Ummah Professionals" className={styles.logoImg} />
            <p className={styles.brandTagline}>Career Prep Services</p>
          </div>
        </div>

        <div
          className={styles.userArea}
          onClick={onProfileClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && onProfileClick) {
              onProfileClick(e);
            }
          }}
        >
          <div className={styles.userText}>
            <p className={styles.userName}>{userName}</p>
            <p className={styles.userMeta}>{userRole}</p>
          </div>
          <div className={styles.avatar}>
            {profilePhoto ? (
              <img src={profilePhoto} alt={userName} />
            ) : (
              <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
                <circle cx="50" cy="50" r="50" fill="#b9bcc3" />
                <circle cx="50" cy="38" r="18" fill="#ffffff" />
                <ellipse cx="50" cy="85" rx="30" ry="22" fill="#ffffff" />
              </svg>
            )}
          </div>
          <button
            type="button"
            className={styles.burgerBtn}
            onClick={(e) => {
              e.stopPropagation(); // Stop click from triggering userArea profile click
              setMenuOpen((open) => {
                const next = !open;
                onMenuToggle?.(next);
                return next;
              });
            }}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "stretch",
              width: "36px",
              height: "26px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0",
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            <span />
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && navLinks.length > 0 && (
        <nav className={styles.navBar}>
          <button type="button" className={styles.chatIcon} aria-label="Messages">
            <img src={inboxIcon} alt="Messages" className={styles.inboxIcon} />
          </button>
          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                className={styles.navLinkButton}
                onClick={() => {
                  setMenuOpen(false);
                  if (onNavClick) {
                    onNavClick(link.label);
                  }
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className={styles.main}>
        {children ? (
          children
        ) : (
          <>
            <h1 className={styles.welcome}>Welcome {userName.split(" ")[0]}!</h1>

            <div className={styles.grid}>
              <div className={styles.leftColumn}>
                <section className={styles.container}>
                  <h2 className={styles.sectionTitle}>Upcoming Meetings</h2>
                  <div className={styles.sectionBoxLarge}>
                    {upcomingMeetings.length === 0 ? (
                      <p className={styles.emptyText}>No upcoming meetings yet.</p>
                    ) : (
                      upcomingMeetings.map((meeting) => (
                        <MeetingTile
                          key={meeting.id}
                          meeting={meeting}
                          onClick={(m) => setSelectedMeeting(m)}
                        />
                      ))
                    )}
                  </div>
                </section>

                <section className={styles.container}>
                  <h2 className={styles.sectionTitle}>Previous Meetings</h2>
                  <div className={styles.sectionBoxSmall}>
                    {previousMeetings.length === 0 ? (
                      <p className={styles.emptyText}>No previous meetings yet.</p>
                    ) : (
                      previousMeetings.map((meeting) => (
                        <MeetingTile
                          key={meeting.id}
                          meeting={meeting}
                          onClick={(m) => setSelectedMeeting(m)}
                        />
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className={styles.rightColumn}>
                <section className={styles.todoContainer}>
                  {!allCompleted && (
                    <>
                      <div className={styles.todoHeaderWrapper}>
                        <h2 className={styles.todoBoxTitle}>To-Do List</h2>
                      </div>
                      <div className={styles.todoList}>
                        {todoItems.map((item, index) => {
                          const isChecked = !!checked[index];
                          return (
                            <button
                              key={item}
                              type="button"
                              className={`${styles.todoItem} ${
                                isChecked ? styles.todoItemChecked : ""
                              }`}
                              onClick={() => toggleTodo(index)}
                              aria-pressed={isChecked}
                            >
                              <span
                                className={`${styles.todoCircle} ${
                                  isChecked ? styles.todoCircleChecked : ""
                                }`}
                              >
                                {isChecked && (
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#1d4360"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={styles.checkIcon}
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </span>
                              <span
                                className={
                                  isChecked ? styles.todoTextChecked : ""
                                }
                              >
                                {item}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </main>

      <MeetingDetailModal
        meeting={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        onReschedule={(m) => {
          setReschedulingMeeting(m);
          setSelectedMeeting(null);
        }}
        onCancelled={(m) => window.location.reload()}
      />

      {reschedulingMeeting && (
        <ScheduleMeeting
          professional={{
            id: reschedulingMeeting.professionalId,
            userId: reschedulingMeeting.professionalUserId,
            name: reschedulingMeeting.with,
            volunteeringFor: [],
          }}
          rescheduleMeetingId={reschedulingMeeting.id}
          onClose={() => setReschedulingMeeting(null)}
          onRescheduled={() => window.location.reload()}
        />
      )}
    </div>
  );
}