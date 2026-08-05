import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ViewStudents.module.css";
import { API_BASE_URL } from "../config";

export default function ViewStudents({ onClose, onSelectStudent }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [industryFilter, setIndustryFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStudents = useCallback(async (industry, search) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: 1, limit: 12 });
      if (industry) params.append("industry", industry);
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE_URL}/api/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(industryFilter, searchText);
  }, [industryFilter, searchText, fetchStudents]);

  const handleCardClick = (student) => {
    setSelectedStudent(student);
    if (onSelectStudent) onSelectStudent(student);
  };

  const handleViewDashboard = async (student) => {
    try {
      const adminToken = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/impersonate/${student.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Could not view this student's dashboard.");
        return;
      }
      localStorage.setItem("adminToken", adminToken);
      localStorage.setItem("token", data.token);
      navigate("/student-dashboard");
    } catch (err) {
      alert("Something went wrong.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>View Students</h1>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          X
        </button>
      </div>

      <div className={styles.controlsRow}>
        <select
          className={styles.dropdown}
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
        >
          <option value="">All Students</option>
          <option value="Technology">Technology</option>
          <option value="Finance">Finance</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Law">Law</option>
          <option value="Engineering">Engineering</option>
          <option value="Education">Education</option>
          <option value="Business">Business</option>
          <option value="Other">Other</option>
        </select>

        {searchOpen ? (
          <input
            type="text"
            autoFocus
            className={styles.searchInput}
            placeholder="Search by name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onBlur={() => {
              if (!searchText) setSearchOpen(false);
            }}
          />
        ) : (
          <button
            type="button"
            className={styles.searchBtn}
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {students.map((student, index) => (
          <div key={student.id || index} className={styles.card} onClick={() => handleCardClick(student)}>
            <div className={styles.avatarBox}>
              {student.photo ? (
                <img src={student.photo} alt={student.name} className={styles.avatarImg} />
              ) : null}
            </div>

            <div className={styles.cardDetails}>
              <div>
                <h3 className={styles.studentName}>{student.name || "Persons Full name"}</h3>
                <p className={styles.jobTitle}>{student.jobName || "Job name"}</p>
                <p className={styles.summaryText}>
                  {student.summary ||
                    "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc."}
                </p>
              </div>

              <div className={styles.socialIcons}>
                {student.linkedin && (
                  <a
                    href={student.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkBtn}
                    aria-label={`${student.name}'s LinkedIn`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                    </svg>
                  </a>
                )}
                {student.website && (
                  <a
                    href={student.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkBtn}
                    aria-label={`${student.name}'s website`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </a>
                )}
                {student.github && (
                  <a
                    href={student.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkBtn}
                    aria-label={`${student.name}'s GitHub`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
                    </svg>
                  </a>
                )}
                <button
                  type="button"
                  className={styles.moreBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(student);
                  }}
                  aria-label={`More about ${student.name}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.backNavBtn} onClick={onClose} aria-label="Go back">
        ‹
      </button>

      {selectedStudent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedStudent(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setSelectedStudent(null)}
              aria-label="Close"
            >
              X
            </button>

            <div className={styles.modalAvatarSection}>
              <p className={styles.modalAvatarLabel}>Profile Picture</p>
              <div className={styles.modalAvatarCircle}>
                {selectedStudent.photo ? (
                  <img src={selectedStudent.photo} alt={selectedStudent.name} className={styles.modalAvatarImg} />
                ) : (
                  <svg viewBox="0 0 100 100" fill="none" width="60%" height="60%">
                    <circle cx="50" cy="38" r="18" fill="#ffffff" />
                    <ellipse cx="50" cy="85" rx="30" ry="22" fill="#ffffff" />
                  </svg>
                )}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Name</label>
              <div className={styles.modalValueBox}>{selectedStudent.name || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Email</label>
              <div className={styles.modalValueBox}>{selectedStudent.email || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Phone Number</label>
              <div className={styles.modalValueBox}>{selectedStudent.phone || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Industry</label>
              <div className={styles.modalValueBox}>{selectedStudent.industry || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Major</label>
              <div className={styles.modalValueBox}>{selectedStudent.major || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Desired Future Career</label>
              <div className={styles.modalValueBox}>{selectedStudent.desiredFutureCareer || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Current job if applicable</label>
              <div className={styles.modalValueBox}>{selectedStudent.currentJob || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Academic Standing</label>
              <div className={styles.modalValueBox}>{selectedStudent.academicStanding || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Résumé</label>
              {selectedStudent.resume ? (
                <a
                  href={selectedStudent.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.modalResumeRow}
                >
                  <span className={styles.modalResumeIcon}>📄</span>
                  <span className={styles.modalResumeName}>Resume</span>
                  <span className={styles.modalResumeEye}>👁</span>
                </a>
              ) : (
                <div className={styles.modalValueBox}>No résumé uploaded</div>
              )}
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Other Information</label>
              <div className={styles.modalTextarea}>
                {selectedStudent.otherInformation || "No additional information provided."}
              </div>
            </div>

            <div className={styles.modalActions}>
              <p className={styles.modalActionsLabel}>Actions</p>
              <div className={styles.modalActionButtons}>
                <button type="button" className={styles.modalActionBtn}>Chat</button>
                <button
                  type="button"
                  className={styles.modalActionBtn}
                  onClick={() => handleViewDashboard(selectedStudent)}
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}