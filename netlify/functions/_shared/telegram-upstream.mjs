/**
 * telegram-upstream.mjs — platform-owned update router + forwarder.
 *
 * The platform webhook stays the sole Telegram registration. Updates that
 * belong to the PLATFORM account-engine (payments/alpha, deep-link login,
 * site-quiz grading, account commands) are handled locally; everything else
 * (study chatter, files, questions, the rich study-bot UX) is forwarded to
 * the standalone bot service when TELEGRAM_UPSTREAM_BOT_URL is configured.
 *
 * Fail-open design: if no upstream is configured or the upstream is down,
 * the update falls back to the platform engine — the bot is never silent.
 */

const UPSTREAM_TIMEOUT_MS = 8_000;

/** Callback data spaces claimed by the platform engine. */
const PLATFORM_CALLBACK_PREFIXES = [
  "alpha_approve_", "alpha_approve_code", "alpha_reject:",
  "browse_folder:", "file_quiz_count:", "file_summary_type:",
  "optout:", "ospe_next:", "ospe_start", "ospe_toggle:",
  "run_custom_quiz:", "start_ebe:",
  "view_course_quiz:", "view_course_sum:",
  "cmd_", "epnu",
];
const PLATFORM_CALLBACK_EXACT = new Set([
  "cmd_menu", "cmd_alpha_stats", "cmd_emergency", "epnu_menu",
  "cmd_ebe_menu", "cmd_quiz", "cmd_ospe_menu",
  "cmd_profile", "cmd_plans", "cmd_my_courses", "cmd_folders",
]);

/** Platform account commands (lowercased compare). */
const PLATFORM_TEXT_PREFIXES = [
  "/start login_", "/start link_", "/start course_quiz:",
  "/login", "/link", "/unlink", "/فصل", "/stats",
  "/courses", "/موادي", "/folders", "/مجلداتي",
];

/**
 * Decide who should speak for this update.
 * @returns {"platform"|"upstream"}
 */
export function routeTelegramUpdate(update) {
  if (!update || typeof update !== "object") return "platform";

  // Site-quiz grading lives ONLY in the platform engine.
  if (update.poll_answer) return "platform";

  if (update.callback_query) {
    const data = String(update.callback_query.data || "");
    if (PLATFORM_CALLBACK_EXACT.has(data)) return "platform";
    if (PLATFORM_CALLBACK_PREFIXES.some((p) => data.startsWith(p))) return "platform";
    // Unknown study-bot buttons belong to the upstream bot.
    return "upstream";
  }

  const text = String(update.message?.text || "").trim().toLowerCase();
  if (text && PLATFORM_TEXT_PREFIXES.some((p) => text.startsWith(p))) return "platform";

  // Everything else — /start, /help, docs/photos, questions, small talk —
  // is the standalone study bot's stage.
  return "upstream";
}

export function upstreamConfig() {
  return {
    url: String(process.env.TELEGRAM_UPSTREAM_BOT_URL || "").trim(),
    secret: String(process.env.TELEGRAM_UPSTREAM_SECRET || "").trim(),
    timeoutMs: UPSTREAM_TIMEOUT_MS,
  };
}

/**
 * Forward an update to the standalone bot service. Never throws; the caller
 * falls back to the platform engine when this returns false.
 * @returns {Promise<boolean>}
 */
export async function forwardToUpstream(update) {
  const { url, secret, timeoutMs } = upstreamConfig();
  if (!url) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // grammY's webhookCallback validates this header natively — sending it
        // through keeps the upstream service untouched and refuses impostors.
        "x-telegram-bot-api-secret-token": secret,
        "x-bf-upstream-secret": secret,
      },
      body: JSON.stringify(update),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[telegram-upstream] upstream answered ${res.status} — platform fallback engaged`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[telegram-upstream] forward failed (${err?.name === "AbortError" ? "timeout" : err?.message}) — platform fallback engaged`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
