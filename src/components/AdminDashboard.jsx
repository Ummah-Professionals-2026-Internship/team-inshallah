import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import ViewStudents from "./ViewStudents";
import ViewProfessionals from "./ViewProfessionals";
import styles from "./AdminDashboard.module.css";
import { API_BASE_URL } from "../config";
import chatIconSrc from "../assets/chaticon.svg";
import bellIconSrc from "../assets/newnotificon.svg";

const ADMIN_NAV_LINKS = ["View Students", "View Professionals"];

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.4" />
      <path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" strokeLinecap="round" />
      <path d="M14 14.5c2.5.2 4.5 2 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboard({ userName = "Admin" }) {
  const [activeView, setActiveView] = useState("home");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/api/admin/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.profile?.profilePicture) setProfilePhoto(body.profile.profilePicture);
        if (body?.profile?.name) setDisplayName(body.profile.name);
      })
      .catch(() => {});
  }, []);

  return (
    <Dashboard
      userName={displayName}
      userRole="Admin"
      profilePhoto={profilePhoto}
      navLinks={[]}
      todoItems={[]}
      upcomingMeetings={[]}
      previousMeetings={[]}
      onNavClick={() => {}}
      onMenuToggle={setIsMenuOpen}
      onProfileClick={() => setActiveView("profile")}
    >
      {isMenuOpen && (
        <nav className={styles.adminToolbar}>
          <div className={styles.leftIconsGroup}>
            <button type="button" className={styles.iconBtn} aria-label="Messages">
              <img src={chatIconSrc} alt="Messages" width="32" height="32" />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Notifications"
              style={{ position: "relative" }}
            >
              <img src={bellIconSrc} alt="Notifications" width="32" height="32" />
              <span className={styles.notificationDot} />
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Home"
              onClick={() => setActiveView("home")}
            >
              <PeopleIcon />
            </button>
          </div>

          <div className={styles.toolbarLinks}>
            {ADMIN_NAV_LINKS.map((label) => (
              <button
                key={label}
                type="button"
                className={styles.toolbarLinkButton}
                onClick={() => {
                  setActiveView(
                    label === "View Students" ? "students" : "professionals"
                  );
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {activeView === "students" && (
        <div className={styles.pagePadding}>
          <ViewStudents
            onClose={() => setActiveView("home")}
            onSelectStudent={(student) => console.log("Selected student:", student)}
          />
        </div>
      )}

      {activeView === "professionals" && (
        <div className={styles.pagePadding}>
          <ViewProfessionals
            onClose={() => setActiveView("home")}
            onSelectProfessional={(professional) => console.log("Selected professional:", professional)}
          />
        </div>
      )}

      {activeView === "home" && (
        <div className={styles.pagePadding}>
          <h1 className={styles.pageTitle}>Welcome {displayName.split(" ")[0]}!</h1>
          <div className={styles.homeGrid}>
            <div className={styles.leftColumn}>
              <h2 className={styles.sectionTitle}>Upcoming Meetings</h2>
              <div className={styles.sectionBox}>
                <p className={styles.emptyText}>It looks like you have no meetings.</p>
              </div>
              <h2 className={styles.sectionTitle}>Previous Meetings</h2>
              <div className={styles.sectionBox}>
                <p className={styles.emptyText}>It looks like you have no meetings.</p>
              </div>
            </div>
            <div className={styles.rightColumn}>
                <div className={styles.verticalBox}></div>
            </div>
          </div>
        </div>
      )}
    </Dashboard>
  );
}