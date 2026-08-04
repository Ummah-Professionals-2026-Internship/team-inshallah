import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ViewProfessionals.module.css";
import { API_BASE_URL } from "../config";

export default function ViewProfessionals({ onClose, onSelectProfessional }) {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [industryFilter, setIndustryFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchProfessionals = useCallback(async (industry, search) => {
    try {
      const params = new URLSearchParams({ page: 1, limit: 12 });
      if (industry) params.append("industry", industry);
      if (search) params.append("search", search);

      const res = await fetch(`${API_BASE_URL}/api/professionals?${params}`);
      const data = await res.json();
      setProfessionals(data.professionals || []);
    } catch (err) {
      console.error("Error fetching professionals:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfessionals(industryFilter, searchText);
  }, [industryFilter, searchText, fetchProfessionals]);

  const handleCardClick = (professional) => {
    setSelectedProfessional(professional);
    if (onSelectProfessional) onSelectProfessional(professional);
  };

  const handleViewDashboard = async (professional) => {
    try {
      const adminToken = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/admin/impersonate-professional/${professional.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Could not view this professional's dashboard.");
        return;
      }
      localStorage.setItem("adminToken", adminToken);
      localStorage.setItem("token", data.token);
      navigate("/professional-dashboard");
    } catch (err) {
      alert("Something went wrong.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>View Professionals</h1>
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
          <option value="">All Professionals</option>
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
        {professionals.map((professional, index) => (
          <div key={professional.id || index} className={styles.card} onClick={() => handleCardClick(professional)}>
            <div className={styles.avatarBox}>
              {professional.photo ? (
                <img src={professional.photo} alt={professional.name} className={styles.avatarImg} />
              ) : null}
            </div>

            <div className={styles.cardDetails}>
              <div>
                <h3 className={styles.professionalName}>{professional.name || "Persons Full name"}</h3>
                <p className={styles.jobTitle}>{professional.jobTitle || "Job name"}</p>
                <p className={styles.summaryText}>
                  {professional.summary ||
                    "Summary of what they do, where they work, skills, certificates, what they do in their free time, etc."}
                </p>
              </div>

              <div className={styles.socialIcons}>
                {professional.linkedin && (
                  <a
                    href={professional.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkBtn}
                    aria-label={`${professional.name}'s LinkedIn`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                    </svg>
                  </a>
                )}
                {professional.website && (
                  <a
                    href={professional.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkBtn}
                    aria-label={`${professional.name}'s website`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                  </a>
                )}
                {professional.github && (
                  <a
                    href={professional.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkBtn}
                    aria-label={`${professional.name}'s GitHub`}
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
                    handleCardClick(professional);
                  }}
                  aria-label={`More about ${professional.name}`}
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

      {selectedProfessional && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProfessional(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={() => setSelectedProfessional(null)}
              aria-label="Close"
            >
              X
            </button>

            <div className={styles.modalAvatarSection}>
              <p className={styles.modalAvatarLabel}>Profile Picture</p>
              <div className={styles.modalAvatarCircle}>
                {selectedProfessional.photo ? (
                  <img src={selectedProfessional.photo} alt={selectedProfessional.name} className={styles.modalAvatarImg} />
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
              <div className={styles.modalValueBox}>{selectedProfessional.name || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Phone Number</label>
              <div className={styles.modalValueBox}>{selectedProfessional.phone || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Industry</label>
              <div className={styles.modalValueBox}>{selectedProfessional.industry || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Job Title</label>
              <div className={styles.modalValueBox}>{selectedProfessional.jobTitle || "—"}</div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>About Me</label>
              <div className={styles.modalTextarea}>
                {selectedProfessional.aboutMe || "No additional information provided."}
              </div>
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Résumé</label>
              {selectedProfessional.resume ? (
                <a
                  href={selectedProfessional.resume}
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
                {selectedProfessional.otherInformation || "No additional information provided."}
              </div>
            </div>

            <div className={styles.modalActions}>
              <p className={styles.modalActionsLabel}>Actions</p>
              <div className={styles.modalActionButtons}>
                <button type="button" className={styles.modalActionBtn}>Chat</button>
                <button
                  type="button"
                  className={styles.modalActionBtn}
                  onClick={() => handleViewDashboard(selectedProfessional)}
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