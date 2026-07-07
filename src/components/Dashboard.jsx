/// shared dashboard layout - used by both the professional and student dashboards
import { useState } from "react";
import styles from "./Dashboard.module.css";
import logoFull from "../assets/Brand Kit/Logos/PNGs/horizontal blue.png";
import inboxIcon from "../assets/inbox chat button.png";

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
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checked, setChecked] = useState({});

  const toggleTodo = (index) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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
    if (e.key === "Enter" || e.key === " ") {
      onProfileClick?.();
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
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
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
                        <div key={meeting.id} className={styles.meetingRow}>
                          <p className={styles.meetingName}>{meeting.with}</p>
                          <p className={styles.meetingDate}>{meeting.date}</p>
                        </div>
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
                        <div key={meeting.id} className={styles.meetingRow}>
                          <p className={styles.meetingName}>{meeting.with}</p>
                          <p className={styles.meetingDate}>{meeting.date}</p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className={styles.rightColumn}>
                <section className={styles.todoContainer}>
                  <div className={styles.todoHeaderWrapper}>
                    <h2 className={styles.todoBoxTitle}>To-Do List</h2>
                  </div>
                  <div className={styles.todoList}>
                    {todoItems.map((item, index) => (
                      <button
                        key={item}
                        type="button"
                        className={styles.todoItem}
                        onClick={() => toggleTodo(index)}
                        aria-pressed={!!checked[index]}
                      >
                        <span
                          className={`${styles.todoCircle} ${
                            checked[index] ? styles.todoCircleChecked : ""
                          }`}
                        />
                        <span className={checked[index] ? styles.todoTextChecked : ""}>
                          {item}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}