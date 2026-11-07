// ── GENERATED AVATAR & RPG COSMETICS SYSTEM ──────────────────────────
// Full RPG Game Cosmetics definitions: Drawn Dragon/Winged Frames,
// Animated Game Scene Banners, 3D Collectible Orbit Relics, and Winged Prestige Titles.

export const AVATAR_STYLES = [
  { id: "ocean",    gradient: "linear-gradient(135deg,#00e5ff 0%,#0066ff 100%)", bg: "#0a1a2e", label: "محيط السايبر · Ocean" },
  { id: "aurora",   gradient: "linear-gradient(135deg,#00ff88 0%,#00b8ff 100%)", bg: "#0a1f1a", label: "زمرد الفايترز · Emerald" },
  { id: "sunset",   gradient: "linear-gradient(135deg,#ff6a00 0%,#ee0979 100%)", bg: "#2a0a14", label: "لهب الشفق · Sunset" },
  { id: "royal",    gradient: "linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)", bg: "#1a0a2e", label: "العرش الملكي · Royal" },
  { id: "ember",    gradient: "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)", bg: "#2a1400", label: "جمر المعركة · Ember" },
  { id: "midnight", gradient: "linear-gradient(135deg,#1e293b 0%,#334155 100%)", bg: "#0f172a", label: "فارس الليل · Midnight" },
  { id: "gold",     gradient: "linear-gradient(135deg,#fde68a 0%,#f59e0b 50%,#92400e 100%)", bg: "#1a1200", label: "ذهب السيادة · Gold" },
  { id: "ice",      gradient: "linear-gradient(135deg,#e0f2fe 0%,#38bdf8 50%,#0ea5e9 100%)", bg: "#0a1e2e", label: "صقيع الشمال · Ice" },
  { id: "forest",   gradient: "linear-gradient(135deg,#10b981 0%,#064e3b 100%)", bg: "#0a1a12", label: "درع الغابة · Forest" },
  { id: "neon",     gradient: "linear-gradient(135deg,#ff00d4 0%,#7b00ff 50%,#00e5ff 100%)", bg: "#1a0a2e", label: "طاقة النيون · Neon" },
  { id: "crimson",  gradient: "linear-gradient(135deg,#991b1b 0%,#dc2626 50%,#f87171 100%)", bg: "#1f0a0a", label: "الدم القرمزي · Crimson" },
  { id: "slate",    gradient: "linear-gradient(135deg,#475569 0%,#94a3b8 100%)", bg: "#1e293b", label: "فولاذ المدرع · Steel" },
];

export const PREMIUM_AVATARS = AVATAR_STYLES.map((s) => ({
  id: s.id,
  url: s.gradient,
  label: s.label,
  gradient: s.gradient,
  bg: s.bg,
}));

export function getAvatarStyle(id) {
  return AVATAR_STYLES.find((s) => s.id === id) || AVATAR_STYLES[0];
}
export function styleForName(name = "") {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_STYLES[sum % AVATAR_STYLES.length];
}

// ── RPG ANIMATED AVATAR FRAMES ──────────────────────────
// Every frame includes an RPG `archetype` ("dragon", "wyvern", "phoenix", "thunder", "wings", "crown", "runes", "shield")
// rendered as multi-layered animated vector art in AnimatedAvatar.jsx.
export const PROFILE_COLORS = {
  cyan:    { label: "سماوي نيون · Cyan",     hex: "#00e5ff" },
  green:   { label: "زمردي · Emerald",       hex: "#19f08c" },
  gold:    { label: "ذهبي ملكي · Gold",      hex: "#fbbf24" },
  purple:  { label: "بنفسجي · Purple",       hex: "#a855f7" },
  red:     { label: "قرمزي ناري · Crimson",  hex: "#ef4444" },
  pink:    { label: "وردي · Rose",           hex: "#ec4899" },
  blue:    { label: "أزرق برق · Electric",   hex: "#3b82f6" },
};

// ── REMOVED ──────────────────────────────────────────────────────────────
// AVATAR_FRAMES, PROFILE_BANNERS, ORBIT_EFFECTS, PROFILE_TITLES, TITLE_COLORS
// and their helpers (ownsFrame/ownsBanner/ownsTitle) were deleted with the
// RPG cosmetics feature (owner decision, Nov 2026). Only the avatar gradients
// and the profile accent colours remain, because the UI still uses them.

export const TIER_LABELS = {
  vanguard:  { label: "طليعة المحاربين · Vanguard", labelAr: "طليعة المحاربين", labelEn: "Vanguard",  color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.4)" },
  common:    { label: "طليعة المحاربين · Vanguard", labelAr: "طليعة المحاربين", labelEn: "Vanguard",  color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.4)" },
  rare:      { label: "نخبة الميدان · Rare",        labelAr: "نخبة الميدان",    labelEn: "Rare",      color: "#19f08c", bg: "rgba(25,240,140,0.14)", border: "rgba(25,240,140,0.4)" },
  epic:      { label: "ملحمي · Epic",              labelAr: "ملحمي",           labelEn: "Epic",      color: "#c084fc", bg: "rgba(192,132,252,0.15)", border: "rgba(192,132,252,0.45)" },
  legendary: { label: "أسطوري · Mythic",           labelAr: "أسطوري",          labelEn: "Mythic",    color: "#fbbf24", bg: "rgba(251,191,36,0.16)", border: "rgba(251,191,36,0.5)" },
  exclusive: { label: "سيادة خاصة · Supreme",       labelAr: "سيادة خاصة",      labelEn: "Supreme",   color: "#f43f5e", bg: "rgba(244,63,94,0.16)",  border: "rgba(244,63,94,0.5)" },
};
