import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import Dashboard from "./Dashboard";
import ProfessionalProfile from "./ProfessionalProfile";
import AvailabilityModal from "./AvailabilityModal";
import AvailabilityCalendar from "./AvailabilityCalendar";

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
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("home");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [availabilityStep, setAvailabilityStep] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);

  const adminToken = localStorage.getItem("adminToken");

  const exitImpersonation = () => {
    localStorage.setItem("token", adminToken);
    localStorage.removeItem("adminToken");
    navigate("/admin-dashboard");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/api/professional/profile`, {
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
      setAvailabilityStep("form");
    } else if (label === "Home") {
      setActiveView("home");
    }
  };

  const closeAvailabilityFlow = () => {
    setAvailabilityStep(null);
    setAvailabilityData(null);
  };

  const impersonationBanner = adminToken && (
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
  );

  if (availabilityStep === "calendar") {
    return (
      <>
        {impersonationBanner}
        <AvailabilityCalendar
          availability={availabilityData}
          onClose={closeAvailabilityFlow}
          userName={displayName}
          profilePhoto={profilePhoto}
        />
      </>
    );
  }

  return (
    <>
      {impersonationBanner}
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
      </Dashboard>

      {availabilityStep === "form" && (
        <AvailabilityModal
          onClose={closeAvailabilityFlow}
          onContinue={(data) => {
            setAvailabilityData(data);
            setAvailabilityStep("calendar");
          }}
        />
      )}
    </>
  );
}
