// dashboard shown to students - wraps the shared Dashboard with their nav links + filler data
import { useState, useEffect } from "react";
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
  const [view, setView] = useState("dashboard"); // 'dashboard' or 'professionals'
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5050/api/student/profile", {
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
  );
}