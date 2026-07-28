import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import ProfessionalProfile from "./ProfessionalProfile";
import AvailabilityModal from "./AvailabilityModal";
import AvailabilityCalendar from "./AvailabilityCalendar";

// Transforms a meeting from the API into the shape MeetingTile expects.
function transformMeeting(m) {
  const d = new Date(m.date);
  let tileStatus = m.status;
  if (m.status === "scheduled") tileStatus = "upcoming";

  return {
    id: m._id,
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
  const [activeView, setActiveView] = useState("home");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [availabilityStep, setAvailabilityStep] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [previousMeetings, setPreviousMeetings] = useState([]);

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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5050/api/meetings", {
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

  if (availabilityStep === "calendar") {
    return (
      <AvailabilityCalendar
        availability={availabilityData}
        onClose={closeAvailabilityFlow}
        userName={displayName}
        profilePhoto={profilePhoto}
      />
    );
  }

  return (
    <>
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
