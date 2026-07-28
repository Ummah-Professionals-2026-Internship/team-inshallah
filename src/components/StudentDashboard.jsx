// dashboard shown to students - wraps the shared Dashboard with their nav links + filler data
import { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import ViewProfessionals from "./ViewProfessionals"; // Imports your existing component
import StudentProfile from "./StudentProfile";


// Transforms a meeting from the API into the shape MeetingTile expects.
function transformMeeting(m) {
  const d = new Date(m.date);
  let tileStatus = m.status;
  if (m.status === "scheduled") tileStatus = "upcoming";

  return {
    id: m._id,
    with: m.professional?.name || "Unknown",
    day: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    type: m.purpose || "Meeting",
    status: tileStatus,
    link: m.link || "",
    notes: m.notes || "",
    rawDate: d,
  };
}


const STUDENT_NAV_LINKS = [
  { label: "Home" },
  { label: "View Professionals" },
];

const STUDENT_TODO = [
  "Finalize your Profile",
  "Navigate the dashboard",
  "Schedule your first meeting",
];


export default function StudentDashboard({ userName = " " }) {
  const [view, setView] = useState("dashboard"); // 'dashboard' or 'professionals'
  const [profilePhoto, setProfilePhoto] = useState("");
  const [displayName, setDisplayName] = useState(userName);

  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [previousMeetings, setPreviousMeetings] = useState([]);


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
      upcomingMeetings={upcomingMeetings}
      previousMeetings={previousMeetings}
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
