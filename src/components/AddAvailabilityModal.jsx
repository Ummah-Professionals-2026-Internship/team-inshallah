import styles from "./AvailabilityModal.module.css";

const METHODS = [
    { id: "google", label: "Autofill with Google Calendar" },
    { id: "apple", label: "Autofill with Apple Calendar" },
    { id: "outlook", label: "Autofill with Outlook Calendar" },
    { id: "manual", label: "Manually" },
];

export default function AddAvailabilityModal({ onClose, onSelect }) {
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.methodModal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.methodTitle}>How would you like to add your availability?</h2>
                <div className={styles.methodList}>
                    {METHODS.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            className={styles.methodBtn}
                            onClick={() => onSelect(m.id)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}