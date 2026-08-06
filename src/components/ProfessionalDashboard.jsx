import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import Dashboard from "./Dashboard";
import ProfessionalProfile from "./ProfessionalProfile";
import AvailabilityModal from "./AvailabilityModal";
import AvailabilityCalendar from "./AvailabilityCalendar";

// Transforms a meeting from the API into the shape MeetingTile expects.
function transformMeeting(m) {
  const d = new Date(m.date);
  let tileStatus = m.status;
  const inPast = new Date(m.date) < new Date();
  if (m.status === "scheduled") {
    tileStatus = inPast ? "completed" : "upcoming";
  }
  
  return {
    id: m._id,
    professionalUserId: m.professional?.user,
    professionalId: m.professional?._id,
    with: m.student?.name || "Unknown",
    day: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    type: m.purpose || "Meeting",
    status: tileStatus,
    link: m.link || "",
    notes: m.notes || "",
    rawDate: d,
  };
}

const PROFESSIONAL_NAV_LINKS = [
  { label: "Home" },
  { label: "Update Availability" },
];

const PROFESSIONAL_TODO = [
  "Finalize your Profile",
  "Navigate the dashboard",
  "Update your availability",
];


export default function ProfessionalDashboard({ userName = " " }) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("home");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [availabilityStep, setAvailabilityStep] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [previousMeetings, setPreviousMeetings] = useState([]);

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE_URL}/api/meetings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { meetings: [] }))
      .then((body) => {
        const now = new Date();
        const all = (body.meetings || []).map(transformMeeting);
        setUpcomingMeetings(all.filter((m) => m.rawDate >= now));
        setPreviousMeetings(all.filter((m) => m.rawDate < now));
      })
      .catch(() => {});
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
        upcomingMeetings={upcomingMeetings}
        previousMeetings={previousMeetings}
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
