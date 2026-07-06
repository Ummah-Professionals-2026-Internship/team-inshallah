import { useState } from "react";
import Dashboard from "./Dashboard";

const PROFESSIONAL_NAV_LINKS = [
  { label: "Home" },
  { label: "Update Availability" },
];

const PROFESSIONAL_TODO = [
  "Finalize your Profile",
  "Navigate the dashboard",
  "Update your availability",
];

const UPCOMING_MEETINGS = [];
const PREVIOUS_MEETINGS = [];

export default function ProfessionalDashboard({ userName = "Ashar Faisal" }) {
  const [activeView, setActiveView] = useState("home");

  const handleNavClick = (label) => {
    if (label === "Update Availability") {
      setActiveView("availability");
    } else if (label === "Home") {
      setActiveView("home");
    }
  };

  return (
    <Dashboard
      userName={userName}
      userRole="Professional"
      profilePhoto=""
      navLinks={PROFESSIONAL_NAV_LINKS}
      todoItems={PROFESSIONAL_TODO}
      upcomingMeetings={UPCOMING_MEETINGS}
      previousMeetings={PREVIOUS_MEETINGS}
      onNavClick={handleNavClick}
    >
      {activeView === "availability" ? (
        <div style={{ padding: "24px" }}>
          <h1 style={{ color: "#0a7ea4", fontFamily: "Montserrat, sans-serif" }}>
            Update Availability
          </h1>
          <p>Coming soon — this page is still being built.</p>
        </div>
      ) : null}
    </Dashboard>
  );
}