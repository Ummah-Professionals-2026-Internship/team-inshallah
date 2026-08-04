// dashboard shown to students - wraps the shared Dashboard with their nav links + filler data
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import Dashboard from "./Dashboard";
import ViewProfessionals from "./ViewProfessionals"; // Imports your existing component
import StudentProfile from "./StudentProfile";

const STUDENT_NAV_LINKS = [
  { label: "Home" },
  { label: "View Professionals" },
];

const STUDENT_TODO = [
  "Finalize your Profile",
  "Navigate the dashboard",
  "Schedule your first meeting",
];

const UPCOMING_MEETINGS = [];
const PREVIOUS_MEETINGS = [];

export default function StudentDashboard({ userName = " " }) {
  const navigate = useNavigate();
  const [view, setView] = useState("dashboard"); // 'dashboard' or 'professionals'
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);

  const adminToken = localStorage.getItem("adminToken");

  const exitImpersonation = () => {
    localStorage.setItem("token", adminToken);
    localStorage.removeItem("adminToken");
    navigate("/admin-dashboard");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.profile?.profilePicture) {
          setProfilePhoto(body.profile.profilePicture);
        }
        if (body?.profile?.name) {
          setDisplayName(body.profile.name);
        }
      })
      .catch(() => {});
  }, []);
  const handleNavClick = (label) => {
  console.log("Navigation link clicked:", label);

  if (label === "View Professionals") {
    setView("professionals");
  } else if (label === "Home") {
    setView("dashboard");
  } else if (label === "My Profile") {
    setView("profile");
  }
};
  return (
    <>
      {adminToken && (
        <div
          style={{
            background: "#fdbb37",
            padding: "10px 20px",
            textAlign: "center",
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          Viewing as {displayName} (Admin mode) —{" "}
          <button
            type="button"
            onClick={exitImpersonation}
            style={{
              fontWeight: 700,
              cursor: "pointer",
              background: "none",
              border: "none",
              textDecoration: "underline",
              color: "#1a1a1a",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            Exit
          </button>
        </div>
      )}
      <Dashboard
        userName={displayName}
        userRole="Student"
        profilePhoto={profilePhoto}
        navLinks={STUDENT_NAV_LINKS}
        todoItems={STUDENT_TODO}
        upcomingMeetings={UPCOMING_MEETINGS}
        previousMeetings={PREVIOUS_MEETINGS}
        onNavClick={handleNavClick}
        onProfileClick={() => setView("profile")}
       >
        {view === "professionals" ? (
          <ViewProfessionals onClose={() => setView("dashboard")} category="business" />  
        ) : view === "profile" ? (
          <StudentProfile onClose={() => setView("dashboard")} />
        ) : null}
      </Dashboard>
    </>
  );
}
