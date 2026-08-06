import { useState, useEffect, useCallback } from "react";
import styles from "./AdminMeetings.module.css";
import { API_BASE_URL } from "../config";


function formatDate(dateStr) {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusClass(status, isPast) {
  if (status === "cancelled") return styles.cardCancelled;
  if (status === "rescheduled") return styles.cardRescheduled;
  if (status === "completed" || isPast) return styles.cardCompleted;

  return styles.cardUpcoming;
}

function sortMeetings(list, sortBy) {
  const sorted = [...list];

  if (sortBy === "date-asc") {
    sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortBy === "date-desc") {
    sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (sortBy === "student-az") {
    sorted.sort((a, b) =>
      (a.studentName || "").localeCompare(b.studentName || "")
    );
  } else if (sortBy === "professional-az") {
    sorted.sort((a, b) =>
      (a.professionalName || "").localeCompare(
        b.professionalName || ""
      )
    );
  }

  return sorted;
}

export default function AdminMeetings({ onClose }) {
  const [meetings, setMeetings] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("date-asc");

  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [participantMeeting, setParticipantMeeting] = useState(null);

  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");

  const fetchMeetings = useCallback(async (type, status, search) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (type) params.append("type", type);
      if (status) params.append("status", status);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(
        `${API_BASE_URL}/api/admin/meetings?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch meetings: ${res.status}`);
      }

      const data = await res.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
      setError("Unable to load meetings.");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings(typeFilter, statusFilter, searchText);
  }, [typeFilter, statusFilter, searchText, fetchMeetings]);

  const handleJoinMeeting = (meeting) => {
    const meetingLink =
      meeting.link ||
      meeting.meetingLink ||
      meeting.meetingUrl ||
      meeting.joinLink ||
      meeting.zoomLink ||
      meeting.googleMeetLink;

    if (!meetingLink) {
      window.alert("No meeting link is available for this meeting.");
      return;
    }

    window.open(meetingLink, "_blank", "noopener,noreferrer");
  };

  const handleCancelMeeting = async (meeting) => {
    if (meeting.status === "cancelled") {
      window.alert("This meeting has already been cancelled.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel the meeting between ${meeting.studentName} and ${meeting.professionalName}?`
    );

    if (!confirmed) return;

    try {
      setCancellingId(meeting.id);
      setError("");

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/admin/meetings/${meeting.id}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Cancelled by admin",
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        throw new Error(
          body?.message || `Failed to cancel meeting: ${res.status}`
        );
      }

      setMeetings((currentMeetings) =>
        currentMeetings.map((currentMeeting) =>
          currentMeeting.id === meeting.id
            ? {
                ...currentMeeting,
                status: "cancelled",
                cancelReason: "Cancelled by admin",
                cancelledBy: "admin",
                cancelledAt: new Date().toISOString(),
              }
            : currentMeeting
        )
      );

      if (selectedMeeting?.id === meeting.id) {
        setSelectedMeeting((currentMeeting) => ({
          ...currentMeeting,
          status: "cancelled",
          cancelReason: "Cancelled by admin",
          cancelledBy: "admin",
          cancelledAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.error("Failed to cancel meeting:", err);
      setError(err.message || "Unable to cancel this meeting.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.topRow}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={onClose}
            aria-label="Back"
          >
            ←
          </button>

          <div className={styles.searchWrap}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>

            <input
              type="text"
              placeholder="All meetings - search by student, professional, or type"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.filterBar}>
          <span className={styles.filterLabel}>List view</span>

          <label className={styles.filterGroup}>
            Type:
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">All types</option>
              <option value="Résumé Review">Résumé Review</option>
              <option value="Mock Interview">Mock Interview</option>
              <option value="General Career Advice">
                Career Advice
              </option>
            </select>
          </label>

          <label className={styles.filterGroup}>
            Status:
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label className={styles.filterGroup}>
            Sort:
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="date-asc">Date ascending</option>
              <option value="date-desc">Date descending</option>
              <option value="student-az">Student (A-Z)</option>
              <option value="professional-az">
                Professional (A-Z)
              </option>
            </select>
          </label>
        </div>

        {error && (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        )}

        <div className={styles.list}>
          {loading && (
            <p className={styles.emptyText}>Loading meetings...</p>
          )}

          {!loading && meetings.length === 0 && (
            <p className={styles.emptyText}>
              No meetings found for this filter.
            </p>
          )}

          {!loading &&
            sortMeetings(meetings, sortBy).map((meeting) => {
              const isPast =
                new Date(meeting.date).getTime() < Date.now();

              const isCancelled =
                meeting.status === "cancelled";

              const meetingLink =
                meeting.meetingLink ||
                meeting.meetingUrl ||
                meeting.joinLink ||
                meeting.zoomLink ||
                meeting.googleMeetLink;

              return (
                <div
                  key={meeting.id}
                  className={styles.card}
                  onClick={() => setSelectedMeeting(meeting)}
                >
                  <div
                    className={`${styles.dateBox} ${statusClass(
                      meeting.status,
                      isPast
                    )}`}
                  >
                    <span className={styles.dateLabel}>
                      {formatDate(meeting.date)}
                    </span>

                    <span className={styles.timeLabel}>
                      {formatTime(meeting.date)}
                    </span>

                    {isCancelled && (
                      <span className={styles.statusTag}>
                        Cancelled
                      </span>
                    )}

                    {meeting.status === "rescheduled" && (
                      <span className={styles.statusTag}>
                        Rescheduled
                      </span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.names}>
                      {meeting.studentName} →{" "}
                      {meeting.professionalName}
                    </p>

                    <p
                      className={
                        isCancelled
                          ? styles.typeCrossed
                          : styles.type
                      }
                    >
                      {meeting.purpose}
                    </p>
                  </div>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="View meeting information"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedMeeting(meeting);
                      }}
                    >
                      <svg
                        className={styles.actionIcon}
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                      >
                        <circle cx="32" cy="32" r="27" />
                        <circle cx="32" cy="22" r="2.5" fill="currentColor" />
                        <path d="M32 29V43" strokeLinecap="round" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="View participant details"
                      onClick={(event) => {
                        event.stopPropagation();
                        setParticipantMeeting(meeting);
                      }}
                    >
                      <svg
                        className={styles.actionIcon}
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                      >
                        <circle cx="32" cy="32" r="27" />
                        <circle cx="32" cy="23" r="7" />
                        <path
                          d="M19 45C20.5 36.5 25.5 32 32 32C38.5 32 43.5 36.5 45 45"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="Join meeting"
                      disabled={isCancelled}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleJoinMeeting(meeting);
                      }}
                    >
                      <svg
                        className={styles.actionIcon}
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                      >
                        <circle cx="32" cy="32" r="27" />
                        <rect x="17" y="23" width="25" height="18" rx="4" />
                        <path
                          d="M42 28L50 24V40L42 36Z"
                          fill="currentColor"
                          stroke="none"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label="Cancel meeting"
                      disabled={isCancelled || cancellingId === meeting.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCancelMeeting(meeting);
                      }}
                    >
                      <svg
                        className={styles.actionIcon}
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                      >
                        <circle cx="32" cy="32" r="27" />
                        <path d="M22 22L42 42" strokeLinecap="round" />
                        <path d="M42 22L22 42" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {selectedMeeting && (
        <div
          className={styles.detailOverlay}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedMeeting(null);
          }}
        >
          <div
            className={styles.detailModal}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.detailCloseBtn}
              onClick={() => setSelectedMeeting(null)}
              aria-label="Close meeting details"
            >
              ×
            </button>

            <h2 className={styles.detailTitle}>
              Meeting Information
            </h2>

            <p className={styles.detailRow}>
              <strong>Student:</strong>{" "}
              {selectedMeeting.studentName}
            </p>

            <p className={styles.detailRow}>
              <strong>Professional:</strong>{" "}
              {selectedMeeting.professionalName}
            </p>

            <p className={styles.detailRow}>
              <strong>Type:</strong>{" "}
              {selectedMeeting.purpose}
            </p>

            <p className={styles.detailRow}>
              <strong>Status:</strong>{" "}
              {selectedMeeting.status || "upcoming"}
            </p>

            <p className={styles.detailRow}>
              <strong>When:</strong>{" "}
              {formatDate(selectedMeeting.date)},{" "}
              {formatTime(selectedMeeting.date)}
            </p>

            {selectedMeeting.notes && (
              <p className={styles.detailRow}>
                <strong>Notes:</strong>{" "}
                {selectedMeeting.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {participantMeeting && (
        <div
          className={styles.detailOverlay}
          onClick={(event) => {
            event.stopPropagation();
            setParticipantMeeting(null);
          }}
        >
          <div
            className={styles.detailModal}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.detailCloseBtn}
              onClick={() => setParticipantMeeting(null)}
              aria-label="Close participant details"
            >
              ×
            </button>

            <h2 className={styles.detailTitle}>
              Participant Details
            </h2>

            <h3>Student</h3>

            <p className={styles.detailRow}>
              <strong>Name:</strong>{" "}
              {participantMeeting.studentName ||
                "Not available"}
            </p>

            <p className={styles.detailRow}>
              <strong>Email:</strong>{" "}
              {participantMeeting.studentEmail ||
                "Not available"}
            </p>

            {participantMeeting.studentMajor && (
              <p className={styles.detailRow}>
                <strong>Major:</strong>{" "}
                {participantMeeting.studentMajor}
              </p>
            )}

            <h3>Professional</h3>

            <p className={styles.detailRow}>
              <strong>Name:</strong>{" "}
              {participantMeeting.professionalName ||
                "Not available"}
            </p>

            <p className={styles.detailRow}>
              <strong>Email:</strong>{" "}
              {participantMeeting.professionalEmail ||
                "Not available"}
            </p>

            {participantMeeting.professionalJobTitle && (
              <p className={styles.detailRow}>
                <strong>Job title:</strong>{" "}
                {participantMeeting.professionalJobTitle}
              </p>
            )}

            {participantMeeting.professionalCompany && (
              <p className={styles.detailRow}>
                <strong>Company:</strong>{" "}
                {participantMeeting.professionalCompany}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


