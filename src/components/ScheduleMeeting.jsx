import {useState, useEffect} from "react";
import styles from "./ScheduleMeeting.module.css";


// Turn a specific date's availability blocks into 1-hour slot start times.
// e.g. a 10:00-13:00 block on that weekday becomes ["10:00", "11:00", "12:00"]
function slotsForDate(date, blocks) {
  const dayOfWeek = date.getDay();
  const slots = [];

  for (const block of blocks) {
    if (block.type !== "weekly") continue;      // demo handles weekly only
    if (block.dayOfWeek !== dayOfWeek) continue; // only blocks for this weekday

    const [startHour] = block.start.split(":").map(Number);
    const [endHour] = block.end.split(":").map(Number);

    // Each meeting is 1 hour, so the last start is one hour before the end.
    for (let hour = startHour; hour + 1 <= endHour; hour++) {
      slots.push(`${String(hour).padStart(2, "0")}:00`);
    }
  }

  return slots;
}

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

// Display "14:00" as "2:00 PM" — keeps the 24h value for logic, formats for the eye.
function formatSlot(slot) {
  const [hour, minute] = slot.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}


export default function ScheduleMeeting({ professional, onClose }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

useEffect(() => {
    if (!professional?.userId) return;

    setLoadingAvail(true);
    fetch(`http://localhost:5050/api/availability/${professional.userId}`)
      .then(async (res) => {
        if (!res.ok) return null; // 404 = no availability set
        return res.json();
      })
      .then((data) => {
        setAvailability(data); // { timezone, availability, bookedSlots } or null
      })
      .catch((err) => {
        console.log("Failed to fetch availability:", err);
        setAvailability(null);
      })
      .finally(() => setLoadingAvail(false));
  }, [professional]);

  const blocks = availability?.availability || [];
  const openDays = availableDaysOfWeek(blocks);
  const cells = buildMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth());
  const daySlots = selectedDate ? slotsForDate(selectedDate, blocks) : [];

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

    async function handleBook() {
    if (!selectedDate || !selectedSlot) return;

    // Combine the picked day and slot into one Date, e.g. July 20 + "10:00"
    const [hour, minute] = selectedSlot.split(":").map(Number);
    const meetingDate = new Date(selectedDate);
    meetingDate.setHours(hour, minute, 0, 0);

    setBooking(true);
    setBookingStatus(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5050/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          professionalId: professional.id,
          date: meetingDate.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Booking failed.");
      }

      setBookingStatus({ type: "success", msg: "Meeting booked!" });
    } catch (err) {
      setBookingStatus({ type: "error", msg: err.message });
    } finally {
      setBooking(false);
    }
  }

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

        <div className={styles.scheduleRow}>
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
          {selectedDate && (
          <div className={styles.slotSection}>
            <h4 className={styles.slotHeading}>
              Available times on {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </h4>

            {daySlots.length === 0 ? (
              <p className={styles.noSlots}>No available times this day.</p>
            ) : (
              <div className={styles.slotGrid}>
                {daySlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={[
                      styles.slot,
                      selectedSlot === slot ? styles.slotSelected : "",
                    ].join(" ")}
                  >
                    {formatSlot(slot)}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot && (
              <div className={styles.confirmRow}>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={handleBook}
                  disabled={booking}
                >
                  {booking ? "Booking…" : `Confirm ${formatSlot(selectedSlot)} meeting`}
                </button>

                {bookingStatus && (
                  <p className={bookingStatus.type === "success" ? styles.bookSuccess : styles.bookError}>
                    {bookingStatus.msg}
                  </p>
                )}
              </div>
            )}

            
          </div>
        )}
        </div>
      </div>
    </div>
  );
}