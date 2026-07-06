// dashboard shown to students - wraps the shared Dashboard with their nav links + filler data
import { useState } from "react";
import Dashboard from "./Dashboard";
import ViewProfessionals from "./ViewProfessionals"; // Imports your existing component

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

export default function StudentDashboard({ userName = "Maryam Khan" }) {
  const [view, setView] = useState("dashboard"); // 'dashboard' or 'professionals'

  const handleNavClick = (label) => {
    console.log("Navigation link clicked:", label);
    if (label === "View Professionals") {
      setView("professionals");
    } else if (label === "Home") {
      setView("dashboard");
    }
  };

  return (
    <Dashboard
      userName={userName}
      userRole="Student"
      profilePhoto=""
      navLinks={STUDENT_NAV_LINKS}
      todoItems={STUDENT_TODO}
      upcomingMeetings={UPCOMING_MEETINGS}
      previousMeetings={PREVIOUS_MEETINGS}
      onNavClick={handleNavClick}
    >
      {view === "professionals" ? (
        <ViewProfessionals onClose={() => setView("dashboard")} category="business" />
      ) : null}
    </Dashboard>
  );
}