import { useState, useEffect } from "react";
import "./StudentProfile.css";

// Student profile edit screen — wired to the backend.
//   GET  /api/student/profile  -> load current profile
//   PUT  /api/student/profile  -> save (multipart; profilePicture optional)
// Auth via Bearer token from localStorage ("token").

const API = "http://localhost:5050";

const REGIONS = ["US (+1)", "UK (+44)", "Canada (+1)", "Pakistan (+92)", "India (+91)", "Other"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Law", "Engineering", "Education", "Business", "Other"];
const ACADEMIC_STANDINGS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate Student", "Recent Graduate"];
const HEAR_ABOUT_OPTIONS = ["Word of Mouth", "Friend or family member", "My MSA", "Campus flyer or event", "LinkedIn", "Instagram", "Other"];

const REQUIRED = [
  ["name", "Name"],
  ["phone", "Phone Number"],
  ["gender", "Gender"],
  ["industry", "Industry"],
  ["major", "Major"],
  ["desiredCareer", "Desired Future Career"],
  ["academicStanding", "Academic Standing"],
  ["hearAbout", "How did you hear about this service"],
];

export default function StudentProfile({ onClose }) {
  const [form, setForm] = useState({
    name: "", email: "", region: "", phone: "", gender: "", industry: "",
    major: "", academicStanding: "", desiredCareer: "", currentJob: "",
    linkedin: "", website: "", github: "", other: "",
    aboutMe: "", otherInformation: "",
    resume: null, profilePicture: null,
    existingPicture: "", hearAbout: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error", msg: string }

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // ----- Load current profile on mount -----
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API}/api/student/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 404) return null; // no profile yet
        if (!res.ok) throw new Error("Failed to load profile");
        const body = await res.json();
        return body.profile;
      })
      .then((p) => {
        if (p) {
          const links = p.externalLinks || {};
          setForm((prev) => ({
            ...prev,
            name: p.name || "",
            phone: p.phone || "",
            gender: p.gender || "",
            industry: p.industry || "",
            major: p.major || "",
            academicStanding: p.academicStanding || "",
            desiredCareer: p.desiredFutureCareer || "",
            currentJob: p.currentJob || "",
            aboutMe: p.aboutMe || "",
            otherInformation: p.otherInformation || "",
            hearAbout: p.hearAboutService || "",
            linkedin: links.linkedin || "",
            website: links.website || "",
            github: links.github || "",
            other: links.other || "",
            existingPicture: p.profilePicture || "",
          }));
        }
      })
      .catch(() => setStatus({ type: "error", msg: "Could not load your profile." }))
      .finally(() => setLoading(false));
  }, []);

  // ----- Save -----
  async function handleSave() {
    // client-side required check
    const missing = REQUIRED.filter(([key]) => !String(form[key] || "").trim())
      .map(([, label]) => label);
    if (missing.length > 0) {
      setStatus({ type: "error", msg: `Please fill in: ${missing.join(", ")}` });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      // map UI field names -> backend field names
      fd.append("name", form.name);
      fd.append("phone", form.phone);
      fd.append("gender", form.gender);
      fd.append("industry", form.industry);
      fd.append("major", form.major);
      fd.append("desiredFutureCareer", form.desiredCareer);
      fd.append("currentJob", form.currentJob);
      fd.append("academicStanding", form.academicStanding);
      fd.append("hearAboutService", form.hearAbout);
      fd.append("otherInformation", form.otherInformation);
      fd.append("aboutMe", form.aboutMe);
      fd.append("linkedin", form.linkedin);
      fd.append("website", form.website);
      fd.append("github", form.github);
      fd.append("other", form.other);
      if (form.profilePicture) fd.append("profilePicture", form.profilePicture);

      const res = await fetch(`${API}/api/student/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type: browser sets it for FormData
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Save failed");
      setStatus({ type: "success", msg: body.message || "Profile updated successfully." });
      if (body.profile?.profilePicture) {
        update("existingPicture", body.profile.profilePicture);
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  // preview: newly-chosen file, else existing S3 url, else placeholder
  const previewSrc = form.profilePicture
    ? URL.createObjectURL(form.profilePicture)
    : form.existingPicture || "";

  if (loading) {
    return (
      <div className="sp-page">
        <div className="sp-modal">
          <div className="sp-content"><p>Loading your profile…</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-page">
      <div className="sp-modal">
        {/* ---------- Sidebar ---------- */}
        <aside className="sp-sidebar">
          <button type="button" className="sp-back" onClick={onClose}>← Back</button>
          <nav className="sp-nav">
            <button type="button" className="sp-nav-item sp-nav-active">
              <span className="sp-nav-icon" aria-hidden="true">◉</span> Profile
            </button>
            <button type="button" className="sp-nav-item">
              <span className="sp-nav-icon" aria-hidden="true">⚙</span> Settings
            </button>
            <button type="button" className="sp-nav-item">
              <span className="sp-nav-icon" aria-hidden="true">⏻</span> Logout
            </button>
          </nav>
        </aside>

        {/* ---------- Main content ---------- */}
        <section className="sp-content">
          <div className="sp-header">
            <h1 className="sp-title">Profile</h1>
            <button type="button" className="sp-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>

          {status && (
            <p className={status.type === "success" ? "sp-msg-success" : "sp-msg-error"}>
              {status.msg}
            </p>
          )}

          {/* Profile picture + External links */}
          <div className="sp-top-row">
            <div className="sp-picture-block">
              <div className="sp-avatar">
                {previewSrc ? (
                  <img src={previewSrc} alt="Profile preview" />
                ) : (
                  <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%" aria-hidden="true">
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
                  <input type="file" accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => update("profilePicture", e.target.files[0])} />
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

          {/* ---------- Basic Information ---------- */}
          <div className="sp-section">
            <h3 className="sp-section-title">Basic Information</h3>

            <div className="sp-field">
              <label>Name <span className="sp-req">*</span></label>
              <input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>

            <div className="sp-field">
              <label>Email <span className="sp-req">*</span></label>
              <div className="sp-email-row">
                <input value={form.email} onChange={(e) => update("email", e.target.value)} />
                <button type="button" className="sp-inline-btn">Edit</button>
              </div>
            </div>

            <div className="sp-field">
              <label>Phone Number <span className="sp-req">*</span></label>
              <div className="sp-phone-row">
                <select value={form.region} onChange={(e) => update("region", e.target.value)}>
                  <option value="">Select Region</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>

            <div className="sp-field">
              <label>Gender <span className="sp-req">*</span></label>
              <div className="sp-toggle" role="group" aria-label="Gender">
                <button type="button"
                  className={`sp-toggle-opt ${form.gender === "Brother" ? "sp-toggle-on" : ""}`}
                  onClick={() => update("gender", "Brother")}>Brother</button>
                <button type="button"
                  className={`sp-toggle-opt ${form.gender === "Sister" ? "sp-toggle-on" : ""}`}
                  onClick={() => update("gender", "Sister")}>Sister</button>
              </div>
            </div>

            <div className="sp-field">
              <label>Industry <span className="sp-req">*</span></label>
              <select value={form.industry} onChange={(e) => update("industry", e.target.value)}>
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* ---------- Student Details ---------- */}
          <div className="sp-section">
            <h3 className="sp-section-title">Student Details</h3>
            <div className="sp-grid">
              <div className="sp-field">
                <label>Major <span className="sp-req">*</span></label>
                <input value={form.major} onChange={(e) => update("major", e.target.value)} />
              </div>
              <div className="sp-field">
                <label>Academic Standing <span className="sp-req">*</span></label>
                <select value={form.academicStanding}
                  onChange={(e) => update("academicStanding", e.target.value)}>
                  <option value="">Select</option>
                  {ACADEMIC_STANDINGS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="sp-field">
                <label>Desired Future Career <span className="sp-req">*</span></label>
                <input value={form.desiredCareer}
                  onChange={(e) => update("desiredCareer", e.target.value)} />
              </div>
              <div className="sp-field">
                <label>Current Job</label>
                <input value={form.currentJob}
                  onChange={(e) => update("currentJob", e.target.value)} />
              </div>
            </div>
          </div>

          {/* ---------- Additional Information ---------- */}
          <div className="sp-section">
            <h3 className="sp-section-title">Additional Information</h3>
            <div className="sp-field">
              <label>About Me</label>
              <textarea rows="4" value={form.aboutMe}
                onChange={(e) => update("aboutMe", e.target.value)} />
            </div>
            <div className="sp-field">
              <label>Résumé</label>
              <input type="file" accept=".pdf,.doc,.docx"
                onChange={(e) => update("resume", e.target.files[0])} />
            </div>
            <div className="sp-field">
              <label>How did you hear about this service?</label>
              <select value={form.hearAbout} onChange={(e) => update("hearAbout", e.target.value)}>
                <option value="">Select</option>
                {HEAR_ABOUT_OPTIONS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}