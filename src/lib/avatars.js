// ── GENERATED AVATAR SYSTEM ──────────────────────────
// No static AI images — avatars are generated from initials + gradients.
// User uploads are still supported via avatar_url. This array drives the color picker.

export const AVATAR_STYLES = [
  { id: "ocean",  gradient: "linear-gradient(135deg,#00e5ff 0%,#0066ff 100%)", bg: "#0a1a2e", label: "Ocean" },
  { id: "sunset", gradient: "linear-gradient(135deg,#ff6a00 0%,#ee0979 100%)", bg: "#2a0a14", label: "Sunset" },
  { id: "aurora", gradient: "linear-gradient(135deg,#00ff88 0%,#00b8ff 100%)", bg: "#0a1f1a", label: "Aurora" },
  { id: "royal",  gradient: "linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)", bg: "#1a0a2e", label: "Royal" },
  { id: "ember",  gradient: "linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)", bg: "#2a1400", label: "Ember" },
  { id: "midnight", gradient: "linear-gradient(135deg,#1e293b 0%,#334155 100%)", bg: "#0f172a", label: "Midnight" },
  { id: "gold",   gradient: "linear-gradient(135deg,#fde68a 0%,#f59e0b 50%,#92400e 100%)", bg: "#1a1200", label: "Gold" },
  { id: "ice",    gradient: "linear-gradient(135deg,#e0f2fe 0%,#38bdf8 50%,#0ea5e9 100%)", bg: "#0a1e2e", label: "Ice" },
  { id: "forest", gradient: "linear-gradient(135deg,#10b981 0%,#064e3b 100%)", bg: "#0a1a12", label: "Forest" },
  { id: "neon",   gradient: "linear-gradient(135deg,#ff00d4 0%,#7b00ff 50%,#00e5ff 100%)", bg: "#1a0a2e", label: "Neon" },
  { id: "crimson",gradient: "linear-gradient(135deg,#991b1b 0%,#dc2626 50%,#f87171 100%)", bg: "#1f0a0a", label: "Crimson" },
  { id: "slate",  gradient: "linear-gradient(135deg,#475569 0%,#94a3b8 100%)", bg: "#1e293b", label: "Slate" },
];

// Backwards compat — maps old image URLs to style ids (for existing users)
export const PREMIUM_AVATARS = AVATAR_STYLES.map(s => ({ id: s.id, url: s.gradient, label: s.label, gradient: s.gradient, bg: s.bg }));

export function getAvatarStyle(id) {
  return AVATAR_STYLES.find(s => s.id === id) || AVATAR_STYLES[0];
}
export function styleForName(name = "") {
  const sum = [...name].reduce((a,c) => a + c.charCodeAt(0), 0);
  return AVATAR_STYLES[sum % AVATAR_STYLES.length];
}

// لكل إطار شكل هندسي وزخارف، وليس مجرد لون مختلف لنفس الحلقة الدائرية.
// price = 0 يعني مجاني/مملوك من البداية.
export const AVATAR_FRAMES = {
  none:    { label: "None", gradient: "transparent", price: 0, special: null, glow: "transparent", speed: 0, shape: "circle" },
  cyan:    { label: "Neon Sky", gradient: "conic-gradient(from 0deg,#00e5ff,#00ff9d,#111827,#00e5ff)", price: 300, special: "aura", glow: "#00e5ff", speed: 7, shape: "circle" },

  // VIP SYSTEM
  vip1: { label: "VIP 1", gradient: "conic-gradient(from 0deg,#60a5fa,#3b82f6,#1d4ed8,#60a5fa)", price: -1, special: "aura", glow: "#3b82f6", speed: 4, shape: "circle", exclusive: true },
  vip2: { label: "VIP 2", gradient: "conic-gradient(from 0deg,#34d399,#10b981,#047857,#34d399)", price: -1, special: "aura", glow: "#10b981", speed: 3, shape: "hexagon", exclusive: true },
  vip3: { label: "VIP 3", gradient: "conic-gradient(from 0deg,#f472b6,#ec4899,#be185d,#f472b6)", price: -1, special: "aura", glow: "#ec4899", speed: 3, shape: "square", exclusive: true },
  vip4: { label: "VIP 4", gradient: "conic-gradient(from 0deg,#a78bfa,#8b5cf6,#6d28d9,#a78bfa)", price: -1, special: "crystal", glow: "#8b5cf6", speed: 2, shape: "diamond", exclusive: true },
  vip5: { label: "VIP 5", gradient: "conic-gradient(from 0deg,#fbbf24,#f59e0b,#b45309,#fbbf24)", price: -1, special: "fire", glow: "#f59e0b", speed: 1.5, shape: "star", exclusive: true },
  vip6: { label: "VIP 6", gradient: "conic-gradient(from 0deg,#f87171,#ef4444,#b91c1c,#f87171)", price: -1, special: "royal", glow: "#ef4444", speed: 1, shape: "shield", exclusive: true },

  ironGuard: { label: "Iron Guard", img: "/frames/cc0/iron-guard.png", price: 350, special: "aura", glow: "#94a3b8", shape: "square" },
  emeraldTech: { label: "Emerald Tech", img: "/frames/cc0/emerald-tech.png", price: 450, special: "crystal", glow: "#34d399", shape: "square" },
  crimsonSteel: { label: "Crimson Steel", img: "/frames/cc0/crimson-steel.png", price: 550, special: "fire", glow: "#ef4444", shape: "square" },
  ivoryTemple: { label: "Ivory Temple", img: "/frames/cc0/ivory-temple.png", price: 650, special: "royal", glow: "#fef3c7", shape: "square" },
  runeStone: { label: "Rune Stone", img: "/frames/cc0/rune-stone.png", price: 750, special: "shadow", glow: "#a78bfa", shape: "square" },
  cyberPlate: { label: "Cyber Plate", img: "/frames/cc0/cyber-plate.png", price: 850, special: "thunder", glow: "#22d3ee", shape: "square" },
  moonMarble: { label: "Moon Marble", img: "/frames/cc0/moon-marble.png", price: 950, special: "ice", glow: "#bae6fd", shape: "square" },
  royalWood: { label: "Royal Wood", img: "/frames/cc0/royal-wood.png", price: 1100, special: "royal", glow: "#fbbf24", shape: "square" },
  ancientStone: { label: "Ancient Stone", img: "/frames/cc0/ancient-stone.png", price: 1250, special: "shadow", glow: "#94a3b8", shape: "square" },
  neonAlloy: { label: "Neon Alloy", img: "/frames/cc0/neon-alloy.png", price: 1400, special: "aura", glow: "#22d3ee", shape: "square" },
  frostTemple: { label: "Frost Temple", img: "/frames/cc0/frost-temple.png", price: 1600, special: "ice", glow: "#e0f2fe", shape: "square" },
  obsidianMetal: { label: "Obsidian Metal", img: "/frames/cc0/obsidian-metal.png", price: 1800, special: "shadow", glow: "#a855f7", shape: "square" },
  celestialMarble: { label: "Celestial Marble", img: "/frames/cc0/celestial-marble.png", price: 2000, special: "crystal", glow: "#f5d0fe", shape: "square" },
  titaniumVault: { label: "Titanium Vault", img: "/frames/cc0/titanium-vault.png", price: 2200, special: "royal", glow: "#fde68a", shape: "square" },
  // ── True Inferno & High-Performance Animated CSS Frames (300 to 3000 Credits) ──
  firering: { label: "True Inferno", gradient: "conic-gradient(from 0deg,#7f1d1d,#ef4444,#f97316,#facc15,#7f1d1d)", price: 2400, special: "fire", glow: "#f97316", speed: 5, shape: "portal", effectVideo: "/effects/inferno-ring.webm", effectPoster: "/effects/inferno-ring.jpg" },
  cyberDragon: { label: "Cyber Dragon", gradient: "conic-gradient(from 0deg,#00f2fe,#10b981,#00e5ff,#059669,#00f2fe)", price: 2600, special: "thunder", glow: "#00f2fe", speed: 4, shape: "circle", cssClass: "frame-cyber-dragon" },
  blazingAura: { label: "Fiery Aura", gradient: "conic-gradient(from 0deg,#ff1e00,#ff6200,#ffd000,#ff1e00)", price: 2750, special: "fire", glow: "#ff4d00", speed: 3.5, shape: "circle", cssClass: "frame-blazing-aura" },
  neonQuantum: { label: "Neon Particles", gradient: "conic-gradient(from 0deg,#ff0080,#7928ca,#00f2fe,#ff0080)", price: 2850, special: "aura", glow: "#00f2fe", speed: 3, shape: "circle", cssClass: "frame-neon-quantum" },
  arcaneRunes: { label: "Arcane Runes", gradient: "conic-gradient(from 0deg,#7c3aed,#c084fc,#fbbf24,#7c3aed)", price: 2950, special: "crystal", glow: "#a855f7", speed: 5, shape: "circle", cssClass: "frame-arcane-runes" },
  spartanApex: { label: "Spartan Glory", gradient: "conic-gradient(from 0deg,#00f2fe,#fbbf24,#0f172a,#00f2fe)", price: 3000, special: "royal", glow: "#fbbf24", speed: 4, shape: "circle", cssClass: "frame-spartan-apex" },
};

// الإطارات المملوكة افتراضياً للجميع
export const DEFAULT_FRAMES = ["none"];

export function ownsFrame(user, key) {
  if (DEFAULT_FRAMES.includes(key)) return true;
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  return Array.isArray(user?.owned_frames) && user.owned_frames.includes(key);
}

// بانرات البروفايل — خلفية علوية متدرّجة مع تأثير. price = 0 مجاني.
export const PROFILE_BANNERS = {
  none:    { label: "None", css: "transparent", price: 0, special: null },
  ocean:   { label: "Ocean Pulse", css: "linear-gradient(120deg,#0ea5e9,#2563eb,#7c3aed)", price: 40, special: "waves" },
  sunset:  { label: "Solar Dusk", css: "linear-gradient(120deg,#f97316,#ec4899,#8b5cf6)", price: 60, special: "rays" },
  forest:  { label: "Emerald Field", css: "linear-gradient(120deg,#065f46,#10b981,#a3e635)", price: 70, special: "dust" },
  galaxy:  { label: "Deep Galaxy", css: "linear-gradient(120deg,#1e1b4b,#7c3aed,#db2777)", price: 90, special: "stars" },
  fire:    { label: "Inferno Field", css: "linear-gradient(120deg,#7f1d1d,#ef4444,#f59e0b)", price: 100, special: "embers" },
  aurora:  { label: "Aurora 3D", css: "linear-gradient(120deg,#06b6d4,#22c55e,#a855f7)", price: 120, special: "stars", video: "/banners/licensed/aurora.webm", poster: "/banners/licensed/aurora.jpg" },
  gold:    { label: "Royal Gold", css: "linear-gradient(120deg,#92400e,#f59e0b,#fde68a)", price: 140, special: "rays" },
  love:    { label: "Rose Energy", css: "linear-gradient(120deg,#be185d,#ec4899,#f9a8d4)", price: 110, special: "dust" },
  neonframe:{ label: "Neon Portal 3D", css: "linear-gradient(120deg,#0a0a23,#1e1b4b,#0a0a23)", price: 120, special: "stars", video: "/banners/licensed/neon-tunnel.webm", poster: "/banners/licensed/neon-tunnel.jpg" },
};

export const DEFAULT_BANNERS = ["none"];

export function ownsBanner(user, key) {
  if (DEFAULT_BANNERS.includes(key)) return true;
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  return Array.isArray(user?.owned_banners) && user.owned_banners.includes(key);
}

export const ORBIT_EFFECTS = {
  saturn:  { label: "Saturn Orbit", kind: "saturn", price: 45, count: 2, color: "#fbbf24", speed: 13 },
  stars:   { label: "Starlight", kind: "star", price: 60, count: 4, color: "#fde68a", speed: 12 },
  hearts:  { label: "Rose Core", kind: "heart", price: 70, count: 4, color: "#ff5fb4", speed: 11 },
  fire:    { label: "Inferno Wisps", kind: "flame", price: 85, count: 3, color: "#ff8c00", speed: 10 },
  magic:   { label: "Arcane Dust", kind: "magic", price: 95, count: 5, color: "#a855f7", speed: 14 },
  crown:   { label: "Royal Sigils", kind: "crown", price: 120, count: 3, color: "#fbbf24", speed: 15 },
  dragon:  { label: "Dragon Wings", kind: "dragon", price: 150, count: 2, color: "#10b981", speed: 16 },
  thunder: { label: "Thunder Bolts", kind: "thunder", price: 170, count: 4, color: "#facc15", speed: 9 },
  crystal: { label: "Crystal Shards", kind: "crystal", price: 190, count: 3, color: "#67e8f9", speed: 17 },
  phoenix: { label: "Phoenix Wings", kind: "phoenix", price: 220, count: 2, color: "#fb7185", speed: 18 },
  moon:    { label: "Lunar Crescents", kind: "moon", price: 250, count: 3, color: "#c4b5fd", speed: 19 },
  void:    { label: "Void Eyes", kind: "void", price: 290, count: 3, color: "#c084fc", speed: 20 },
};

export function ownsOrbitEffect(user, key) {
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  return Array.isArray(user?.owned_orbit_effects) && user.owned_orbit_effects.includes(key);
}

// ألوان ثيم البروفايل (accent)
export const PROFILE_COLORS = {
  cyan:    { label: "Cyan",   hex: "#00e5ff" },
  purple:  { label: "Purple",  hex: "#a855f7" },
  pink:    { label: "Pink",    hex: "#ec4899" },
  green:   { label: "Green",    hex: "#10b981" },
  gold:    { label: "Gold",    hex: "#fbbf24" },
  red:     { label: "Red",    hex: "#ef4444" },
  blue:    { label: "Blue",    hex: "#3b82f6" },
};

// أنماط ألوان التايتل/اللقب
export const TITLE_COLORS = {
  gradient: { label: "Spectrum", className: "neon-text-gradient" },
  cyan:     { label: "Cyan",    className: "text-[#00e5ff]" },
  purple:   { label: "Purple",   className: "text-[#a855f7]" },
  pink:     { label: "Pink",     className: "text-[#ec4899]" },
  gold:     { label: "Gold",     className: "text-[#fbbf24]" },
  green:    { label: "Green",     className: "text-[#10b981]" },
  red:      { label: "Red",     className: "text-[#ef4444]" },
};

/* ================== الألقاب الجاهزة الفخمة ==================
   كل لقب: نص + تدرّج لوني + تأثير (fx) + سعر بالكريدتس.
   tier: common / rare / epic / legendary / exclusive
   exclusive: admin (أجمد لقب للأدمن) | wife (خاص للزوجة)
*/
export const PROFILE_TITLES = {
  none: { label: "None", text: "", grad: null, fx: "none", price: 0, tier: "common" },
  student: { label: "Dedicated Student", text: "DEDICATED STUDENT", grad: ["#22d3ee", "#0ea5e9"], fx: "shine", price: 40, tier: "common" },

  vip1: { label: "🌟 VIP 1", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", price: -1, exclusive: true },
  vip2: { label: "✨ VIP 2", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", price: -1, exclusive: true },
  vip3: { label: "🔥 VIP 3", color: "text-pink-400 bg-pink-500/10 border-pink-500/30", price: -1, exclusive: true },
  vip4: { label: "⚡ VIP 4", color: "text-purple-400 bg-purple-500/10 border-purple-500/30", price: -1, exclusive: true },
  vip5: { label: "👑 VIP 5", color: "text-amber-400 bg-amber-500/10 border-amber-500/30 font-black drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]", price: -1, exclusive: true },
  vip6: { label: "💀 VIP 6 - OMNIPOTENT", color: "text-red-500 bg-red-950 border-red-500 font-black drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse", price: -1, exclusive: true },

  scholar: { label: "Scholar", text: "SCHOLAR", grad: ["#38bdf8", "#2563eb", "#38bdf8"], fx: "shine", price: 60, tier: "common" },
  pro: { label: "Pro", text: "PRO", grad: ["#06b6d4", "#3b82f6", "#06b6d4"], fx: "glow", price: 90, tier: "rare" },
  heroic: { label: "Heroic Pride", text: "HEROIC PRIDE", grad: ["#f59e0b", "#ef4444", "#f59e0b"], fx: "emberShine", price: 130, tier: "rare" },
  grandmaster: { label: "Grandmaster", text: "GRANDMASTER", grad: ["#f97316", "#dc2626", "#7f1d1d"], fx: "fire", price: 180, tier: "epic" },
  superman: { label: "Superhuman", text: "SUPERHUMAN", grad: ["#ef4444", "#facc15", "#ef4444"], fx: "glow", price: 220, tier: "epic" },
  phoenix: { label: "Phoenix", text: "PHOENIX", grad: ["#fb923c", "#f43f5e", "#fbbf24"], fx: "fire", price: 260, tier: "epic" },
  legendary: { label: "Legendary", text: "LEGENDARY", grad: ["#a855f7", "#ec4899", "#facc15", "#a855f7"], fx: "rainbow", price: 320, tier: "legendary" },
  voidwalker: { label: "Void Walker", text: "VOID WALKER", grad: ["#020617", "#7c3aed", "#22d3ee", "#020617"], fx: "supreme", price: 360, tier: "legendary" },
  thunderlord: { label: "Thunder Lord", text: "THUNDER LORD", grad: ["#facc15", "#f97316", "#ffffff", "#facc15"], fx: "glow", price: 400, tier: "legendary" },
  abyssking: { label: "Abyss King", text: "ABYSS KING", grad: ["#000000", "#be185d", "#7c3aed", "#000000"], fx: "supreme", price: 430, tier: "legendary" },
  celestian: { label: "Celestial One", text: "CELESTIAL ONE", grad: ["#ffffff", "#67e8f9", "#a78bfa", "#ffffff"], fx: "royal", price: 460, tier: "legendary" },
  immortal: { label: "Immortal Legend", text: "IMMORTAL LEGEND", grad: ["#fde68a", "#fbbf24", "#f59e0b", "#fde68a"], fx: "royal", price: 480, tier: "legendary" },
  finalboss: { label: "Final Boss", text: "FINAL BOSS", grad: ["#ef4444", "#facc15", "#7c3aed", "#ef4444"], fx: "supreme", price: 500, tier: "legendary" },

  // حصرية — لا تُشترى
  owner:      { label: "Platform Master", text: "ADMIN OVERLORD / MASTER OF BLACK FIGHTERS", grad: ["#ffd700", "#ff3d3d", "#ff00d4", "#7b00ff", "#00e5ff", "#00ff9d", "#ffd700"], fx: "supreme", price: -1, tier: "exclusive", exclusive: "admin" },
  wife:       { label: "My Queen", text: "MY QUEEN", grad: ["#ff5fb4", "#c850ff", "#ffd6f5", "#ff9ad4", "#ff5fb4"], fx: "love", price: -1, tier: "exclusive", exclusive: "wife" },
};

export const DEFAULT_TITLES = ["none"];

// هل يملك المستخدم اللقب؟ (الحصرية حسب الدور، الباقي بالشراء)
export function ownsTitle(user, key) {
  const t = PROFILE_TITLES[key];
  if (!t) return false;
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  if (t.exclusive === "admin") return user?.role === "admin";
  if (t.exclusive === "wife") return !!user?.is_wife || user?.role === "admin";
  if (DEFAULT_TITLES.includes(key)) return true;
  return Array.isArray(user?.owned_titles) && user.owned_titles.includes(key);
}

export const TIER_LABELS = {
  common:    { label: "Common",     color: "#94a3b8" },
  rare:      { label: "Rare",     color: "#38bdf8" },
  epic:      { label: "Epic",    color: "#a855f7" },
  legendary: { label: "Legendary",   color: "#fbbf24" },
  exclusive: { label: "Exclusive",  color: "#ff4d4d" },
};
