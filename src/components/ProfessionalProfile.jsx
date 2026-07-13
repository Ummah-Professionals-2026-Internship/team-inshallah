import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import profileSettingIcon from "../assets/Profile setting icon.svg";
import settingsIcon from "../assets/Settings.svg";
import logoutIcon from "../assets/Logout icon.svg";

const API = "http://localhost:5050";

const REGIONS = ["+1", "+44", "+92", "+971", "+966", "+20", "+234"];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Law",
  "Engineering",
  "Education",
  "Business",
  "Other",
];

const EXPERIENCE_LEVELS = ["0-2 years", "3-5 years", "6-10 years", "10+ years"];

const VOLUNTEER_OPTIONS = [
  "Résumé Review",
  "Mock Interview",
  "General Career Advice",
];

const HEAR_ABOUT_OPTIONS = [
  "Word of Mouth",
  "Friend or family member",
  "My MSA",
  "Campus flyer or event",
  "LinkedIn",
  "Instagram",
  "Other",
];

const REQUIRED = [
  ["name", "Name"],
  ["phone", "Phone Number"],
  ["email", "Email"],
  ["gender", "Gender"],
  ["experienceLevel", "Experience Level"],
  ["employer", "Employer"],
  ["jobTitle", "Job Title"],
  ["industry", "Industry"],
  ["mentorOpposingGender", "Mentor Opposing Gender"],
  ["countyState", "County / State"],
  ["hearAboutService", "How did you hear about us"],
];

export default function ProfessionalProfile({ onClose }) {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneRegion: "+1",
    phone: "",
    gender: "",
    experienceLevel: "",
    employer: "",
    jobTitle: "",
    industry: "",
    volunteeringFor: [],
    major: "",
    almaMater: "",
    mentorOpposingGender: "",
    countyState: "",
    hearAboutService: "",
    otherInformation: "",
    aboutMe: "",

    linkedin: "",
    website: "",
    github: "",
    other: "",

    resume: null,
    existingResume: "",

    profilePicture: null,
    existingPicture: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [originalEmail, setOriginalEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleVolunteer = (option) => {
    setForm((prev) => {
      const selected = prev.volunteeringFor.includes(option);

      return {
        ...prev,
        volunteeringFor: selected
          ? prev.volunteeringFor.filter((item) => item !== option)
          : [...prev.volunteeringFor, option],
      };
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    let savedUser = {};
    try {
      savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      savedUser = {};
    }

    fetch(`${API}/api/professional/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));

        if (res.status === 404) return null;
        if (!res.ok) throw new Error(body.message || "Failed to load profile");

        return body.profile || body.professional || body.data || null;
      })
      .then((p) => {
        const links = p?.externalLinks || {};
        const loadedEmail = p?.user?.email || savedUser.email || "";

        setOriginalEmail(loadedEmail);

        setForm((prev) => ({
          ...prev,
          email: loadedEmail,
          name: p?.name || "",
          phone: p?.phone || "",
          gender: p?.gender || "",
          experienceLevel: p?.experienceLevel || "",
          employer: p?.employer || "",
          jobTitle: p?.jobTitle || "",
          industry: p?.industry || "",
          volunteeringFor: Array.isArray(p?.volunteeringFor)
            ? p.volunteeringFor
            : [],
          major: p?.major || "",
          almaMater: p?.almaMater || "",
          mentorOpposingGender: p?.mentorOpposingGender || "",
          countyState: p?.countyState || "",
          hearAboutService: p?.hearAboutService || "",
          otherInformation: p?.otherInformation || "",
          aboutMe: p?.aboutMe || "",

          linkedin: links.linkedin || "",
          website: links.website || "",
          github: links.github || "",
          other: links.other || "",

          existingResume: p?.resume || "",
          existingPicture: p?.profilePicture || "",
        }));
      })
      .catch((err) => {
        setStatus({
          type: "error",
          msg: err.message || "Could not load professional profile.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const missing = REQUIRED.filter(([key]) => !String(form[key] || "").trim()).map(
      ([, label]) => label
    );

    if (form.volunteeringFor.length === 0) {
      missing.push("Volunteering For");
    }

    if (missing.length > 0) {
      setStatus({
        type: "error",
        msg: `Please fill in: ${missing.join(", ")}`,
      });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();

      fd.append("name", form.name);
      fd.append("phone", form.phone);
      fd.append("gender", form.gender);
      fd.append("experienceLevel", form.experienceLevel);
      fd.append("employer", form.employer);
      fd.append("jobTitle", form.jobTitle);
      fd.append("industry", form.industry);
      fd.append("volunteeringFor", JSON.stringify(form.volunteeringFor));
      fd.append("major", form.major);
      fd.append("almaMater", form.almaMater);
      fd.append("mentorOpposingGender", form.mentorOpposingGender);
      fd.append("countyState", form.countyState);
      fd.append("hearAboutService", form.hearAboutService);
      fd.append("otherInformation", form.otherInformation);
      fd.append("aboutMe", form.aboutMe);

      fd.append("linkedin", form.linkedin);
      fd.append("website", form.website);
      fd.append("github", form.github);
      fd.append("other", form.other);

      if (form.profilePicture) {
        fd.append("profilePicture", form.profilePicture);
      }

      if (form.resume) {
        fd.append("resume", form.resume);
      }

      const res = await fetch(`${API}/api/professional/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || "Save failed");
      }

      const updatedProfile = body.profile || body.professional || body.data;

      if (updatedProfile?.profilePicture) {
        update("existingPicture", updatedProfile.profilePicture);
        update("profilePicture", null);
      }

      if (updatedProfile?.resume) {
        update("existingResume", updatedProfile.resume);
        update("resume", null);
      }

      setStatus({
        type: "success",
        msg: body.message || "Professional profile updated successfully.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        msg: err.message || "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  }

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("blob:")) return url;
    return `${API}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const previewSrc = form.profilePicture
    ? URL.createObjectURL(form.profilePicture)
    : getImageUrl(form.existingPicture);

  if (loading) {
    return (
      <div className="sp-page">
        <div className="sp-modal">
          <div className="sp-content">
            <p>Loading professional profile…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-page">
      {showLogoutConfirm && (
        <div className="sp-logout-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="sp-logout-box" onClick={(e) => e.stopPropagation()}>
            <p className="sp-logout-msg">Are you sure you want to log out?</p>
            <div className="sp-logout-actions">
              <button type="button" className="sp-logout-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="sp-logout-confirm" onClick={handleLogout}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="sp-modal">
        <aside className="sp-sidebar">
          <button type="button" className="sp-back" onClick={onClose}>
            ← Back
          </button>

          <nav className="sp-nav">
            <button type="button" className="sp-nav-item sp-nav-active">
              <span className="sp-nav-icon">
                <img src={profileSettingIcon} alt="Profile" />
              </span>
              Profile
            </button>

            <button type="button" className="sp-nav-item">
              <span className="sp-nav-icon">
                <img src={settingsIcon} alt="Settings" />
              </span>
              Settings
            </button>

            <button type="button" className="sp-nav-item" onClick={() => setShowLogoutConfirm(true)}>
              <span className="sp-nav-icon">
                <img src={logoutIcon} alt="Logout" />
              </span>
              Logout
            </button>
          </nav>
        </aside>

        <section className="sp-content">
          <div className="sp-header">
            <h1 className="sp-title">Professional Profile</h1>

            <button
              type="button"
              className="sp-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>

          {status && (
            <p className={status.type === "success" ? "sp-msg-success" : "sp-msg-error"}>
              {status.msg}
            </p>
          )}

          <div className="sp-top-row">
            <div className="sp-picture-block">
              <div className="sp-avatar">
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt=""
                    onError={() => update("existingPicture", "")}
                  />
                ) : (
                  <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
                    <circle cx="50" cy="50" r="50" fill="#b9bcc3" />
                    <circle cx="50" cy="38" r="18" fill="#ffffff" />
                    <ellipse cx="50" cy="85" rx="30" ry="22" fill="#ffffff" />
                  </svg>
                )}
              </div>

              <div className="sp-picture-text">
                <p className="sp-picture-label">Profile Picture</p>

                <label className="sp-edit-photo">
                  Edit Photo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => update("profilePicture", e.target.files[0])}
                  />
                </label>
              </div>
          </div>

          <div className="sp-links-block">
              <p className="sp-links-heading">External Links</p>

              <div className="sp-link-row">
                <span className="sp-link-icon sp-link-icon-linkedin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19">
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                  </svg>
                </span>
                <input placeholder="LinkedIn" value={form.linkedin}
                  onChange={(e) => update("linkedin", e.target.value)} />
              </div>

              <div className="sp-link-row">
                <span className="sp-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="19" height="19">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <input placeholder="Website" value={form.website}
                  onChange={(e) => update("website", e.target.value)} />
              </div>

              <div className="sp-link-row">
                <span className="sp-link-icon sp-link-icon-github" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19">
                    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
                  </svg>
                </span>
                <input placeholder="GitHub" value={form.github}
                  onChange={(e) => update("github", e.target.value)} />
              </div>

              <div className="sp-link-row">
                <span className="sp-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <input placeholder="Other link" value={form.other}
                  onChange={(e) => update("other", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="sp-section">
            <h3 className="sp-section-title">About</h3>

            <div className="sp-field">
              <label>About Me</label>
              <textarea
                rows="4"
                value={form.aboutMe}
                onChange={(e) => update("aboutMe", e.target.value)}
              />
            </div>
          </div>

          <div className="sp-section">
            <h3 className="sp-section-title">Basic Information</h3>

            <div className="sp-field">
              <label>
                Name <span className="sp-req">*</span>
              </label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div className="sp-field">
              <label>
                Email <span className="sp-req">*</span>
              </label>

              <div className="sp-email-row">
                <input
                  value={form.email}
                  disabled={!editingEmail}
                  onChange={(e) => update("email", e.target.value)}
                />

                <button
                  type="button"
                  className="sp-inline-btn"
                  onClick={() => {
                    if (editingEmail) {
                      update("email", originalEmail);
                      setEditingEmail(false);
                    } else {
                      setEditingEmail(true);
                    }
                  }}
                >
                  {editingEmail ? "Cancel" : "Edit"}
                </button>
              </div>
            </div>

            <div className="sp-field">
              <label>
                Phone Number <span className="sp-req">*</span>
              </label>

              <div className="sp-phone-row">
                <select
                  value={form.phoneRegion}
                  onChange={(e) => update("phoneRegion", e.target.value)}
                >
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>

                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>

            <div className="sp-field">
              <label>
                Gender <span className="sp-req">*</span>
              </label>

              <div className="sp-toggle">
                <button
                  type="button"
                  className={`sp-toggle-opt ${form.gender === "Brother" ? "sp-toggle-on" : ""}`}
                  onClick={() => update("gender", "Brother")}
                >
                  Brother
                </button>

                <button
                  type="button"
                  className={`sp-toggle-opt ${form.gender === "Sister" ? "sp-toggle-on" : ""}`}
                  onClick={() => update("gender", "Sister")}
                >
                  Sister
                </button>
              </div>
            </div>

            <div className="sp-field">
              <label>
                Experience Level <span className="sp-req">*</span>
              </label>

              <select
                value={form.experienceLevel}
                onChange={(e) => update("experienceLevel", e.target.value)}
              >
                <option value="">Select</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="sp-field">
              <label>
                Employer <span className="sp-req">*</span>
              </label>
              <input
                value={form.employer}
                onChange={(e) => update("employer", e.target.value)}
              />
            </div>

            <div className="sp-field">
              <label>
                Job Title <span className="sp-req">*</span>
              </label>
              <input
                value={form.jobTitle}
                onChange={(e) => update("jobTitle", e.target.value)}
              />
            </div>

            <div className="sp-field">
              <label>
                Industry <span className="sp-req">*</span>
              </label>

              <select value={form.industry} onChange={(e) => update("industry", e.target.value)}>
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sp-section">
            <h3 className="sp-section-title">Professional Details</h3>

            <div className="sp-field">
              <label>
                Volunteering For <span className="sp-req">*</span>
              </label>

              <div className="checkbox-group">
                {VOLUNTEER_OPTIONS.map((option) => (
                  <label key={option} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.volunteeringFor.includes(option)}
                      onChange={() => toggleVolunteer(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="sp-field">
              <label>Major</label>
              <input value={form.major} onChange={(e) => update("major", e.target.value)} />
            </div>

            <div className="sp-field">
              <label>Alma Mater</label>
              <input
                value={form.almaMater}
                onChange={(e) => update("almaMater", e.target.value)}
              />
            </div>

            <div className="sp-field">
              <label>
                Would you like to mentor students of the opposing gender?{" "}
                <span className="sp-req">*</span>
              </label>

              <div className="sp-toggle">
                <button
                  type="button"
                  className={`sp-toggle-opt ${
                    form.mentorOpposingGender === "Yes" ? "sp-toggle-on" : ""
                  }`}
                  onClick={() => update("mentorOpposingGender", "Yes")}
                >
                  Yes
                </button>

                <button
                  type="button"
                  className={`sp-toggle-opt ${
                    form.mentorOpposingGender === "No" ? "sp-toggle-on" : ""
                  }`}
                  onClick={() => update("mentorOpposingGender", "No")}
                >
                  No
                </button>
              </div>
            </div>

            <div className="sp-field">
              <label>Résumé</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => update("resume", e.target.files[0])}
              />
              
              {form.resume && <p>{form.resume.name}</p>}
               {!form.resume && form.existingResume && (  
                <p>
                  <a href={form.existingResume} target="_blank" rel="noreferrer" className="sp-resume-link">
                    View current résumé
                  </a>
                </p>
              )}
              </div>

            <div className="sp-field">
              <label>
                County / State <span className="sp-req">*</span>
              </label>
              <input
                value={form.countyState}
                onChange={(e) => update("countyState", e.target.value)}
              />
            </div>

            <div className="sp-field">
              <label>
                How did you hear about us? <span className="sp-req">*</span>
              </label>

              <select
                value={form.hearAboutService}
                onChange={(e) => update("hearAboutService", e.target.value)}
              >
                <option value="">Select</option>
                {HEAR_ABOUT_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="sp-field">
              <label>Other Information</label>
              <textarea
                rows="4"
                value={form.otherInformation}
                onChange={(e) => update("otherInformation", e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}