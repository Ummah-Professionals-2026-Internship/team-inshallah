import { useState } from "react";
import { API_BASE_URL } from "../config";
import styles from "./FeedbackModal.module.css";

const SCALE = ["Very bad", "Poor", "Medium", "Good", "Excellent"];
const SCALE_COLORS = ["#e74c3c", "#e67e22", "#f1c40f", "#7dc855", "#1e8449"];

function getQuestions(role) {
  if (role === "professional") {
    return [
      { key: "meetingRating", label: "How was your meeting?" },
      { key: "needsMetRating", label: "How well were the student's needs met?" },
      { key: "mentorRating", label: "How was the student?" },
    ];
  }
  return [
    { key: "meetingRating", label: "How was your meeting?" },
    { key: "needsMetRating", label: "How well were your needs met?" },
    { key: "mentorRating", label: "How helpful was your mentor?" },
  ];
}

export default function FeedbackModal({ meeting, role = "student", onClose, onSubmitted }) {
    const questions = getQuestions(role);
    const [ratings, setRatings] = useState({
    meetingRating: 0,
    needsMetRating: 0,
    mentorRating: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!meeting) return null;

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/meetings/${meeting.id}/feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...ratings, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit feedback.");
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Feedback</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {questions.map((q) => (
            <div key={q.key} className={styles.question}>
              <p className={styles.questionLabel}>{q.label}</p>
              <div className={styles.scale}>
                {SCALE.map((label, i) => {
                  const value = i + 1;
                  const selected = ratings[q.key] === value;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={styles.scaleOption}
                      onClick={() => setRatings((prev) => ({ ...prev, [q.key]: value }))}
                    >
                      <span
                        className={styles.circle}
                        style={{
                          background: selected ? SCALE_COLORS[i] : undefined,
                        }}
                      />
                      <span className={styles.scaleLabel}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <p className={styles.questionLabel}>
            Feedback on the application or the overall scheduling process?
          </p>
          <textarea
            className={styles.commentInput}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />

          {error && <p className={styles.errorText}>{error}</p>}

          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

