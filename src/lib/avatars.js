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

// ── REFERENCE ARTISTIC AVATAR FRAMES (10 HAND-CRAFTED LAYERED SVG FRAMES) ──────────────────────────
// Exclusively the 10 frames from the user's reference sheet (zero AI-generated raster images).
export const AVATAR_FRAMES = {
  none: {
    label: "بدون إطار · None",
    labelAr: "بدون إطار",
    gradient: "transparent",
    price: 0,
    special: null,
    glow: "transparent",
    speed: 0,
    shape: "circle",
    archetype: "none",
    tier: "vanguard",
  },
  zen_crimson_enso: {
    label: "حلقة الحبر الياباني القرمزي · Zen Crimson Ink Enso",
    labelAr: "حلقة الحبر الياباني القرمزي",
    gradient: "conic-gradient(from 20deg,#111827,#dc2626,#7f1d1d,#090d16,#ef4444,#111827)",
    price: 300,
    special: "ink",
    glow: "#ef4444",
    accent2: "#1f2937",
    speed: 6,
    shape: "circle",
    archetype: "zen_crimson_enso",
    tier: "rare",
  },
  celestial_ice_crystal: {
    label: "إكليل الكريستال الجليدي والنجوم · Celestial Ice Crystal",
    labelAr: "إكليل الكريستال الجليدي والنجوم",
    gradient: "conic-gradient(from 0deg,#bae6fd,#38bdf8,#e0f2fe,#0284c7,#bae6fd)",
    price: 450,
    special: "crystal",
    glow: "#38bdf8",
    accent2: "#f0f9ff",
    speed: 5,
    shape: "circle",
    archetype: "celestial_ice_crystal",
    tier: "rare",
  },
  luminous_butterfly_moon: {
    label: "هلال الفراشة المضيئة والطائر الأبيض · Luminous Butterfly Moon",
    labelAr: "هلال الفراشة المضيئة والطائر",
    gradient: "conic-gradient(from 0deg,#00f2fe,#38bdf8,#ffffff,#0ea5e9,#00f2fe)",
    price: 600,
    special: "crystal",
    glow: "#00f2fe",
    accent2: "#ffffff",
    speed: 4.5,
    shape: "circle",
    archetype: "luminous_butterfly_moon",
    tier: "epic",
  },
  watercolor_blue_flora: {
    label: "طوق الزهور المائية الزرقاء · Watercolor Blue Flora",
    labelAr: "طوق الزهور المائية الزرقاء",
    gradient: "conic-gradient(from 0deg,#60a5fa,#93c5fd,#1d4ed8,#dbeafe,#60a5fa)",
    price: 500,
    special: "aura",
    glow: "#60a5fa",
    accent2: "#dbeafe",
    speed: 5.5,
    shape: "circle",
    archetype: "watercolor_blue_flora",
    tier: "rare",
  },
  botanical_azure_blossoms: {
    label: "إطار براعم الساكورا الزرقاء · Botanical Azure Blossoms",
    labelAr: "إطار براعم الساكورا الزرقاء",
    gradient: "conic-gradient(from 0deg,#7dd3fc,#38bdf8,#e0f2fe,#0369a1,#7dd3fc)",
    price: 550,
    special: "aura",
    glow: "#7dd3fc",
    accent2: "#f0f9ff",
    speed: 5,
    shape: "circle",
    archetype: "botanical_azure_blossoms",
    tier: "rare",
  },
  crimson_wing_ruby: {
    label: "جناح الظلام والياقوت القرمزي · Crimson Wing & Ruby",
    labelAr: "جناح الظلام والياقوت القرمزي",
    gradient: "conic-gradient(from 0deg,#0f172a,#b91c1c,#ef4444,#1e293b,#dc2626,#0f172a)",
    price: 850,
    special: "fire",
    glow: "#ef4444",
    accent2: "#0f172a",
    speed: 4,
    shape: "circle",
    archetype: "crimson_wing_ruby",
    tier: "epic",
  },
  coiled_frost_dragon: {
    label: "تنين الصقيع الأزرق الملتف · Coiled Frost Dragon",
    labelAr: "تنين الصقيع الأزرق الملتف",
    gradient: "conic-gradient(from 0deg,#e0f2fe,#38bdf8,#94a3b8,#0284c7,#e0f2fe)",
    price: 1200,
    special: "ice",
    glow: "#38bdf8",
    accent2: "#f8fafc",
    speed: 3.8,
    shape: "circle",
    archetype: "coiled_frost_dragon",
    tier: "legendary",
  },
  crimson_roses_thorns: {
    label: "إكليل الأشواك والورود الحمراء · Crimson Roses & Thorns",
    labelAr: "إكليل الأشواك والورود الحمراء",
    gradient: "conic-gradient(from 0deg,#111827,#be123c,#e11d48,#1f2937,#9f1239,#111827)",
    price: 950,
    special: "fire",
    glow: "#e11d48",
    accent2: "#fda4af",
    speed: 4.2,
    shape: "circle",
    archetype: "crimson_roses_thorns",
    tier: "epic",
  },
  monochrome_ink_butterflies: {
    label: "طيف الفراشات الحبرية السوداء · Monochrome Ink Butterflies",
    labelAr: "طيف الفراشات الحبرية السوداء",
    gradient: "conic-gradient(from 0deg,#0f172a,#cbd5e1,#334155,#f8fafc,#0f172a)",
    price: 1100,
    special: "shadow",
    glow: "#cbd5e1",
    accent2: "#334155",
    speed: 4.5,
    shape: "circle",
    archetype: "monochrome_ink_butterflies",
    tier: "legendary",
  },
  crystal_leaf_wreath: {
    label: "إكليل أوراق الكريستال المضيئة · Crystal Leaf Wreath",
    labelAr: "إكليل أوراق الكريستال المضيئة",
    gradient: "conic-gradient(from 0deg,#a5f3fc,#38bdf8,#ffffff,#0ea5e9,#a5f3fc)",
    price: 1350,
    special: "crystal",
    glow: "#67e8f9",
    accent2: "#ffffff",
    speed: 3.6,
    shape: "circle",
    archetype: "crystal_leaf_wreath",
    tier: "legendary",
  },
};

const LEGACY_FRAME_FALLBACK_MAP = {
  cyan: "celestial_ice_crystal",
  vip1: "luminous_butterfly_moon",
  vip2: "coiled_frost_dragon",
  vip3: "crimson_roses_thorns",
  vip4: "monochrome_ink_butterflies",
  vip5: "crystal_leaf_wreath",
  vip6: "crimson_wing_ruby",
  ironGuard: "monochrome_ink_butterflies",
  emeraldTech: "crystal_leaf_wreath",
  crimsonSteel: "zen_crimson_enso",
  ivoryTemple: "botanical_azure_blossoms",
  runeStone: "watercolor_blue_flora",
  cyberPlate: "celestial_ice_crystal",
  moonMarble: "coiled_frost_dragon",
  royalWood: "crimson_roses_thorns",
  ancientStone: "monochrome_ink_butterflies",
  neonAlloy: "luminous_butterfly_moon",
  frostTemple: "celestial_ice_crystal",
  obsidianMetal: "crimson_wing_ruby",
  celestialMarble: "crystal_leaf_wreath",
  titaniumVault: "botanical_azure_blossoms",
  firering: "zen_crimson_enso",
  cyberDragon: "coiled_frost_dragon",
  blazingAura: "crimson_wing_ruby",
  neonQuantum: "luminous_butterfly_moon",
  arcaneRunes: "watercolor_blue_flora",
  spartanApex: "coiled_frost_dragon",
};

export function resolveAvatarFrame(key) {
  if (!key || key === "none") return AVATAR_FRAMES.none;
  if (AVATAR_FRAMES[key]) return AVATAR_FRAMES[key];
  const mapped = LEGACY_FRAME_FALLBACK_MAP[key];
  return (mapped && AVATAR_FRAMES[mapped]) || AVATAR_FRAMES.none;
}

export const DEFAULT_FRAMES = ["none"];

export function ownsFrame(user, key) {
  if (DEFAULT_FRAMES.includes(key)) return true;
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  const owned = Array.isArray(user?.owned_frames) ? user.owned_frames : [];
  if (owned.includes(key)) return true;
  // Also unlock if user owned a legacy frame that mapped to this key
  return owned.some((oldKey) => LEGACY_FRAME_FALLBACK_MAP[oldKey] === key);
}

// ── ANIMATED RPG GAME SCENE BANNERS ──────────────────────────
export const PROFILE_BANNERS = {
  none: {
    label: "بدون بانر · Default",
    labelAr: "بدون بانر",
    css: "transparent",
    price: 0,
    special: null,
    scene: "none",
    accent: "#19f08c",
  },
  forest: {
    label: "عرين تنين الزمرد · Emerald Dragon Sanctuary",
    labelAr: "عرين تنين الزمرد",
    css: "linear-gradient(125deg,#022c22 0%,#064e3b 45%,#059669 80%,#10b981 100%)",
    price: 70,
    special: "dust",
    scene: "dragonSanctuary",
    accent: "#19f08c",
  },
  ocean: {
    label: "قلعة العاصفة الرعدية · Thunder Citadel",
    labelAr: "قلعة العاصفة الرعدية",
    css: "linear-gradient(125deg,#020617 0%,#0c4a6e 45%,#0284c7 80%,#38bdf8 100%)",
    price: 40,
    special: "waves",
    scene: "thunderCitadel",
    accent: "#38bdf8",
  },
  sunset: {
    label: "تحليق العنقاء الذهبية · Solar Phoenix Sky",
    labelAr: "تحليق العنقاء الذهبية",
    css: "linear-gradient(125deg,#2a0a18 0%,#7c2d12 45%,#ea580c 80%,#fbbf24 100%)",
    price: 60,
    special: "rays",
    scene: "phoenixSky",
    accent: "#fb923c",
  },
  galaxy: {
    label: "بوابة الهاوية الكونية · Astral Void Rift",
    labelAr: "بوابة الهاوية الكونية",
    css: "linear-gradient(125deg,#090514 0%,#2e1065 45%,#6d28d9 80%,#ec4899 100%)",
    price: 90,
    special: "stars",
    scene: "astralRift",
    accent: "#c084fc",
  },
  fire: {
    label: "ساحة معركة الجحيم · Crimson Dragon War",
    labelAr: "ساحة معركة الجحيم",
    css: "linear-gradient(125deg,#1f0505 0%,#7f1d1d 45%,#dc2626 80%,#f59e0b 100%)",
    price: 100,
    special: "embers",
    scene: "crimsonWar",
    accent: "#ef4444",
  },
  aurora: {
    label: "قيادة Black Fighters · Cyber Vanguard HQ",
    labelAr: "قيادة Black Fighters",
    css: "linear-gradient(125deg,#030712 0%,#064e3b 42%,#0284c7 75%,#7c3aed 100%)",
    price: 120,
    special: "stars",
    scene: "blackFightersHq",
    accent: "#19f08c",
    video: "/banners/licensed/aurora.webm",
    poster: "/banners/licensed/aurora.jpg",
  },
  gold: {
    label: "عرش السيادة الملكي · Sovereign Golden Throne",
    labelAr: "عرش السيادة الملكي",
    css: "linear-gradient(125deg,#1c1002 0%,#78350f 45%,#d97706 80%,#fde68a 100%)",
    price: 140,
    special: "rays",
    scene: "sovereignThrone",
    accent: "#fbbf24",
  },
  love: {
    label: "عاصفة الساكورا المضيئة · Sakura Blade Storm",
    labelAr: "عاصفة الساكورا المضيئة",
    css: "linear-gradient(125deg,#240617 0%,#831843 45%,#db2777 80%,#f9a8d4 100%)",
    price: 110,
    special: "hearts",
    scene: "sakuraStorm",
    accent: "#f472b6",
  },
  neonframe: {
    label: "مصفوفة التنين السيبراني · Neon Cyber Portal",
    labelAr: "مصفوفة التنين السيبراني",
    css: "linear-gradient(125deg,#030614 0%,#1e1b4b 45%,#0369a1 80%,#00f2fe 100%)",
    price: 120,
    special: "stars",
    scene: "cyberPortal",
    accent: "#00f2fe",
    video: "/banners/licensed/neon-tunnel.webm",
    poster: "/banners/licensed/neon-tunnel.jpg",
  },
};

export const DEFAULT_BANNERS = ["none"];

export function ownsBanner(user, key) {
  if (DEFAULT_BANNERS.includes(key)) return true;
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  return Array.isArray(user?.owned_banners) && user.owned_banners.includes(key);
}

// ── 3D COLLECTIBLE ORBIT RELICS (TELEGRAM GIFT STYLE) ──────────────────────────
export const ORBIT_EFFECTS = {
  saturn:  { label: "كوكب زحل الذهبي · Golden Saturn",     labelAr: "كوكب زحل الذهبي",     kind: "saturn",  price: 45,  count: 2, color: "#fbbf24", secondary: "#f59e0b", speed: 12, tier: "vanguard" },
  stars:   { label: "نجوم الأثير · Astral Nova",           labelAr: "نجوم الأثير",         kind: "star",    price: 60,  count: 4, color: "#fde68a", secondary: "#38bdf8", speed: 11, tier: "vanguard" },
  hearts:  { label: "ياقوتة القلب · Ruby Heart Gem",       labelAr: "ياقوتة القلب",        kind: "heart",   price: 70,  count: 4, color: "#ff5fb4", secondary: "#f43f5e", speed: 11, tier: "rare" },
  fire:    { label: "شعلة العنقاء · Phoenix Core",         labelAr: "شعلة العنقاء",        kind: "flame",   price: 85,  count: 3, color: "#ff8c00", secondary: "#ef4444", speed: 9,  tier: "rare" },
  magic:   { label: "بلورة السحر · Arcane Prism",          labelAr: "بلورة السحر",         kind: "magic",   price: 95,  count: 4, color: "#a855f7", secondary: "#22d3ee", speed: 13, tier: "rare" },
  crown:   { label: "التاج الإمبراطوري · Imperial Crown",   labelAr: "التاج الإمبراطوري",   kind: "crown",   price: 120, count: 3, color: "#fbbf24", secondary: "#fef08a", speed: 14, tier: "epic" },
  dragon:  { label: "تنين الزمرد الحارس · Emerald Dragon", labelAr: "تنين الزمرد الحارس",  kind: "dragon",  price: 150, count: 2, color: "#19f08c", secondary: "#059669", speed: 14, tier: "epic" },
  thunder: { label: "صاعقة الرعد · Storm Bolt",            labelAr: "صاعقة الرعد",         kind: "thunder", price: 170, count: 4, color: "#facc15", secondary: "#38bdf8", speed: 8,  tier: "epic" },
  crystal: { label: "ألماس الفايترز · Cyber Diamond",      labelAr: "ألماس الفايترز",      kind: "crystal", price: 190, count: 3, color: "#67e8f9", secondary: "#a855f7", speed: 15, tier: "legendary" },
  phoenix: { label: "أجنحة الفينيكس · Solar Wings",        labelAr: "أجنحة الفينيكس",      kind: "phoenix", price: 220, count: 2, color: "#fb7185", secondary: "#fbbf24", speed: 16, tier: "legendary" },
  moon:    { label: "هلال الظلال · Blood Crescent",        labelAr: "هلال الظلال",         kind: "moon",    price: 250, count: 3, color: "#c4b5fd", secondary: "#6366f1", speed: 17, tier: "legendary" },
  void:    { label: "عين الهاوية · Void Singularity",       labelAr: "عين الهاوية",         kind: "void",    price: 290, count: 3, color: "#c084fc", secondary: "#19f08c", speed: 18, tier: "legendary" },
};

export function ownsOrbitEffect(user, key) {
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  return Array.isArray(user?.owned_orbit_effects) && user.owned_orbit_effects.includes(key);
}

// ألوان ثيم البروفايل (accent)
export const PROFILE_COLORS = {
  cyan:    { label: "سماوي نيون · Cyan",     hex: "#00e5ff" },
  green:   { label: "زمردي · Emerald",       hex: "#19f08c" },
  gold:    { label: "ذهبي ملكي · Gold",      hex: "#fbbf24" },
  purple:  { label: "بنفسجي · Purple",       hex: "#a855f7" },
  red:     { label: "قرمزي ناري · Crimson",  hex: "#ef4444" },
  pink:    { label: "وردي · Rose",           hex: "#ec4899" },
  blue:    { label: "أزرق برق · Electric",   hex: "#3b82f6" },
};

export const TITLE_COLORS = {
  gradient: { label: "Spectrum", className: "neon-text-gradient" },
  cyan:     { label: "Cyan",     className: "text-[#00e5ff]" },
  purple:   { label: "Purple",   className: "text-[#a855f7]" },
  pink:     { label: "Pink",     className: "text-[#ec4899]" },
  gold:     { label: "Gold",     className: "text-[#fbbf24]" },
  green:    { label: "Green",    className: "text-[#10b981]" },
  red:      { label: "Red",      className: "text-[#ef4444]" },
};

// ── WINGED PRESTIGE RPG TITLES (NO "COMMON" ANYWHERE) ──────────────────────────
export const PROFILE_TITLES = {
  none: {
    label: "بدون لقب · None",
    labelAr: "بدون لقب",
    text: "",
    grad: null,
    fx: "none",
    price: 0,
    tier: "common",
    icon: "shield",
  },
  student: {
    label: "مقاتل الطليعة · Vanguard Initiate",
    labelAr: "مقاتل الطليعة",
    text: "مقاتل الطليعة · VANGUARD",
    grad: ["#22d3ee", "#19f08c", "#38bdf8"],
    fx: "shine",
    price: 40,
    tier: "common",
    icon: "shield",
  },

  vip1: {
    label: "فارس النجم الأزرق · VIP I",
    labelAr: "فارس النجم الأزرق",
    text: "STARLIGHT KNIGHT · VIP I",
    grad: ["#60a5fa", "#38bdf8", "#93c5fd"],
    fx: "glow",
    price: -1,
    tier: "exclusive",
    exclusive: true,
    icon: "star",
  },
  vip2: {
    label: "حارس الزمرد · VIP II",
    labelAr: "حارس الزمرد",
    text: "EMERALD GUARDIAN · VIP II",
    grad: ["#19f08c", "#10b981", "#6ee7b7"],
    fx: "glow",
    price: -1,
    tier: "exclusive",
    exclusive: true,
    icon: "dragon",
  },
  vip3: {
    label: "سيد اللهب الوردي · VIP III",
    labelAr: "سيد اللهب الوردي",
    text: "CRIMSON PHOENIX · VIP III",
    grad: ["#f472b6", "#ec4899", "#fda4af"],
    fx: "fire",
    price: -1,
    tier: "exclusive",
    exclusive: true,
    icon: "phoenix",
  },
  vip4: {
    label: "قائد البرق البنفسجي · VIP IV",
    labelAr: "قائد البرق البنفسجي",
    text: "ASTRAL ARCHON · VIP IV",
    grad: ["#c084fc", "#8b5cf6", "#38bdf8"],
    fx: "royal",
    price: -1,
    tier: "exclusive",
    exclusive: true,
    icon: "thunder",
  },
  vip5: {
    label: "الملك الذهبي المتوّج · VIP V",
    labelAr: "الملك الذهبي المتوّج",
    text: "SOVEREIGN MONARCH · VIP V",
    grad: ["#fde68a", "#fbbf24", "#f59e0b"],
    fx: "royal",
    price: -1,
    tier: "exclusive",
    exclusive: true,
    icon: "crown",
  },
  vip6: {
    label: "إمبراطور التنانين المطلق · VIP VI",
    labelAr: "إمبراطور التنانين المطلق",
    text: "OMNIPOTENT DRAGON LORD · VIP VI",
    grad: ["#ef4444", "#fbbf24", "#ff0055", "#fbbf24"],
    fx: "supreme",
    price: -1,
    tier: "exclusive",
    exclusive: true,
    icon: "dragon",
  },

  scholar: {
    label: "حكيم المعرفة · Grand Scholar",
    labelAr: "حكيم المعرفة",
    text: "حكيم المعرفة · GRAND SCHOLAR",
    grad: ["#38bdf8", "#818cf8", "#22d3ee"],
    fx: "shine",
    price: 60,
    tier: "common",
    icon: "tome",
  },
  pro: {
    label: "محارب النخبة · Elite Striker",
    labelAr: "محارب النخبة",
    text: "محارب النخبة · ELITE STRIKER",
    grad: ["#19f08c", "#06b6d4", "#3b82f6"],
    fx: "glow",
    price: 90,
    tier: "rare",
    icon: "sword",
  },
  heroic: {
    label: "البطل المغوار · Heroic Champion",
    labelAr: "البطل المغوار",
    text: "البطل المغوار · HEROIC CHAMPION",
    grad: ["#fbbf24", "#f97316", "#ef4444"],
    fx: "emberShine",
    price: 130,
    tier: "rare",
    icon: "shield",
  },
  grandmaster: {
    label: "سيد التنانين · Dragon Grandmaster",
    labelAr: "سيد التنانين",
    text: "سيد التنانين · DRAGON MASTER",
    grad: ["#f97316", "#ef4444", "#fde047"],
    fx: "fire",
    price: 180,
    tier: "epic",
    icon: "dragon",
  },
  superman: {
    label: "قاهر المستحيل · Apex Overlord",
    labelAr: "قاهر المستحيل",
    text: "قاهر المستحيل · APEX OVERLORD",
    grad: ["#ef4444", "#facc15", "#fb923c"],
    fx: "glow",
    price: 220,
    tier: "epic",
    icon: "sword",
  },
  phoenix: {
    label: "العنقاء الخالدة · Immortal Phoenix",
    labelAr: "العنقاء الخالدة",
    text: "العنقاء الخالدة · PHOENIX REBORN",
    grad: ["#fb923c", "#f43f5e", "#fde047"],
    fx: "fire",
    price: 260,
    tier: "epic",
    icon: "phoenix",
  },
  legendary: {
    label: "أسطورة Black Fighters · Mythic Legend",
    labelAr: "أسطورة Black Fighters",
    text: "أسطورة الميدان · MYTHIC LEGEND",
    grad: ["#19f08c", "#00e5ff", "#a855f7", "#fbbf24"],
    fx: "rainbow",
    price: 320,
    tier: "legendary",
    icon: "crown",
  },
  voidwalker: {
    label: "سيد الظلال والهاوية · Void Monarch",
    labelAr: "سيد الظلال والهاوية",
    text: "سيد الظلال · VOID MONARCH",
    grad: ["#c084fc", "#7c3aed", "#22d3ee", "#e879f9"],
    fx: "supreme",
    price: 360,
    tier: "legendary",
    icon: "void",
  },
  thunderlord: {
    label: "إمبراطور الصواعق · Thunder God",
    labelAr: "إمبراطور الصواعق",
    text: "إمبراطور الصواعق · THUNDER LORD",
    grad: ["#fde047", "#38bdf8", "#ffffff", "#facc15"],
    fx: "glow",
    price: 400,
    tier: "legendary",
    icon: "thunder",
  },
  abyssking: {
    label: "ملك الهاوية الأبدي · Abyssal Dragon King",
    labelAr: "ملك الهاوية الأبدي",
    text: "ملك الهاوية · ABYSS DRAGON KING",
    grad: ["#f43f5e", "#a855f7", "#00f2fe", "#f43f5e"],
    fx: "supreme",
    price: 430,
    tier: "legendary",
    icon: "dragon",
  },
  celestian: {
    label: "حارس المجرة الأسمى · Celestial Seraph",
    labelAr: "حارس المجرة الأسمى",
    text: "حارس المجرة · CELESTIAL SERAPH",
    grad: ["#ffffff", "#67e8f9", "#c084fc", "#fde68a"],
    fx: "royal",
    price: 460,
    tier: "legendary",
    icon: "star",
  },
  immortal: {
    label: "السيادة الخالدة · Sovereign Immortal",
    labelAr: "السيادة الخالدة",
    text: "السيادة الخالدة · SOVEREIGN IMMORTAL",
    grad: ["#fef08a", "#fbbf24", "#f59e0b", "#ffffff"],
    fx: "royal",
    price: 480,
    tier: "legendary",
    icon: "crown",
  },
  finalboss: {
    label: "الزعيم النهائي · Supreme Final Boss",
    labelAr: "الزعيم النهائي",
    text: "الزعيم النهائي · FINAL BOSS",
    grad: ["#ef4444", "#fbbf24", "#19f08c", "#a855f7", "#ef4444"],
    fx: "supreme",
    price: 500,
    tier: "legendary",
    icon: "dragon",
  },

  // حصرية — لا تُشترى
  owner: {
    label: "قائد Black Fighters الأعلى · Supreme Founder",
    labelAr: "قائد Black Fighters الأعلى",
    text: "COMMANDER OF BLACK FIGHTERS · SUPREME OVERLORD",
    grad: ["#ffd700", "#19f08c", "#00e5ff", "#a855f7", "#ff3d3d", "#ffd700"],
    fx: "supreme",
    price: -1,
    tier: "exclusive",
    exclusive: "admin",
    icon: "crown",
  },
  wife: {
    label: "ملكة العرش · Empress of Light",
    labelAr: "ملكة العرش",
    text: "ملكة العرش · EMPRESS OF LIGHT",
    grad: ["#ff5fb4", "#c850ff", "#ffd6f5", "#fbbf24", "#ff5fb4"],
    fx: "love",
    price: -1,
    tier: "exclusive",
    exclusive: "wife",
    icon: "crown",
  },
};

export const DEFAULT_TITLES = ["none"];

export function ownsTitle(user, key) {
  const t = PROFILE_TITLES[key];
  if (!t) return false;
  if (user?.role === "admin" || user?.is_admin || user?.email === "ibrahimkandil000@gmail.com") return true;
  if (t.exclusive === "admin") return user?.role === "admin";
  if (t.exclusive === "wife") return !!user?.is_wife || user?.role === "admin";
  if (DEFAULT_TITLES.includes(key)) return true;
  return Array.isArray(user?.owned_titles) && user.owned_titles.includes(key);
}

// NO "Common" anywhere — replaced by Vanguard / طليعة المحاربين
export const TIER_LABELS = {
  vanguard:  { label: "طليعة المحاربين · Vanguard", labelAr: "طليعة المحاربين", labelEn: "Vanguard",  color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.4)" },
  common:    { label: "طليعة المحاربين · Vanguard", labelAr: "طليعة المحاربين", labelEn: "Vanguard",  color: "#38bdf8", bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.4)" },
  rare:      { label: "نخبة الميدان · Rare",        labelAr: "نخبة الميدان",    labelEn: "Rare",      color: "#19f08c", bg: "rgba(25,240,140,0.14)", border: "rgba(25,240,140,0.4)" },
  epic:      { label: "ملحمي · Epic",              labelAr: "ملحمي",           labelEn: "Epic",      color: "#c084fc", bg: "rgba(192,132,252,0.15)", border: "rgba(192,132,252,0.45)" },
  legendary: { label: "أسطوري · Mythic",           labelAr: "أسطوري",          labelEn: "Mythic",    color: "#fbbf24", bg: "rgba(251,191,36,0.16)", border: "rgba(251,191,36,0.5)" },
  exclusive: { label: "سيادة خاصة · Supreme",       labelAr: "سيادة خاصة",      labelEn: "Supreme",   color: "#f43f5e", bg: "rgba(244,63,94,0.16)",  border: "rgba(244,63,94,0.5)" },
};
