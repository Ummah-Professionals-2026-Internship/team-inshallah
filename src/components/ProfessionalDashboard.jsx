import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import ProfessionalProfile from "./ProfessionalProfile";
import AvailabilityModal from "./AvailabilityModal";

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

export default function ProfessionalDashboard({ userName = " " }) {
  const [activeView, setActiveView] = useState("home");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5050/api/professional/profile", {
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
      .catch(() => { });
  }, []);

  const handleNavClick = (label) => {
    if (label === "Update Availability") {
      setActiveView("availability");
    } else if (label === "Home") {
      setActiveView("home");
    }
  };

  
  return (
    <Dashboard
      userName={displayName}
      userRole="Professional"
      profilePhoto={profilePhoto}
      navLinks={PROFESSIONAL_NAV_LINKS}
      todoItems={PROFESSIONAL_TODO}
      upcomingMeetings={UPCOMING_MEETINGS}
      previousMeetings={PREVIOUS_MEETINGS}
      onNavClick={handleNavClick}
      onProfileClick={() => setActiveView("profile")}
    >
      {activeView === "profile" ? (
        <ProfessionalProfile onClose={() => setActiveView("home")} />
      ) : null}

      {activeView === "availability" && (
        <AvailabilityModal onClose={() => setActiveView("home")} />
      )}
    </Dashboard>
  );
}