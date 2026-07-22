import { useState, useRef, useEffect, useMemo } from "react";
import styles from "./AvailabilityCalendar.module.css";
import Dashboard from "./Dashboard";

const SLOT_MINUTES = 30;
const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const CALENDAR_NAV_LINKS = [
    { label: "Add Calendar" },
    { label: "Home" },
];

function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function minutesToLabel(mins) {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// builds the day columns to display, based on what was picked in the
// "what dates/times might work" step
function buildDayColumns(availability) {
    if (!availability) return [];
    if (availability.mode === "specific") {
        return Array.from(availability.dates)
            .map((key) => {
                const [y, m, d] = key.split("-").map(Number);
                const date = new Date(y, m, d);
                return {
                    key,
                    label: date.toLocaleDateString(undefined, { weekday: "short" }),
                    sublabel: String(date.getDate()),
                };
            })
            .sort((a, b) => a.key.localeCompare(b.key));
    }
    return WEEKDAY_ORDER
        .filter((d) => availability.weekdays.has(d))
        .map((d) => ({ key: d, label: d.slice(0, 3), sublabel: "" }));
}

export default function AvailabilityScheduleGrid({ availability, onClose, onSave }) {
    const days = useMemo(() => buildDayColumns(availability), [availability]);

    const startMin = timeToMinutes(availability?.startTime || "09:00");
    const endMin = timeToMinutes(availability?.endTime || "17:00");
    const slots = useMemo(() => {
        const out = [];
        for (let t = startMin; t < endMin; t += SLOT_MINUTES) out.push(t);
        return out;
    }, [startMin, endMin]);

    const [selected, setSelected] = useState(new Set());
    const [busy, setBusy] = useState(new Set()); // populated once a calendar is synced
    const [syncing, setSyncing] = useState(false);
    const dragState = useRef(null);

    const cellKey = (dayKey, slot) => `${dayKey}__${slot}`;

    const applyCell = (dayKey, slot, paintOn) => {
        const key = cellKey(dayKey, slot);
        if (busy.has(key)) return; // can't select over a busy block
        setSelected((prev) => {
            const next = new Set(prev);
            if (paintOn) next.add(key);
            else next.delete(key);
            return next;
        });
    };

    const handleMouseDown = (dayKey, slot) => {
        const key = cellKey(dayKey, slot);
        const paintOn = !selected.has(key);
        dragState.current = { paintOn };
        applyCell(dayKey, slot, paintOn);
    };

    const handleMouseEnter = (dayKey, slot) => {
        if (!dragState.current) return;
        applyCell(dayKey, slot, dragState.current.paintOn);
    };

    useEffect(() => {
        const stopDrag = () => { dragState.current = null; };
        window.addEventListener("mouseup", stopDrag);
        return () => window.removeEventListener("mouseup", stopDrag);
    }, []);

    const handleCalendarNavClick = (label) => {
        if (label === "Add Calendar") {
            handleSyncCalendar();
        } else if (label === "Home") {
            onClose();
        }
    };

    const handleSyncCalendar = async () => {
        setSyncing(true);
        try {
            const res = await fetch("http://localhost:5050/api/professional/availability/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ provider: availability?.method || "manual" }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.busySlots) {
                setBusy(new Set(data.busySlots.map((b) => cellKey(b.dayKey, b.slot))));
            }
        } catch {
            // backend route isn't built yet - safe to ignore for now
        } finally {
            setSyncing(false);
        }
    };

    // TODO backend: this endpoint doesn't exist yet either. Should accept
    // the selected time blocks and persist them against the professional.
    const handleSave = async () => {
        const blocks = Array.from(selected).map((key) => {
            const [dayKey, slot] = key.split("__");
            return { dayKey, slot: Number(slot) };
        });
        try {
            await fetch("http://localhost:5050/api/professional/availability/blocks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    startTime: availability?.startTime,
                    endTime: availability?.endTime,
                    timezone: availability?.timezone,
                    blocks,
                }),
            });
        } catch {
            // backend route isn't built yet - safe to ignore for now
        }
        onSave?.(blocks);
        onClose();
    };

    return (
        <div className={styles.page}>
            <header className={styles.topBar}>
                <button type="button" className={styles.syncBtn} onClick={handleSyncCalendar} disabled={syncing}>
                    {syncing ? "Syncing..." : "Sync Calendar"}
                </button>
                <button type="button" className={styles.homeBtn} onClick={onClose}>
                    Home
                </button>
            </header>

            <div className={styles.gridWrap}>
                <div
                    className={styles.grid}
                    style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
                >
                    <div className={styles.cornerCell} />
                    {days.map((d) => (
                        <div key={d.key} className={styles.dayHeader}>
                            <span className={styles.dayHeaderLabel}>{d.label}</span>
                            {d.sublabel !== "" && <span className={styles.dayHeaderSub}>{d.sublabel}</span>}
                        </div>
                    ))}

                    {slots.map((slot) => (
                        <div key={slot} style={{ display: "contents" }}>
                            <div className={styles.timeLabel}>{minutesToLabel(slot)}</div>
                            {days.map((d) => {
                                const key = cellKey(d.key, slot);
                                const isBusy = busy.has(key);
                                const isSelected = selected.has(key);
                                return (
                                    <div
                                        key={key}
                                        className={`${styles.slotCell} ${isBusy ? styles.slotCellBusy : ""} ${isSelected ? styles.slotCellSelected : ""}`}
                                        onMouseDown={() => !isBusy && handleMouseDown(d.key, slot)}
                                        onMouseEnter={() => handleMouseEnter(d.key, slot)}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.footer}>
                <button type="button" className={styles.saveBtn} onClick={handleSave}>
                    Save Availability
                </button>
            </div>
        </div>
    );
}