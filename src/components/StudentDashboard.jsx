// dashboard shown to students - wraps the shared Dashboard with their nav links + filler data
import Dashboard from "./Dashboard";

const STUDENT_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "View Professionals", href: "/professionals" },
];

const STUDENT_TODO = [
  "Finalize your Profile",
  "Navigate the dashboard",
  "Browse mentors",
];

const UPCOMING_MEETINGS = [
  { id: 1, with: "Ashar Faisal", date: "Jul 5, 2026 - 11:00 AM" },
];

const PREVIOUS_MEETINGS = [];

export default function StudentDashboard({ userName = "Maryam Khan" }) {
  return (
    <Dashboard
      userName={userName}
      userRole="Student"
      profilePhoto=""
      navLinks={STUDENT_NAV_LINKS}
      todoItems={STUDENT_TODO}
      upcomingMeetings={UPCOMING_MEETINGS}
      previousMeetings={PREVIOUS_MEETINGS}
    />
  );
}