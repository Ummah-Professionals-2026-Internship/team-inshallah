// grid of mentor cards
import styles from "./ViewProfessionals.module.css";
import MentorCard from "./MentorCard";

const FILLER_MENTORS = [
  { id: 1, name: "Persons Full name", jobTitle: "Job name", summary: "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc.", photo: "", linkedin: "https://linkedin.com", website: "https://example.com", github: "https://github.com" },
  { id: 2, name: "Persons Full name", jobTitle: "Job name", summary: "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc.", photo: "", linkedin: "https://linkedin.com", website: "https://example.com", github: "https://github.com" },
  { id: 3, name: "Persons Full name", jobTitle: "Job name", summary: "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc.", photo: "", linkedin: "https://linkedin.com", website: "https://example.com", github: "https://github.com" },
  { id: 4, name: "Persons Full name", jobTitle: "Job name", summary: "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc.", photo: "", linkedin: "https://linkedin.com", website: "https://example.com", github: "https://github.com" },
  { id: 5, name: "Persons Full name", jobTitle: "Job name", summary: "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc.", photo: "", linkedin: "https://linkedin.com", website: "https://example.com", github: "https://github.com" },
  { id: 6, name: "Persons Full name", jobTitle: "Job name", summary: "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc.", photo: "", linkedin: "https://linkedin.com", website: "https://example.com", github: "https://github.com" },
];

export default function ViewProfessionals({ onClose, category = "business" }) {
  return (
    <div className={styles.panel}>
      {/* header row: title + close button */}
      <div className={styles.header}>
        <h1 className={styles.title}>View Professionals</h1>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      <h2 className={styles.subheading}>Mentors in {category}</h2>

      {/* grid of mentor cards - one MentorCard per mentor */}
      <div className={styles.grid}>
        {FILLER_MENTORS.map((mentor) => (
          <MentorCard
            key={mentor.id}
            name={mentor.name}
            jobTitle={mentor.jobTitle}
            summary={mentor.summary}
            photo={mentor.photo}
            linkedin={mentor.linkedin}
            website={mentor.website}
            github={mentor.github}
          />
        ))}
      </div>

      {/* page arrows - visual for now, will hook up to real pagination once mentor data comes from backend */}
      <div className={styles.pagination}>
        <button type="button" className={styles.arrowBtn} aria-label="Previous page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button type="button" className={styles.arrowBtn} aria-label="Next page">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}