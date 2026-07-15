import { useState, useMemo } from "react";
import styles from "./AvailabilityModal.module.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const COMMON_TIMEZONES = [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Asia/Dubai", "Asia/Karachi", "Africa/Cairo",
];

function dateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// builds a Monday-first calendar grid, including leading/trailing days
// from adjacent months so every row has 7 cells
function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Sun=0 -> shift to Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        days.push({ day: d, inMonth: false, date: new Date(year, month - 1, d) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        days.push({ day: d, inMonth: true, date: new Date(year, month, d) });
    }
    let nextDay = 1;
    while (days.length % 7 !== 0) {
        days.push({ day: nextDay, inMonth: false, date: new Date(year, month + 1, nextDay) });
        nextDay++;
    }
    return days;
}

export default function AvailabilityModal({ onClose, onSave }) {
    const [viewMode, setViewMode] = useState("specific"); // "specific" | "weekly"
    const [cursor, setCursor] = useState(new Date()); // controls which month is shown
    const [selectedDates, setSelectedDates] = useState(new Set());
    const [selectedWeekdays, setSelectedWeekdays] = useState(new Set());
    const [timezone, setTimezone] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const days = useMemo(() => getCalendarDays(year, month), [year, month]);

    const goPrevMonth = () => setCursor(new Date(year, month - 1, 1));
    const goNextMonth = () => setCursor(new Date(year, month + 1, 1));

    const toggleDate = (date) => {
        const key = dateKey(date);
        setSelectedDates((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleWeekday = (day) => {
        setSelectedWeekdays((prev) => {
            const next = new Set(prev);
            if (next.has(day)) next.delete(day);
            else next.add(day);
            return next;
        });
    };

    const detectTimezone = () => {
        try {
            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        } catch {
            // ignore if unsupported
        }
    };

    const handleChangeAvailability = async () => {
        setError("");
        setSaving(true);
        try {
            const payload =
                viewMode === "specific"
                    ? { mode: "specific", dates: Array.from(selectedDates), timezone }
                    : { mode: "weekly", weekdays: Array.from(selectedWeekdays), timezone };

            const res = await fetch("http://localhost:5050/api/professional/availability", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to update availability.");
            }

            onSave?.(payload);
            onClose();
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close" type="button">
                    ✕
                </button>

                <h2 className={styles.title}>What dates might work?</h2>
                <p className={styles.subtitle}>Click to Change</p>

                {/* specific dates / days of the week toggle */}
                <div className={styles.toggleTrack}>
                    <button
                        type="button"
                        className={`${styles.toggleBtn} ${viewMode === "specific" ? styles.toggleBtnActive : ""}`}
                        onClick={() => setViewMode("specific")}
                    >
                        Specific Dates
                    </button>
                    <button
                        type="button"
                        className={`${styles.toggleBtn} ${viewMode === "weekly" ? styles.toggleBtnActive : ""}`}
                        onClick={() => setViewMode("weekly")}
                    >
                        Days of the week
                    </button>
                </div>

                {viewMode === "specific" ? (
                    <div className={styles.calendarCard}>
                        <div className={styles.calendarHeader}>
                            <button
                                type="button"
                                className={styles.navArrow}
                                onClick={goPrevMonth}
                                aria-label="Previous month"
                            >
                                ‹
                            </button>
                            <span className={styles.monthLabel}>
                                {MONTH_NAMES[month]} {year}
                            </span>
                            <button
                                type="button"
                                className={styles.navArrow}
                                onClick={goNextMonth}
                                aria-label="Next month"
                            >
                                ›
                            </button>
                        </div>

                        <div className={styles.weekdayRow}>
                            {WEEKDAYS.map((d) => (
                                <span key={d} className={styles.weekdayLabel}>{d}</span>
                            ))}
                        </div>

                        <div className={styles.daysGrid}>
                            {days.map(({ day, inMonth, date }, i) => {
                                const selected = selectedDates.has(dateKey(date));
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`${styles.dayCell} ${!inMonth ? styles.dayCellMuted : ""} ${selected ? styles.dayCellSelected : ""}`}
                                        onClick={() => toggleDate(date)}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className={styles.weeklyCard}>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                            <button
                                key={d}
                                type="button"
                                className={`${styles.weekdayPill} ${selectedWeekdays.has(d) ? styles.weekdayPillActive : ""}`}
                                onClick={() => toggleWeekday(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                )}

                {error && <p className={styles.errorText}>{error}</p>}

                <button
                    type="button"
                    className={styles.saveBtn}
                    onClick={handleChangeAvailability}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Change Availability"}
                </button>
            </div>
        </div>
    );
}