import { useState } from "react";
import styles from "./ChatPanel.module.css";

// Round avatar for chat rows. Falls back to the same grey silhouette the
// dashboard header uses when someone hasn't uploaded a picture.
export default function ChatAvatar({ src, name, size = 44 }) {
  // Picture URLs are signed and expire, so a stale one can 403 while the panel
  // is open. Tracking the URL that failed (rather than a plain boolean) means
  // the next poll's fresh URL gets a chance to load.
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && failedSrc !== src;

  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {showImage ? (
        <img src={src} alt={name || "User"} onError={() => setFailedSrc(src)} />
      ) : (
        <svg viewBox="0 0 100 100" fill="none" width="100%" height="100%">
          <circle cx="50" cy="50" r="50" fill="#b9bcc3" />
          <circle cx="50" cy="38" r="18" fill="#ffffff" />
          <ellipse cx="50" cy="85" rx="30" ry="22" fill="#ffffff" />
        </svg>
      )}
    </div>
  );
}
