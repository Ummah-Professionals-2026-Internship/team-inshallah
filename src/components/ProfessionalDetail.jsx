import styles from "./ProfessionalDetail.module.css";

export default function ProfessionalDetail({ professional, onClose, onSchedule }) {
  if (!professional) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 className={styles.heading}>Profile Picture</h2>

        <div className={styles.avatar}>
          {professional.photo ? (
            <img src={professional.photo} alt={professional.name} />
          ) : (
            <div className={styles.avatarPlaceholder} />
          )}
        </div>

        <div className={styles.field}>
          <label>About</label>
          <div className={styles.aboutBox}>{professional.aboutMe || "—"}</div>
        </div>

        <div className={styles.field}>
          <label>Name</label>
          <div className={styles.value}>{professional.name || "—"}</div>
        </div>

        <div className={styles.field}>
          <label>Phone Number</label>
          <div className={styles.value}>{professional.phone || "—"}</div>
        </div>

        <div className={styles.field}>
          <label>Industry</label>
          <div className={styles.value}>{professional.industry || "—"}</div>
        </div>

        <div className={styles.field}>
          <label>Résumé</label>
          {professional.resume ? (
            <a href={professional.resume} target="_blank" rel="noreferrer" className={styles.resumeLink}>
              View résumé
            </a>
          ) : (
            <div className={styles.value}>—</div>
          )}
        </div>

        <div className={styles.field}>
          <label>Other Information</label>
          <div className={styles.aboutBox}>{professional.otherInformation || "—"}</div>
        </div>

        <button type="button" className={styles.scheduleBtn} onClick={onSchedule}>
          Schedule Meeting
        </button>
      </div>
    </div>
  );
}