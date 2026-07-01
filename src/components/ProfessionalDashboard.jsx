// dashboard shown to professionals - wraps the shared Dashboard with their nav links + filler data
import Dashboard from "./Dashboard";

const PROFESSIONAL_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "View Professionals", href: "/professionals" },
];

const PROFESSIONAL_TODO = [
  "Finalize your Profile",
  "Navigate the dashboard",
  "Update your availability",
];

const UPCOMING_MEETINGS = [];

const PREVIOUS_MEETINGS = [];

export default function ProfessionalDashboard({ userName = "Ashar Faisal" }) {
  return (
    <Dashboard
      userName={userName}
      userRole="Professional"
      profilePhoto=""
      navLinks={PROFESSIONAL_NAV_LINKS}
      todoItems={PROFESSIONAL_TODO}
      upcomingMeetings={UPCOMING_MEETINGS}
      previousMeetings={PREVIOUS_MEETINGS}
    />
  );
}