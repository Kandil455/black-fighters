/**
 * securityGuard.js
 * Black Fighters Anti-Tampering & Client Protection Shield.
 * - Protects source code & API interactions against basic inspection in production.
 * - Disables DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U).
 * - Restricts right-click context menu on sensitive elements.
 * - Prevents copying/stealing of proprietary exam questions and summaries.
 * - Connects with Remote Lockdown / Emergency Kill Switch from Alpha Command Center.
 */
let lockdownSubscribed = false;
let currentLockState = {
  isLocked: false,
  message: "المنصة في وضع الصيانة والتحديث الأمني الآن. يرجى المحاولة لاحقاً.",
  messageEn: "The platform is currently under maintenance. Please check back shortly.",
};

const listeners = new Set();

export function subscribeToLockdown(callback) {
  listeners.add(callback);
  callback(currentLockState);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb(currentLockState);
    } catch {}
  });
}

/**
 * Initialize Anti-Tamper & Security Shield
 */
export function initSecurityGuard() {
  if (typeof window === "undefined") return;

  // 1. Prevent DevTools & Code Inspection Shortcuts in production
  const isProd = import.meta.env.PROD || window.location.hostname !== "localhost";

  if (isProd) {
    window.addEventListener("keydown", (e) => {
      // F12
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { capture: true });

    // Restrict context menu on right click
    window.addEventListener("contextmenu", (e) => {
      // Allow on interactive form inputs (input, textarea) so users can paste/type
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) {
        return;
      }
      e.preventDefault();
    }, { capture: true });
  }

  // 2. Real-time Emergency Kill Switch listener from Firestore
  if (!lockdownSubscribed) {
    lockdownSubscribed = true;
    startLockdownListener();
  }
}

async function startLockdownListener() {
  try {
    const [{ onSnapshot, doc }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("@/lib/firebaseDb"),
    ]);
    if (!db || !isFirestoreLike(db)) return;
    onSnapshot(doc(db, "system_settings", "lockdown"), (snapshot) => {
      if (!snapshot || !snapshot.exists) return;
      const data = snapshot.data() || {};
      currentLockState = {
        isLocked: Boolean(data.active),
        message: data.message || currentLockState.message,
        messageEn: data.messageEn || currentLockState.messageEn,
      };
      notifyListeners();
    }, () => {});
  } catch {}
}

function isFirestoreLike(value) {
  return Boolean(value) && typeof value === "object" && Object.keys(value).length > 0;
}
