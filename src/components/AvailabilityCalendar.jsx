import { useState, useEffect, useMemo } from "react";
import Dashboard from "./Dashboard";
import styles from "./AvailabilityCalendar.module.css";
import SyncCalendar from "./SyncCalendar";
import { API_BASE_URL } from "../config";
const API = API_BASE_URL;

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28;
const EVENT_V_GAP = 3; // px inset top/bottom so a block ending at 2:30 doesn't touch one starting at 2:30
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

// returns the minutes-since-midnight that a UTC instant falls on
function utcToZonedMinutes(date, timeZone) {
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    return Number(parts.hour) * 60 + Number(parts.minute);
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

// same day/time events overlap to show both on calendar
function layoutDayEvents(events) {
    const sorted = [...events].sort((a, b) => a.startIdx - b.startIdx || a.endIdx - b.endIdx);
    const positioned = [];
    let cluster = [];
    let clusterEnd = -Infinity;

    const flushCluster = () => {
        if (cluster.length === 0) return;
        const colEnds = [];
        const start = positioned.length;
        for (const ev of cluster) {
            let col = colEnds.findIndex((end) => end <= ev.startIdx);
            if (col === -1) {
                col = colEnds.length;
                colEnds.push(ev.endIdx);
            } else {
                colEnds[col] = ev.endIdx;
            }
            positioned.push({ ...ev, colIndex: col });
        }
        for (let i = start; i < positioned.length; i++) positioned[i].colCount = colEnds.length;
        cluster = [];
    };

    for (const ev of sorted) {
        if (ev.startIdx >= clusterEnd) {
            flushCluster();
            clusterEnd = ev.endIdx;
        } else {
            clusterEnd = Math.max(clusterEnd, ev.endIdx);
        }
        cluster.push(ev);
    }
    flushCluster();
    return positioned;
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
    const [busyBlocks, setBusyBlocks] = useState([]);
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

    // turns raw {start, end, title} ranges from the provider into per-day blocks,
    // positioned on the same slot grid as the available blocks but keeping each
    // event's real (possibly off-grid, e.g. 10:15) start/end time for display
    const buildBusyBlocksFromRanges = (ranges, tz) => {
        const out = [];
        for (const range of ranges) {
            const rangeStart = new Date(range.start);
            const rangeEnd = new Date(range.end);
            const title = range.title || "Busy";

            for (const d of days) {
                const refDate = availability?.mode === "specific" ? d.date : nextDateForWeekday(d.key);

                const gridStart = zonedTimeToUtc(
                    refDate.getFullYear(), refDate.getMonth(), refDate.getDate(),
                    Math.floor(startMin / 60), startMin % 60, tz
                );
                const gridEnd = zonedTimeToUtc(
                    refDate.getFullYear(), refDate.getMonth(), refDate.getDate(),
                    Math.floor(endMin / 60), endMin % 60, tz
                );

                if (rangeEnd <= gridStart || rangeStart >= gridEnd) continue; // no overlap with this day's visible window

                const clippedStart = rangeStart < gridStart ? gridStart : rangeStart;
                const clippedEnd = rangeEnd > gridEnd ? gridEnd : rangeEnd;

                const startIdx = (clippedStart.getTime() - gridStart.getTime()) / (SLOT_MINUTES * 60000);
                const endIdx = (clippedEnd.getTime() - gridStart.getTime()) / (SLOT_MINUTES * 60000);

                out.push({
                    id: `${d.key}-busy-${range.start}-${range.end}`,
                    dayKey: d.key,
                    startIdx,
                    endIdx,
                    startLabel: minutesToLabel(utcToZonedMinutes(rangeStart, tz)),
                    endLabel: minutesToLabel(utcToZonedMinutes(rangeEnd, tz)),
                    title,
                });
            }
        }
        return out;
    };

    // fetches busy times for one provider. In silent mode (used on mount, for
    // calendars that are already connected) a 404 just means "not connected yet"
    // and is ignored instead of kicking off the OAuth popup flow.
    const syncProviderBusy = async (provider, { silent = false } = {}) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        let popup = null;
        if (!silent) {
            popup = window.open("", "_blank", "width=500,height=650");
            setSyncing(true);
        }

        try {
            const busyRes = await fetch(`${API}/api/calendar/${provider}/busy`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (busyRes.status === 404) {
                if (silent) return;
                const connectRes = await fetch(`${API}/api/calendar/${provider}/connect`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const { url } = await connectRes.json();
                if (url && popup) {
                    popup.location.href = url;
                } else if (url) {
                    window.open(url, "_blank");
                }
                return;
            }

            popup?.close();

            const data = await busyRes.json();
            if (!busyRes.ok) throw new Error(data.message || "Sync failed.");

            const tz = availability?.timezone || "America/New_York";
            const newBlocks = buildBusyBlocksFromRanges(data.busy || [], tz);

            setBusyBlocks((prev) => [
                ...prev.filter((b) => b.provider !== provider),
                ...newBlocks.map((b) => ({ ...b, provider })),
            ]);
        } catch (err) {
            console.error(`Error syncing ${provider} calendar:`, err);
            popup?.close();
        } finally {
            if (!silent) setSyncing(false);
        }
    };

    const handleSyncCalendar = (provider) => {
        setShowSyncModal(false);
        if (provider === "manual") return;
        syncProviderBusy(provider);
    };

    // silently re-sync any already-connected calendars whenever the availability
    // calendar is opened, so busy times stay fresh without a manual re-sync
    useEffect(() => {
        if (slots.length === 0 || days.length === 0) return;
        Promise.resolve().then(() => {
            syncProviderBusy("google", { silent: true });
            syncProviderBusy("outlook", { silent: true });
        });
    }, [days.length, slots.length, availability?.timezone]);

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

                        {visibleDays.map((d) => {
                            const dayEvents = layoutDayEvents([
                                ...busyBlocks.filter((b) => b.dayKey === d.key).map((b) => ({ ...b, kind: "busy" })),
                                ...blocks.filter((b) => b.dayKey === d.key).map((b) => ({ ...b, kind: "available" })),
                            ]);

                            return (
                                <div key={d.key} className={styles.dayColumn}>
                                    {slots.map((slot, idx) => {
                                        const isHour = slot % 60 === 0;
                                        const inDrag = isInDragRange(d.key, idx);
                                        return (
                                            <div
                                                key={slot}
                                                className={`${styles.slotCell} ${isHour ? styles.slotCellHourLine : styles.slotCellDashedLine} ${inDrag ? styles.slotCellDragging : ""}`}
                                                onMouseDown={() => handleMouseDown(d.key, idx)}
                                                onMouseEnter={() => handleMouseEnter(d.key, idx)}
                                            />
                                        );
                                    })}

                                    {dayEvents.map((ev) => {
                                        const top = ev.startIdx * SLOT_HEIGHT;
                                        const height = (ev.endIdx - ev.startIdx) * SLOT_HEIGHT;
                                        let startLabel;
                                        let endLabel;
                                        if (ev.kind === "busy") {
                                            startLabel = ev.startLabel;
                                            endLabel = ev.endLabel;
                                        } else {
                                            startLabel = minutesToLabel(slots[ev.startIdx]);
                                            const endMinutes =
                                                ev.endIdx < slots.length ? slots[ev.endIdx] : slots[slots.length - 1] + SLOT_MINUTES;
                                            endLabel = minutesToLabel(endMinutes);
                                        }
                                        const isSingleSlot = ev.endIdx - ev.startIdx <= 1;
                                        const widthPct = 100 / ev.colCount;
                                        const leftPct = ev.colIndex * widthPct;
                                        const style = {
                                            top: top + EVENT_V_GAP / 2,
                                            height: Math.max(height - EVENT_V_GAP, 4),
                                            left: `calc(${leftPct}% + 2px)`,
                                            width: `calc(${widthPct}% - 4px)`,
                                        };
                                        const label = ev.kind === "busy" ? ev.title : "Available";

                                        // short or narrow (overlapping) blocks are the ones whose title/time
                                        // actually get cut off — only those expand on hover. Skipped for
                                        // available blocks: expanding would cover the remove (×) button.
                                        const isCutOff = ev.kind === "busy" && (isSingleSlot || ev.colCount > 1);
                                        const contentClassName = isCutOff
                                            ? `${styles.blockContent} ${styles.blockContentExpandable}`
                                            : styles.blockContent;

                                        if (ev.kind === "busy") {
                                            return (
                                                <div
                                                    key={ev.id}
                                                    className={styles.busyBlock}
                                                    style={style}
                                                >
                                                    <div className={contentClassName}>
                                                        {isSingleSlot ? (
                                                            <div className={styles.blockRowInline}>
                                                                <p className={styles.blockTitle}>{label}</p>
                                                                <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className={styles.blockTitle}>{label}</p>
                                                                <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={ev.id} className={styles.availableBlock} style={style}>
                                                {/* rendered after blockContent so it always paints on top and is
                                                    never clipped, even when the block is too small to show the
                                                    full title/time — you should never need to resize just to delete */}
                                                <div className={contentClassName}>
                                                    {isSingleSlot ? (
                                                        <div className={styles.blockRowInline}>
                                                            <p className={styles.blockTitle}>{label}</p>
                                                            <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className={styles.blockTitle}>{label}</p>
                                                            <p className={styles.blockTime}>{startLabel} – {endLabel}</p>
                                                        </>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.blockRemoveBtn}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onClick={() => removeBlock(ev.id)}
                                                    aria-label="Remove availability block"
                                                >
                                                    ×
                                                </button>
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
                            );
                        })}
                    </div>
                </div>
            </div>

            <p className={styles.hintText}>
                Click and drag on any day column to add or extend an availability block
            </p>

            <div className={styles.legend}>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.legendSwatchBusy}`} />
                    Busy
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.legendSwatchAvailable}`} />
                    Available
                </span>
            </div>

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