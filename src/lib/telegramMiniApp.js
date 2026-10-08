/**
 * telegramMiniApp.js — real Telegram WebApp bootstrap.
 *
 * WHAT WAS MISSING: `/tg` read `start_param` and rendered hardcoded demo content.
 * It never sent `initData` to the server, never signed in, and wrote nothing back
 * — so "the Mini App" was a mock-up, not the platform inside Telegram. The
 * verification endpoint existed the whole time and had no caller.
 */

const AUTH_ENDPOINT = "/api/telegram-miniapp-auth";
const SDK_SRC = "https://telegram.org/js/telegram-web-app.js";

export function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

/**
 * Loads the Telegram Mini App SDK on demand.
 *
 * Deliberately NOT a global <script> in index.html: the strict CSP only permits
 * `https://telegram.org` on the /tg route, so a global tag would be blocked on
 * every other page (or force us to widen CSP platform-wide for a script only the
 * Mini App needs).
 *
 * Resolves quietly when the SDK is already present (Telegram's own webview
 * injects it) or when the network is unavailable — callers then fall back to the
 * `not-in-telegram` state rather than hanging.
 */
export function loadTelegramSdk({ timeoutMs = 2500 } = {}) {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Telegram?.WebApp) return Promise.resolve(true);

  const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => {
      const done = () => resolve(Boolean(window.Telegram?.WebApp));
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(Boolean(window.Telegram?.WebApp)), timeoutMs);
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      resolve(Boolean(window.Telegram?.WebApp));
    };
    script.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export function getInitData() {
  const webApp = getTelegramWebApp();
  const raw = webApp?.initData;
  return typeof raw === "string" && raw.length > 0 ? raw : "";
}

export function isInsideTelegram() {
  return Boolean(getInitData());
}

/**
 * Makes the Mini App fill the Telegram viewport and adopt Telegram's palette.
 * Telegram's own header/background colours are the ones the user's client theme
 * expects — ignoring them was why /tg looked like a foreign page inside the app.
 */
export function applyTelegramChrome() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.ready?.();
    webApp.expand?.();
    const scheme = webApp.colorScheme === "light" ? "light" : "dark";
    document.documentElement.dataset.tgScheme = scheme;
    webApp.setHeaderColor?.("#07080C");
    webApp.setBackgroundColor?.("#07080C");
  } catch {
    /* Older clients: the CSS defaults already match the platform palette. */
  }
}

/** Haptic feedback that is a no-op outside Telegram. */
export function haptic(style = "light") {
  try {
    getTelegramWebApp()?.HapticFeedback?.impactOccurred?.(style);
  } catch {
    /* ignore */
  }
}

/**
 * Verifies Telegram's signed `initData`, then signs the browser into Firebase with
 * the custom token the server mints. Returns a discriminated result instead of
 * throwing so the UI can render a precise state.
 *
 * @returns {Promise<{status:'authenticated'|'not-in-telegram'|'unlinked'|'error', uid?:string, telegramUser?:object, error?:string}>}
 */
export async function bootstrapTelegramSession({ signInWithCustomToken, auth } = {}) {
  const initData = getInitData();
  if (!initData) return { status: "not-in-telegram" };

  let payload;
  try {
    const res = await fetch(AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });
    payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.ok) {
      return { status: "error", error: payload?.error || `HTTP ${res.status}` };
    }
  } catch (err) {
    return { status: "error", error: err?.message || "NETWORK_ERROR" };
  }

  // A custom token means the server resolved (or created) a platform account for
  // this Telegram user. Signing in makes every Firestore read/write the norm.
  if (payload.customToken && auth && typeof signInWithCustomToken === "function") {
    try {
      await signInWithCustomToken(auth, payload.customToken);
    } catch (err) {
      return { status: "error", uid: payload.uid, error: `SIGN_IN_FAILED: ${err?.message}` };
    }
  }

  return {
    status: payload.customToken ? "authenticated" : "unlinked",
    uid: payload.uid,
    telegramUser: payload.telegramUser || null,
  };
}

/** Asks Telegram to open the full platform (used by "open in browser" actions). */
export function openPlatform(path = "/") {
  const webApp = getTelegramWebApp();
  const url = `${window.location.origin}${path}`;
  try {
    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }
  } catch {
    /* fall through */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export default {
  getTelegramWebApp,
  loadTelegramSdk,
  getInitData,
  isInsideTelegram,
  applyTelegramChrome,
  haptic,
  bootstrapTelegramSession,
  openPlatform,
};
