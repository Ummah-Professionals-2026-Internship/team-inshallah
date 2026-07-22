import { useState, useMemo } from "react";
import styles from "./AvailabilityModal.module.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am - 11pm

function formatHour12(h) {
    const period = h >= 12 ? "pm" : "am";
    let hour = h % 12;
    if (hour === 0) hour = 12;
    return `${hour} ${period}`;
}

const TIMEZONE_OPTIONS = [
    "(GMT-12:00) International Date Line West",
    "(GMT-11:00) Samoa Standard Time",
    "(GMT-10:00) Hawaii-Aleutian Standard Time",
    "(GMT-09:30) Marquesas Islands Time",
    "(GMT-09:00) Alaska Standard Time",
    "(GMT-08:00) Pacific Standard Time",
    "(GMT-07:00) Mountain Standard Time",
    "(GMT-06:00) Central Standard Time",
    "(GMT-05:00) Eastern Standard Time",
    "(GMT-04:00) Atlantic Standard Time",
    "(GMT+00:00) Greenwich Mean Time",
    "(GMT+01:00) Central European Time",
    "(GMT+03:00) East Africa Time",
    "(GMT+04:00) Gulf Standard Time",
    "(GMT+05:00) Pakistan Standard Time",
];

function dateKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// monday-first calendar grid, padded with adjacent month days so every row has 7 cells
function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // sun=0 -> shift to mon=0
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

// dropdown-style time picker, matches the figma list-of-hours interaction
function TimeDropdownInput({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const hour24 = parseInt(value.split(":")[0], 10);

    return (
        <div className={styles.timeDropdownWrap}>
            <button
                type="button"
                className={styles.timeInput}
                onClick={() => setOpen((o) => !o)}
            >
                {formatHour12(hour24)}
            </button>
            {open && (
                <div className={styles.timeOptionsList}>
                    {HOUR_OPTIONS.map((h) => (
                        <button
                            key={h}
                            type="button"
                            className={`${styles.timeOption} ${h === hour24 ? styles.timeOptionActive : ""}`}
                            onClick={() => {
                                onChange(`${String(h).padStart(2, "0")}:00`);
                                setOpen(false);
                            }}
                        >
                            {formatHour12(h)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AvailabilityModal({ onClose, onContinue }) {
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [viewMode, setViewMode] = useState("specific"); // specific | weekly
    const [cursor, setCursor] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState(new Set());
    const [selectedWeekdays, setSelectedWeekdays] = useState(new Set());
    const [timezone, setTimezone] = useState("");
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
            const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setTimezone(resolved);
        } catch {
            // browser doesn't support it, leave as is
        }
    };

    const handleContinue = () => {
        const hasSelection =
            viewMode === "specific" ? selectedDates.size > 0 : selectedWeekdays.size > 0;
        if (!hasSelection) {
            setError("Please select at least one date or day.");
            return;
        }
        setError("");

        const payload =
            viewMode === "specific"
                ? { mode: "specific", dates: selectedDates, startTime, endTime, timezone }
                : { mode: "weekly", weekdays: selectedWeekdays, startTime, endTime, timezone };

        onContinue(payload);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close" type="button">
                    Close
                </button>

                <h2 className={styles.title}>What times might work?</h2>
                <div className={styles.timeRow}>
                    <TimeDropdownInput value={startTime} onChange={setStartTime} />
                    <span className={styles.timeSeparator}>to</span>
                    <TimeDropdownInput value={endTime} onChange={setEndTime} />
                </div>

                <h2 className={styles.title}>What dates might work?</h2>
                <p className={styles.subtitle}>Click to Change</p>

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
                            <button type="button" className={styles.navArrow} onClick={goPrevMonth} aria-label="Previous month">
                                ‹
                            </button>
                            <span className={styles.monthLabel}>
                                {MONTH_NAMES[month]} {year}
                            </span>
                            <button type="button" className={styles.navArrow} onClick={goNextMonth} aria-label="Next month">
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
                                {d.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                )}

                {error && <p className={styles.errorText}>{error}</p>}

                <button type="button" className={styles.saveBtn} onClick={handleContinue}>
                    Change Availability
                </button>

                <div className={styles.timezoneSection}>
                    <label className={styles.timezoneLabel}>Timezone</label>
                    <div className={styles.timezoneRow}>
                        <select
                            className={styles.timezoneSelect}
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                        >
                            <option value="">Select Timezone</option>
                            {TIMEZONE_OPTIONS.map((tz) => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className={styles.locationBtn}
                            onClick={detectTimezone}
                            aria-label="Detect my timezone"
                            title="Detect my timezone"
                        >
                            Auto
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}