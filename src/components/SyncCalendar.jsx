import styles from "./AvailabilityModal.module.css";

function GoogleIcon() {
    return (
        <svg viewBox="0 0 48 48" width="28" height="28">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.4 0-13.8 4.1-17.1 10.2z" />
            <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.9 39.6 16.5 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.4 5.4C41.5 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
        </svg>
    );
}

function OutlookIcon() {
    return (
        <svg viewBox="0 0 48 48" width="28" height="28">
            <rect x="20" y="9" width="24" height="30" rx="2" fill="#1976D2" />
            <rect x="20" y="9" width="24" height="7" fill="#42A5F5" />
            <rect x="20" y="30" width="24" height="9" fill="#0D47A1" />
            <rect x="4" y="12" width="20" height="24" rx="2" fill="#0288D1" />
            <ellipse cx="14" cy="24" rx="6" ry="7" fill="#ffffff" />
            <ellipse cx="14" cy="24" rx="3.6" ry="4.3" fill="#0288D1" />
        </svg>
    );
}

const METHODS = [
    { id: "google", label: "Autofill with Google Calendar", icon: <GoogleIcon /> },
    { id: "outlook", label: "Autofill with Outlook Calendar", icon: <OutlookIcon /> },
    { id: "manual", label: "Manually", icon: null },
];

export default function SyncCalendar({ onClose, onSelect }) {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.methodModal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.methodTitle}>How would you like to add your availability?</h2>
                <div className={styles.methodList}>
                    {METHODS.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className={`${styles.methodBtn} ${!m.icon ? styles.methodBtnCentered : ""}`}
                            onClick={() => onSelect(m.id)}
                        >
                            {m.icon && <span className={styles.methodIcon}>{m.icon}</span>}
                            <span className={m.icon ? styles.methodLabel : styles.methodLabelCentered}>
                                {m.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}