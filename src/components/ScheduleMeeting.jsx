import {useState} from "react";
import styles from "./ScheduleMeeting.module.css";

const MOCK_AVAILABILITY = {
  timezone: "America/New_York",
  blocks: [
    { type: "weekly", dayOfWeek: 1, start: "12:00", end: "1:30" }, // Mondays
    { type: "weekly", dayOfWeek: 2, start: "12:00", end: "1:30" }, // Tuesdays
    { type: "weekly", dayOfWeek: 3, start: "12:00", end: "1:30" }, // Wednesdays
    { type: "weekly", dayOfWeek: 4, start: "12:00", end: "1:30" }, // Thursdays
    { type: "weekly", dayOfWeek: 5, start: "12:00", end: "1:30" }, // Fridays
    {type: "weekly", dayOfWeek: 6, start: "9:00", end: "15:00"}, // Saturdays
    {type: "weekly", dayOfWeek: 0, start: "10:00", end: "14:00"}, // Sundays
  ],
};


// Which weekdays does this professional work? e.g. {1,2,3,4,5}
function availableDaysOfWeek(blocks) {
  const days = new Set();
  for (const block of blocks) {
    if (block.type === "weekly") days.add(block.dayOfWeek);
  }
  return days;
}

// Build the grid of days for a given month, Monday-first.
// Returns an array of { date, inMonth } — including padding days from
// the previous/next month so the grid lines up.
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  // JS getDay(): 0=Sun..6=Sat. We want Monday first, so shift it.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < 37; i++) {
    const date = new Date(year, month, 1 - startOffset + i);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  return cells;
}


export default function ScheduleMeeting({ professional, onClose }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const openDays = availableDaysOfWeek(MOCK_AVAILABILITY.blocks);
  const cells = buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = viewMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const isAvailable = (date) =>
    date >= today && openDays.has(date.getDay());

  const changeMonth = (delta) =>
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );

  if (!professional) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 className={styles.name}>{professional.name}</h2>
        <p className={styles.duration}>1 Hour meeting</p>
        <h3 className={styles.heading}>Select a Date &amp; Time</h3>

        <div className={styles.calendarBox}>
          <div className={styles.monthRow}>
            <button type="button" className={styles.navBtn} onClick={() => changeMonth(-1)} aria-label="Previous month">
              &#8249;
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button type="button" className={styles.navBtn} onClick={() => changeMonth(1)} aria-label="Next month">
              &#8250;
            </button>
          </div>

          <div className={styles.weekdayRow}>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
              <span key={day} className={styles.weekday}>{day}</span>
            ))}
          </div>

          <div className={styles.dayGrid}>
            {cells.map(({ date, inMonth }) => {
              const available = inMonth && isAvailable(date);
              const isSelected =
                selectedDate && date.toDateString() === selectedDate.toDateString();

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={!available}
                  onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                  className={[
                    styles.day,
                    !inMonth ? styles.dayMuted : "",
                    available ? styles.dayAvailable : "",
                    isSelected ? styles.daySelected : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}