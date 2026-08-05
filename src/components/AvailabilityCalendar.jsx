import { useState, useEffect, useMemo } from "react";
import Dashboard from "./Dashboard";
import styles from "./AvailabilityCalendar.module.css";
import SyncCalendar from "./SyncCalendar";
import { API_BASE_URL } from "../config";
const API = API_BASE_URL;

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28;
const DAYS_PER_PAGE = 5;
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

function minutesToHHMM(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dayKeyToISODate(dayKey) {
    const [y, m, d] = dayKey.split("-").map(Number);
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isoDateToDayKey(isoDate) {
    const [y, m, d] = isoDate.split("-").map(Number);
    return `${y}-${m - 1}-${d}`;
}

function weekdayNameToDayOfWeek(name) {
    const mondayIdx = WEEKDAY_ORDER.indexOf(name);
    return (mondayIdx + 1) % 7;
}
function dayOfWeekToWeekdayName(dow) {
    const mondayIdx = (dow + 6) % 7;
    return WEEKDAY_ORDER[mondayIdx];
}

// returns the next real calendar date (today or later) that falls on the given weekday name
function nextDateForWeekday(weekdayName) {
    const targetMondayIdx = WEEKDAY_ORDER.indexOf(weekdayName); // 0=Monday
    const today = new Date();
    const todayMondayIdx = (today.getDay() + 6) % 7; // convert JS Sunday-first to Monday-first
    const diff = (targetMondayIdx - todayMondayIdx + 7) % 7;
    const result = new Date(today);
    result.setDate(today.getDate() + diff);
    return result;
}

// converts an "HH:MM" wall-clock time from one IANA zone to another, anchored
// to a specific date (needed since the offset between zones can shift by date/DST)
function convertHHMMBetweenZones(dateForContext, hhmm, fromTz, toTz) {
    if (fromTz === toTz || !fromTz || !toTz) return hhmm;
    const [h, m] = hhmm.split(":").map(Number);
    const utc = zonedTimeToUtc(
        dateForContext.getFullYear(), dateForContext.getMonth(), dateForContext.getDate(),
        h, m, fromTz
    );
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: toTz,
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(utc).map((p) => [p.type, p.value]));
    return `${parts.hour}:${parts.minute}`;
}

// returns the UTC Date corresponding to a given wall-clock time in `timeZone`
function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
    const naiveUtc = new Date(Date.UTC(year, month, day, hour, minute));
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(naiveUtc).map((p) => [p.type, p.value]));
    const asIfUtc = Date.UTC(
        Number(parts.year), Number(parts.month) - 1, Number(parts.day),
        Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    const offset = asIfUtc - naiveUtc.getTime();
    return new Date(naiveUtc.getTime() - offset);
}

function buildDayColumns(availability) {
    if (!availability) return [];
    if (availability.mode === "specific") {
        return Array.from(availability.dates)
            .map((key) => {
                const [y, m, d] = key.split("-").map(Number);
                const date = new Date(y, m, d);
                return {
                    key,
                    date,
                    label: date.toLocaleDateString(undefined, { weekday: "short" }),
                    sublabel: String(date.getDate()),
                };
            })
            .sort((a, b) => a.date - b.date);
    }
    return WEEKDAY_ORDER
        .filter((d) => availability.weekdays.has(d))
        .map((d) => ({ key: d, label: d.slice(0, 3), sublabel: "" }));
}

export default function AvailabilityCalendar({ availability, onClose, onSave, userName, profilePhoto }) {
    const days = useMemo(() => buildDayColumns(availability), [availability]);

    const startMin = timeToMinutes(availability?.startTime || "09:00");
    const endMin = timeToMinutes(availability?.endTime || "17:00");
    const slots = useMemo(() => {
        const out = [];
        for (let t = startMin; t < endMin; t += SLOT_MINUTES) out.push(t);
        return out;
    }, [startMin, endMin]);

    const [page, setPage] = useState(0);
    const totalPages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
    const visibleDays = useMemo(
        () => days.slice(page * DAYS_PER_PAGE, page * DAYS_PER_PAGE + DAYS_PER_PAGE),
        [days, page]
    );

    const [blocks, setBlocks] = useState([]);
    const [busy, setBusy] = useState(new Set());
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [dragging, setDragging] = useState(null);

    const slotIndexFromHHMM = (hhmm) => {
        const mins = timeToMinutes(hhmm);
        const idx = slots.findIndex((s) => s === mins);
        return idx === -1 ? null : idx;
    };
    const slotIndexEndFromHHMM = (hhmm) => {
        const mins = timeToMinutes(hhmm);
        const idx = slots.findIndex((s) => s === mins);
        if (idx !== -1) return idx;
        if (mins === endMin) return slots.length;
        return null;
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetch(`${API}/api/availability`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => (res.status === 404 ? null : res.json()))
            .then((body) => {
                const record = body?.availability;
                if (!record?.availability) return;

                const savedTz = record.timezone || "America/New_York";
                const currentTz = availability?.timezone || savedTz;

                const loaded = [];
                for (const b of record.availability) {
                    const dayKey =
                        b.type === "specific" ? isoDateToDayKey(b.date) : dayOfWeekToWeekdayName(b.dayOfWeek);

                    const contextDate = b.type === "specific" ? new Date(b.date) : new Date();

                    const adjustedStart = convertHHMMBetweenZones(contextDate, b.start, savedTz, currentTz);
                    const adjustedEnd = convertHHMMBetweenZones(contextDate, b.end, savedTz, currentTz);

                    const startIdx = slotIndexFromHHMM(adjustedStart);
                    const endIdx = slotIndexEndFromHHMM(adjustedEnd);
                    if (startIdx === null || endIdx === null) continue;

                    loaded.push({
                        id: `${dayKey}-${b.start}-${Date.now()}-${Math.random()}`,
                        dayKey,
                        startIdx,
                        endIdx,
                    });
                }
                setBlocks(loaded);
            })
            .catch(() => setLoadError("Could not load your saved availability."));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slots.length, availability?.timezone]);

    const busyKey = (dayKey, slotStart) => `${dayKey}__${slotStart}`;

    const isInDragRange = (dayKey, idx) => {
        if (!dragging || dragging.dayKey !== dayKey) return false;
        const lo = Math.min(dragging.startIdx, dragging.hoverIdx);
        const hi = Math.max(dragging.startIdx, dragging.hoverIdx);
        return idx >= lo && idx <= hi;
    };

    const handleMouseDown = (dayKey, idx) => {
        setDragging({ dayKey, startIdx: idx, hoverIdx: idx });
    };

    const handleMouseEnter = (dayKey, idx) => {
        if (!dragging || dragging.dayKey !== dayKey) return;
        setDragging((prev) => ({ ...prev, hoverIdx: idx }));
    };

    useEffect(() => {
        const finishDrag = () => {
            setDragging((current) => {
                if (!current) return null;
                const { dayKey, startIdx, hoverIdx } = current;
                const lo = Math.min(startIdx, hoverIdx);
                const hi = Math.max(startIdx, hoverIdx) + 1;

                setBlocks((prev) => {
                    const dayBlocks = prev.filter((b) => b.dayKey === dayKey);
                    const otherDaysBlocks = prev.filter((b) => b.dayKey !== dayKey);
                    const merging = dayBlocks.filter((b) => b.startIdx <= hi && b.endIdx >= lo);
                    const untouched = dayBlocks.filter((b) => !merging.includes(b));
                    const mergedStart = Math.min(lo, ...merging.map((b) => b.startIdx));
                    const mergedEnd = Math.max(hi, ...merging.map((b) => b.endIdx));
                    const mergedBlock = {
                        id: merging.length > 0 ? merging[0].id : `${dayKey}-${Date.now()}`,
                        dayKey,
                        startIdx: mergedStart,
                        endIdx: mergedEnd,
                    };
                    return [...otherDaysBlocks, ...untouched, mergedBlock];
                });
                return null;
            });
        };
        window.addEventListener("mouseup", finishDrag);
        return () => window.removeEventListener("mouseup", finishDrag);
    }, []);

    const removeBlock = (id) => setBlocks((prev) => prev.filter((b) => b.id !== id));

    const handleSyncCalendar = async (provider) => {
        setShowSyncModal(false);
        if (provider === "manual") return;

        const token = localStorage.getItem("token");
        const popup = window.open("", "_blank", "width=500,height=650");

        setSyncing(true);
        try {
            const busyRes = await fetch(`${API}/api/calendar/${provider}/busy`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (busyRes.status === 404) {
                const connectRes = await fetch(`${API}/api/calendar/${provider}/connect`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const { url } = await connectRes.json();
                if (url && popup) {
                    popup.location.href = url;
                } else if (url) {
                    window.open(url, "_blank");
                }
                setSyncing(false);
                return;
            }

            popup?.close();

            const data = await busyRes.json();
            if (!busyRes.ok) throw new Error(data.message || "Sync failed.");

            console.log("RAW BUSY DATA:", data.busy);
            console.log("AVAILABILITY MODE:", availability?.mode);
            console.log("DAYS:", days);
            console.log("TIMEZONE:", availability?.timezone);

            const tz = availability?.timezone || "America/New_York";
            const newBusy = new Set();
            for (const range of data.busy || []) {
                const rangeStart = new Date(range.start);
                const rangeEnd = new Date(range.end);
                for (const d of days) {
                    const refDate = availability?.mode === "specific" ? d.date : nextDateForWeekday(d.key);
                    for (const slot of slots) {
                        const slotStart = zonedTimeToUtc(
                            refDate.getFullYear(), refDate.getMonth(), refDate.getDate(),
                            Math.floor(slot / 60), slot % 60, tz
                        );
                        const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60000);
                        if (slotStart < rangeEnd && rangeStart < slotEnd) {
                            newBusy.add(busyKey(d.key, slot));
                        }
                    }
                }
            }
            
            console.log("COMPUTED BUSY SET:", newBusy);
            setBusy(newBusy);

        } catch (err) {
            console.error("Error syncing calendar:", err);
            popup?.close();
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async () => {
        setSaveError("");
        const payloadBlocks = blocks.map((b) => {
            const startMinutes = slots[b.startIdx];
            const endMinutes = b.endIdx < slots.length ? slots[b.endIdx] : slots[slots.length - 1] + SLOT_MINUTES;
            const start = minutesToHHMM(startMinutes);
            const end = minutesToHHMM(endMinutes);

            if (availability?.mode === "specific") {
                return { type: "specific", date: dayKeyToISODate(b.dayKey), start, end };
            }
            return { type: "weekly", dayOfWeek: weekdayNameToDayOfWeek(b.dayKey), start, end };
        });

        setSaving(true);
        try {
            const res = await fetch(`${API}/api/availability`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    timezone: availability?.timezone || "America/New_York",
                    availability: payloadBlocks,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setSaveError(data.message || "Failed to save availability.");
                setSaving(false);
                return;
            }
        } catch (err) {
            setSaveError("Network error — is the server running?");
            setSaving(false);
            return;
        }
        setSaving(false);
        onSave?.(payloadBlocks);
        onClose();
    };

    const handleCalendarNavClick = (label) => {
        if (label === "Add Calendar") {
            setShowSyncModal(true);
        } else if (label === "Home") {
            onClose();
        }
    };

    return (
        <Dashboard
            userName={userName}
            userRole="Professional"
            profilePhoto={profilePhoto}
            navLinks={CALENDAR_NAV_LINKS}
            onNavClick={handleCalendarNavClick}
            todoItems={[]}
            upcomingMeetings={[]}
            previousMeetings={[]}
        >
            {loadError && <p className={styles.loadErrorText}>{loadError}</p>}

            {totalPages > 1 && (
                <div className={styles.pageNav}>
                    <button
                        type="button"
                        className={styles.pageNavBtn}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        aria-label="Previous days"
                    >
                        ‹
                    </button>
                    <span className={styles.pageNavLabel}>
                        {page * DAYS_PER_PAGE + 1}–{Math.min((page + 1) * DAYS_PER_PAGE, days.length)} of {days.length}
                    </span>
                    <button
                        type="button"
                        className={styles.pageNavBtn}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        aria-label="Next days"
                    >
                        ›
                    </button>
                </div>
            )}

            <div className={styles.gridWrap}>
                <div className={styles.calendarInner}>
                    <div className={styles.headerRow}>
                        <div className={styles.cornerCell} />
                        {visibleDays.map((d) => (
                            <div key={d.key} className={styles.dayHeader}>
                                <span className={styles.dayHeaderLabel}>{d.label}</span>
                                {d.sublabel !== "" && (
                                    <span className={styles.dayHeaderSubCircle}>{d.sublabel}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className={styles.bodyRow}>
                        <div className={styles.timeColumn}>
                            {slots.map((slot) => {
                                const isHour = slot % 60 === 0;
                                return (
                                    <div
                                        key={slot}
                                        className={`${styles.timeLabel} ${isHour ? styles.timeLabelHour : styles.timeLabelDashed}`}
                                    >
                                        {isHour ? minutesToLabel(slot) : ""}
                                    </div>
                                );
                            })}
                        </div>

                        {visibleDays.map((d) => (
                            <div key={d.key} className={styles.dayColumn}>
                                {slots.map((slot, idx) => {
                                    const isHour = slot % 60 === 0;
                                    const isBusy = busy.has(busyKey(d.key, slot));
                                    const inDrag = isInDragRange(d.key, idx);
                                    return (
                                        <div
                                            key={slot}
                                            className={`${styles.slotCell} ${isHour ? styles.slotCellHourLine : styles.slotCellDashedLine} ${isBusy ? styles.slotCellBusy : ""} ${inDrag ? styles.slotCellDragging : ""}`}
                                            onMouseDown={() => !isBusy && handleMouseDown(d.key, idx)}
                                            onMouseEnter={() => handleMouseEnter(d.key, idx)}
                                        />
                                    );
                                })}

                                {blocks
                                    .filter((b) => b.dayKey === d.key)
                                    .map((b) => {
                                        const top = b.startIdx * SLOT_HEIGHT;
                                        const height = (b.endIdx - b.startIdx) * SLOT_HEIGHT;
                                        const startLabel = minutesToLabel(slots[b.startIdx]);
                                        const endMinutes =
                                            b.endIdx < slots.length ? slots[b.endIdx] : slots[slots.length - 1] + SLOT_MINUTES;
                                        const endLabel = minutesToLabel(endMinutes);
                                        const isSingleSlot = b.endIdx - b.startIdx === 1;
                                        return (
                                            <div key={b.id} className={styles.availableBlock} style={{ top, height }}>
                                                <button
                                                    type="button"
                                                    className={styles.blockRemoveBtn}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={() => removeBlock(b.id)}
                                                    aria-label="Remove availability block"
                                                >
                                                    ×
                                                </button>
                                                {isSingleSlot ? (
                                                    <div className={styles.blockRowInline}>
                                                        <p className={styles.blockTitle}>Available</p>
                                                        <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className={styles.blockTitle}>Available</p>
                                                        <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}

                                {dragging?.dayKey === d.key && (() => {
                                    const lo = Math.min(dragging.startIdx, dragging.hoverIdx);
                                    const hi = Math.max(dragging.startIdx, dragging.hoverIdx) + 1;
                                    const top = lo * SLOT_HEIGHT;
                                    const height = (hi - lo) * SLOT_HEIGHT;
                                    const startLabel = minutesToLabel(slots[lo]);
                                    const endMinutes = hi < slots.length ? slots[hi] : slots[slots.length - 1] + SLOT_MINUTES;
                                    const endLabel = minutesToLabel(endMinutes);
                                    const isSingleSlot = hi - lo === 1;
                                    return (
                                        <div className={styles.availableBlockPreview} style={{ top, height }}>
                                            {isSingleSlot ? (
                                                <div className={styles.blockRowInline}>
                                                    <p className={styles.blockTitle}>Available</p>
                                                    <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className={styles.blockTitle}>Available</p>
                                                    <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <p className={styles.hintText}>
                Click and drag on any day column to add or extend an availability block
            </p>

            {saveError && <p className={styles.loadErrorText}>{saveError}</p>}

            <div className={styles.footer}>
                {syncing && <span className={styles.syncingLabel}>Syncing calendar…</span>}
                <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save Availability"}
                </button>
            </div>

            {showSyncModal && (
                <SyncCalendar
                    onClose={() => setShowSyncModal(false)}
                    onSelect={(methodId) => handleSyncCalendar(methodId)}
                />
            )}
        </Dashboard>
    );
}