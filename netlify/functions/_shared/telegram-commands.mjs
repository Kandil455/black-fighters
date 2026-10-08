/**
 * telegram-commands.mjs — the SINGLE source of truth for what the bot can do.
 *
 * Three consumers must never disagree:
 *   1. the dispatcher in telegram-engine.mjs,
 *   2. the `/help` text students read,
 *   3. `setMyCommands` (the Telegram command menu) and the web settings panel.
 *
 * Before this module they DID disagree: `/help` advertised `/profile` and
 * `/plans`, neither of which had a text handler, so following the instructions
 * produced no response at all.
 *
 * When you add a command, add it here AND add its handler; the drift guard in
 * tests/unit/telegramCommands.test.mjs fails otherwise.
 */

export const COMMANDS = [
  { command: "/start", alt: "/menu", descriptionAr: "القائمة الرئيسية", descriptionEn: "Main menu", scope: "student" },
  {
    command: "/link",
    alt: "/bind",
    descriptionAr: "ربط حسابك بكود من المنصة",
    descriptionEn: "Link your account with a code",
    scope: "student",
    requiresCode: true,
  },
  { command: "/unlink", descriptionAr: "فصل حساب التيليجرام", descriptionEn: "Unlink Telegram", scope: "student" },
  { command: "/quiz", alt: "/ebe", descriptionAr: "كويزات النظري (EBE)", descriptionEn: "Theory quizzes (EBE)", scope: "student", requiresPlan: true },
  { command: "/ospe", descriptionAr: "كويزات العملي والصور (OSPE)", descriptionEn: "Practical/OSPE quizzes", scope: "student", requiresPlan: true },
  { command: "/summary", alt: "/تلخيص", descriptionAr: "ملخص ذكي من نص أو موضوع", descriptionEn: "AI summary from text or a topic", scope: "student", requiresPlan: true },
  { command: "/emergency", descriptionAr: "راوند الطوارئ", descriptionEn: "Emergency round hub", scope: "student", requiresPlan: true },
  { command: "/plan", alt: "/خطة", descriptionAr: "خطة مذاكرة", descriptionEn: "Study plan", scope: "student", requiresPlan: true },
  { command: "/grill-me", alt: "/شفوي", descriptionAr: "اختبار شفوي سريع", descriptionEn: "Quick oral drill", scope: "student", requiresPlan: true },
  { command: "/boost", alt: "/تعميق", descriptionAr: "تعميق وتحليل موضوع", descriptionEn: "Deepen/analyse a topic", scope: "student", requiresPlan: true },
  { command: "/goal", alt: "/هدف", descriptionAr: "تحديد هدف مذاكرة", descriptionEn: "Set a study goal", scope: "student", requiresPlan: true },
  { command: "/browser", alt: "/بحث", descriptionAr: "بحث في المراجع", descriptionEn: "Search references", scope: "student", requiresPlan: true },
  { command: "/app", alt: "/apk", descriptionAr: "تحميل تطبيق الأندرويد", descriptionEn: "Download the Android app", scope: "student" },
  { command: "/help", alt: "/مساعدة", descriptionAr: "قائمة الأوامر", descriptionEn: "Command list", scope: "student" },
  { command: "/stats", descriptionAr: "إحصائيات المنصة (أدمن)", descriptionEn: "Platform stats (admin)", scope: "admin" },
];

/** Proactive message kinds the platform may send (mirrors telegram-notify.mjs). */
export const NOTIFICATION_TYPES = ["review_due", "summary_ready", "quiz_graded", "payment", "streak"];

/**
 * Commands registered with Telegram's own menu (setMyCommands).
 * Telegram only accepts `^[a-z0-9_]{1,32}$`, so `grill-me` is published as
 * `grill_me` — the dispatcher accepts both spellings.
 */
export function telegramMenuCommands() {
  const seen = new Set();
  const out = [];
  for (const c of COMMANDS) {
    const name = c.command
      .replace(/^\//, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 32);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      command: name,
      description: (c.descriptionEn || c.descriptionAr || c.command).slice(0, 256),
    });
  }
  return out.slice(0, 100);
}

export default COMMANDS;
