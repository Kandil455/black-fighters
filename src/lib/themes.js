// LineVault Unified Theme Engine (#05070a Dark Ink + #19f08c Emerald)

const LINEVAULT_VARS = {
  "--background": "216 33% 3%",
  "--foreground": "216 33% 97%",
  "--card": "218 31% 5%",
  "--card-foreground": "216 33% 97%",
  "--popover": "218 31% 6%",
  "--popover-foreground": "216 33% 97%",
  "--primary": "152 88% 52%",
  "--primary-foreground": "150 75% 5%",
  "--secondary": "217 31% 8%",
  "--secondary-foreground": "216 33% 97%",
  "--muted": "217 31% 8%",
  "--muted-foreground": "215 15% 65%",
  "--accent": "152 88% 52%",
  "--accent-foreground": "150 75% 5%",
  "--border": "217 24% 14%",
  "--input": "217 24% 14%",
  "--ring": "152 88% 52%",
};

export const THEMES = {
  linevault: {
    key: "linevault",
    name: "LineVault الزمردي الفخم",
    nameEn: "LineVault Emerald Ink",
    emoji: "💎",
    preview: ["#19f08c", "#05070a", "#090c11"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
  dark: {
    key: "dark",
    name: "LineVault الزمردي الفخم",
    nameEn: "LineVault Emerald Ink",
    emoji: "🌙",
    preview: ["#19f08c", "#05070a", "#090c11"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
  emerald: {
    key: "emerald",
    name: "المختبر الزمردي",
    nameEn: "Emerald Vault",
    emoji: "🌿",
    preview: ["#19f08c", "#05070a", "#0e131b"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
  clinical: {
    key: "clinical",
    name: "LineVault الزمردي الفخم",
    nameEn: "LineVault Dark",
    emoji: "💎",
    preview: ["#19f08c", "#05070a", "#090c11"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
};

export const THEME_LIST = Object.values(THEMES);

const STORAGE_KEY = "bf_theme";

export function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "linevault";
  } catch {
    return "linevault";
  }
}

export function applyTheme(themeKey = "linevault") {
  if (typeof document === "undefined") return;
  const theme = THEMES[themeKey] || THEMES.linevault;
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });

  root.classList.add("dark");
  root.classList.remove("light", "theme-light");
  root.setAttribute("data-theme", "dark");

  try {
    localStorage.setItem(STORAGE_KEY, theme.key);
  } catch {}
}

export function initTheme() {
  applyTheme("linevault");
}