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

    // finalized blocks: { id, dayKey, startIdx, endIdx }
    const [blocks, setBlocks] = useState([]);
    const [busy, setBusy] = useState(new Set());
    const [syncing, setSyncing] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [dragging, setDragging] = useState(null); // { dayKey, startIdx, hoverIdx }

    const busyKey = (dayKey, slotStart) => `${dayKey}__${slotStart}`;

    const isInDragRange = (dayKey, idx) => {
        if (!dragging || dragging.dayKey !== dayKey) return false;
        const lo = Math.min(dragging.startIdx, dragging.hoverIdx);
        const hi = Math.max(dragging.startIdx, dragging.hoverIdx);
        return idx >= lo && idx <= hi;
    };

    // drag allowed anywhere, can reselect over time
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

                    // any block that overlaps OR touches the new range gets merged in
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
        setSyncing(true);
        try {
            const res = await fetch(`${API}/api/professional/availability/sync`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ provider }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.busySlots) {
                setBusy(new Set(data.busySlots.map((b) => busyKey(b.dayKey, b.slot))));
            }
        } catch {
            // connecting backend next week
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async () => {
        const payloadBlocks = blocks.map((b) => ({
            dayKey: b.dayKey,
            startSlot: slots[b.startIdx],
            endSlot: b.endIdx < slots.length ? slots[b.endIdx] : slots[slots.length - 1] + SLOT_MINUTES,
        }));
        try {
            await fetch(`${API}/api/professional/availability/blocks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    startTime: availability?.startTime,
                    endTime: availability?.endTime,
                    timezone: availability?.timezone,
                    blocks: payloadBlocks,
                }),
            });
        } catch {
            // connecting backend next week
        }
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

            <div className={styles.footer}>
                {syncing && <span className={styles.syncingLabel}>Syncing calendar…</span>}
                <button type="button" className={styles.saveBtn} onClick={handleSave}>
                    Save Availability
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