// shared dashboard layout - used by both the professional and student dashboards
// the role-specific wrapper components pass in their own todo items + nav links
import { useState } from "react";
import styles from "./Dashboard.module.css";
import logoFull from "../assets/Brand Kit/Logos/PNGs/horizontal blue.png";

export default function Dashboard({
  userName,
  userRole, // "Professional" or "Student"
  profilePhoto,
  navLinks, // array of { label, href }
  todoItems, // array of strings
  upcomingMeetings, // array of meeting objects
  previousMeetings,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checked, setChecked] = useState({});

  const toggleTodo = (index) => {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className={styles.page}>
      {/* header: logo, user info, burger button */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div>
            <img src={logoFull} alt="Ummah Professionals" className={styles.logoImg} />
            <p className={styles.brandTagline}>Career Prep Services</p>
          </div>
        </div>

        <div className={styles.userArea}>
          <a href="/profile" className={styles.userText}>
            <p className={styles.userName}>{userName}</p>
            <p className={styles.userMeta}>{userRole} &bull; View Profile</p>
          </a>
          <div className={styles.avatar}>
            {profilePhoto ? (
              <img src={profilePhoto} alt={userName} />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
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
          </button>
        </div>
      </header>

      {/* nav bar - only shows when burger button is clicked */}
      {menuOpen && (
        <nav className={styles.navBar}>
          <button type="button" className={styles.chatIcon} aria-label="Messages">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="32" height="32">
              <path d="M3 11a6 6 0 0 1 6-6h2a6 6 0 0 1 0 12H7l-4 3v-4a5.97 5.97 0 0 1-0-5z" />
              <line x1="6" y1="9" x2="13" y2="9" />
              <line x1="6" y1="12" x2="11" y2="12" />
              <rect x="13" y="13" width="9" height="6.5" rx="1" />
              <path d="M13 13.5l4.5 3 4.5-3" />
            </svg>
          </button>
          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* main content */}
      <main className={styles.main}>
        <h1 className={styles.welcome}>Welcome {userName.split(" ")[0]}!</h1>

        <div className={styles.grid}>
          <div className={styles.leftColumn}>
            <section className={styles.container}>
              <h2 className={styles.sectionTitle}>Upcoming Meetings</h2>
              <div className={styles.sectionBox}>
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
              <div className={styles.sectionBox}>
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

          {/* general use container - starts as a to-do list */}
          <section className={`${styles.container} ${styles.todoContainer}`}>
            <h2 className={styles.sectionTitle}>To-Do List</h2>
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
                  <span
                    className={checked[index] ? styles.todoTextChecked : ""}
                  >
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}