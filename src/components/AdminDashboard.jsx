import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import ViewStudents from "./ViewStudents";
import ViewProfessionals from "./AdminViewProfessionals";
import AdminMeetings from "./AdminMeetings";
import styles from "./AdminDashboard.module.css";
import { API_BASE_URL } from "../config";
import chatIconSrc from "../assets/chaticon.svg";
import bellIconSrc from "../assets/newnotificon.svg";

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.4" />
      <path
        d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        strokeLinecap="round"
      />
      <path
        d="M14 14.5c2.5.2 4.5 2 4.5 4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatNotificationDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNotificationText(meeting) {
  const names = `${meeting.studentName || "Student"} and ${
    meeting.professionalName || "Professional"
  }`;

  if (meeting.status === "cancelled") {
    return `Meeting cancelled: ${names}`;
  }

  if (meeting.status === "rescheduled") {
    return `Meeting rescheduled: ${names}`;
  }

  if (meeting.status === "completed") {
    return `Meeting completed: ${names}`;
  }

  return `Upcoming meeting: ${names}`;
}

function getNotificationTimestamp(meeting) {
  if (meeting.status === "cancelled") {
    return (
      meeting.cancelledAt ||
      meeting.updatedAt ||
      meeting.createdAt ||
      meeting.date
    );
  }

  if (meeting.status === "rescheduled") {
    return (
      meeting.rescheduledAt ||
      meeting.updatedAt ||
      meeting.createdAt ||
      meeting.date
    );
  }

  if (meeting.status === "completed") {
    return (
      meeting.completedAt ||
      meeting.updatedAt ||
      meeting.createdAt ||
      meeting.date
    );
  }

  return meeting.createdAt || meeting.date;
}

function getNotificationTimeLabel(meeting) {
  if (meeting.status === "cancelled") return "Cancelled";
  if (meeting.status === "rescheduled") return "Rescheduled";
  if (meeting.status === "completed") return "Completed";
  return "Created";
}

export default function AdminDashboard({ userName = "Admin" }) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("home");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [adminEmail, setAdminEmail] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMeetings, setShowMeetings] = useState(false);

  const [showUsersMenu, setShowUsersMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) return;

    fetch(`${API_BASE_URL}/api/admin/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const profile = body?.profile || body || {};

        console.log("Admin profile response:", body);

        const resolvedName =
          profile.name ||
          profile.fullName ||
          profile.user?.name ||
          profile.user?.fullName ||
          userName;

        const resolvedEmail =
          profile.email ||
          profile.user?.email ||
          "";

        const resolvedPhoto =
          profile.profilePicture ||
          profile.photo ||
          profile.user?.profilePicture ||
          profile.user?.photo ||
          "";

        if (resolvedPhoto) {
          setProfilePhoto(resolvedPhoto);
        }

        if (resolvedName) {
          setDisplayName(resolvedName);
        }

        setAdminEmail(resolvedEmail);
      })
      .catch(() => {});
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      setNotificationsError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("You are not signed in.");
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/meetings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load notifications: ${res.status}`);
      }

      const data = await res.json();
      const recentMeetings = [...(data.meetings || [])]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6);

      setNotifications(recentMeetings);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotificationsError(
        err.message || "Unable to load notifications right now."
      );
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const closeToolbarMenus = () => {
    setShowUsersMenu(false);
    setShowNotifications(false);
  };

  const openView = (view) => {
    setActiveView(view);
    setShowMeetings(false);
    closeToolbarMenus();
  };

  const openMeetings = () => {
    setShowMeetings(true);
    closeToolbarMenus();
  };

  const handleNotificationsClick = () => {
    const nextValue = !showNotifications;

    setShowNotifications(nextValue);
    setShowUsersMenu(false);

    if (nextValue) {
      fetchNotifications();
    }
  };

  const handleUsersClick = () => {
    setShowUsersMenu((current) => !current);
    setShowNotifications(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    navigate("/", { replace: true });
  };

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
      onMenuToggle={(open) => {
        setIsMenuOpen(open);

        if (!open) {
          closeToolbarMenus();
        }
      }}
      onProfileClick={() => openView("profile")}
    >
      {isMenuOpen && (
        <nav className={styles.adminToolbar}>
          <div className={styles.leftIconsGroup}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Messages"
            >
              <img src={chatIconSrc} alt="" width="32" height="32" />
            </button>

            <div className={styles.toolbarMenuWrap}>
              <button
                type="button"
                className={`${styles.iconBtn} ${
                  showNotifications ? styles.iconBtnActive : ""
                }`}
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={handleNotificationsClick}
              >
                <img src={bellIconSrc} alt="" width="32" height="32" />

                {notifications.length > 0 && (
                  <span className={styles.notificationDot} />
                )}
              </button>

              {showNotifications && (
                <div className={styles.notificationMenu}>
                  <div className={styles.menuHeader}>
                    <h3>Notifications</h3>

                    <button
                      type="button"
                      className={styles.refreshButton}
                      onClick={fetchNotifications}
                    >
                      Refresh
                    </button>
                  </div>

                  {notificationsLoading && (
                    <p className={styles.menuEmpty}>Loading notifications...</p>
                  )}

                  {!notificationsLoading && notificationsError && (
                    <p className={styles.menuError}>{notificationsError}</p>
                  )}

                  {!notificationsLoading &&
                    !notificationsError &&
                    notifications.length === 0 && (
                      <p className={styles.menuEmpty}>
                        You have no meeting notifications.
                      </p>
                    )}

                  {!notificationsLoading &&
                    !notificationsError &&
                    notifications.map((meeting) => (
                      <button
                        key={meeting.id}
                        type="button"
                        className={styles.notificationItem}
                        onClick={openMeetings}
                      >
                        <span className={styles.notificationText}>
                          {getNotificationText(meeting)}
                        </span>

                        <span className={styles.notificationTime}>
                          {getNotificationTimeLabel(meeting)}{" "}
                          {formatNotificationDate(
                            getNotificationTimestamp(meeting)
                          )}
                        </span>
                      </button>
                    ))}

                  <button
                    type="button"
                    className={styles.viewAllButton}
                    onClick={openMeetings}
                  >
                    View all meetings
                  </button>
                </div>
              )}
            </div>

            <div className={styles.toolbarMenuWrap}>
              <button
                type="button"
                className={`${styles.iconBtn} ${
                  showUsersMenu ? styles.iconBtnActive : ""
                }`}
                aria-label="Users"
                aria-expanded={showUsersMenu}
                onClick={handleUsersClick}
              >
                <PeopleIcon />
              </button>

              {showUsersMenu && (
                <div className={styles.usersMenu}>
                  <button
                    type="button"
                    className={styles.usersMenuItem}
                    onClick={() => openView("students")}
                  >
                    View Students
                  </button>

                  <button
                    type="button"
                    className={styles.usersMenuItem}
                    onClick={() => openView("professionals")}
                  >
                    View Professionals
                  </button>

                  <button
                    type="button"
                    className={styles.usersMenuItem}
                    onClick={openMeetings}
                  >
                    View Meetings
                  </button>
                </div>
              )}
            </div>
          </div>

        </nav>
      )}

      {activeView === "students" && (
        <div className={styles.pagePadding}>
          <ViewStudents
            onClose={() => openView("home")}
            onSelectStudent={(student) =>
              console.log("Selected student:", student)
            }
          />
        </div>
      )}

      {activeView === "professionals" && (
        <div className={styles.pagePadding}>
          <ViewProfessionals
            onClose={() => openView("home")}
            onSelectProfessional={(professional) =>
              console.log("Selected professional:", professional)
            }
          />
        </div>
      )}


      {activeView === "profile" && (
        <div className={styles.adminProfilePage}>
          <aside className={styles.adminProfileSidebar}>
            <div className={styles.adminIdentity}>
              <div className={styles.adminSidebarAvatar}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt={displayName} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <p className={styles.adminSidebarName}>{displayName}</p>
            </div>

            <nav className={styles.adminProfileNav}>
              <button
                type="button"
                className={`${styles.adminProfileNavItem} ${styles.adminProfileNavItemActive}`}
              >
                Profile
              </button>

              <button
                type="button"
                className={styles.adminProfileNavItem}
                onClick={handleLogout}
              >
                Logout
              </button>
            </nav>
          </aside>

          <section className={styles.adminProfileContent}>
            <div className={styles.adminProfileHeader}>
              <h1>Profile</h1>
              <button
                type="button"
                className={styles.adminProfileClose}
                onClick={() => openView("home")}
                aria-label="Close profile"
              >
                ×
              </button>
            </div>

            <div className={styles.adminProfilePhotoSection}>
              <div className={styles.adminProfilePhoto}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt={displayName} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <h2>Profile Picture</h2>
                <p>Admin account photo</p>
              </div>
            </div>

            <div className={styles.adminProfileFields}>
              <div className={styles.adminProfileField}>
                <label>Name</label>
                <div>{displayName || "Admin"}</div>
              </div>

              <div className={styles.adminProfileField}>
                <label>Email</label>
                <div>{adminEmail || "Email not available"}</div>
              </div>

              <div className={styles.adminProfileField}>
                <label>Role</label>
                <div>Admin</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeView === "home" && (
        <div className={styles.pagePadding}>
          <h1 className={styles.pageTitle}>
            Welcome {displayName.split(" ")[0]}!
          </h1>

          <div className={styles.homeGrid}>
            <div className={styles.leftColumn}>
              <h2 className={styles.sectionTitle}>Upcoming Meetings</h2>

              <div className={styles.sectionBox}>
                <p className={styles.emptyText}>
                  It looks like you have no meetings.
                </p>
              </div>

              <h2 className={styles.sectionTitle}>Previous Meetings</h2>

              <div className={styles.sectionBox}>
                <p className={styles.emptyText}>
                  It looks like you have no meetings.
                </p>
              </div>
            </div>

            <div className={styles.rightColumn}>
              <div className={styles.verticalBox} />
            </div>
          </div>
        </div>
      )}

      {showMeetings && (
        <AdminMeetings onClose={() => setShowMeetings(false)} />
      )}
    </Dashboard>
  );
}
