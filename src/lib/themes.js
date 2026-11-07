// IIIAK Unified Academic Theme Engine (Default: Crisp Academic Light + Optional Dark Ink)

const LIGHT_VARS = {
  "--background": "210 40% 98%",
  "--foreground": "222 47% 11%",
  "--card": "0 0% 100%",
  "--card-foreground": "222 47% 11%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "222 47% 11%",
  "--primary": "160 84% 39%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "210 40% 96%",
  "--secondary-foreground": "222 47% 11%",
  "--muted": "210 40% 96%",
  "--muted-foreground": "215 16% 42%",
  "--accent": "160 84% 39%",
  "--accent-foreground": "0 0% 100%",
  "--border": "214 32% 89%",
  "--input": "214 32% 89%",
  "--ring": "160 84% 39%",
  "--bg-0": "#f8fafc",
  "--bg-1": "#ffffff",
  "--bg-2": "#f1f5f9",
  "--fg-0": "#0f172a",
  "--fg-1": "#475569",
  "--fg-2": "#64748b",
  "--accent-hex": "#10b981",
  "--accent-2-hex": "#059669",
};

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
  "--bg-0": "#05070a",
  "--bg-1": "#090c11",
  "--bg-2": "#0e131b",
  "--fg-0": "#f5f7fa",
  "--fg-1": "#9aa4b2",
  "--fg-2": "#646e7d",
  "--accent-hex": "#19f08c",
  "--accent-2-hex": "#0fd978",
};

export const THEMES = {
  light: {
    key: "light",
    name: "الوضع النهاري الأكاديمي",
    nameEn: "Academic Light Paper",
    emoji: "☀️",
    preview: ["#10b981", "#f8fafc", "#ffffff"],
    isLight: true,
    atlasTheme: "day",
    vars: LIGHT_VARS,
  },
  clinical: {
    key: "clinical",
    name: "الوضع النهاري الأكاديمي",
    nameEn: "Academic Light",
    emoji: "☀️",
    preview: ["#10b981", "#f8fafc", "#ffffff"],
    isLight: true,
    atlasTheme: "day",
    vars: LIGHT_VARS,
  },
  linevault: {
    key: "linevault",
    name: "الوضع الليلي الزمردي",
    nameEn: "Emerald Dark Ink",
    emoji: "🌙",
    preview: ["#19f08c", "#05070a", "#090c11"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
  dark: {
    key: "dark",
    name: "الوضع الليلي الزمردي",
    nameEn: "Emerald Dark Ink",
    emoji: "🌙",
    preview: ["#19f08c", "#05070a", "#090c11"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
  emerald: {
    key: "emerald",
    name: "المختبر الزمردي الليلي",
    nameEn: "Emerald Vault",
    emoji: "🌿",
    preview: ["#19f08c", "#05070a", "#0e131b"],
    isLight: false,
    atlasTheme: "night",
    vars: LINEVAULT_VARS,
  },
};

export const THEME_LIST = [THEMES.light, THEMES.dark];

const STORAGE_KEY = "iiiak_theme_mode_v2";

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES[saved]) return saved;
    return "light";
  } catch {
    return "light";
  }
}

export function applyTheme(themeKey = "light") {
  if (typeof document === "undefined") return;
  const resolvedKey =
    themeKey === "academic_light" || themeKey === "light" || themeKey === "clinical"
      ? "light"
      : themeKey === "dark" || themeKey === "linevault" || themeKey === "emerald" || themeKey === "linevault_emerald" || themeKey === "obsidian_minimal" || themeKey === "pure_black"
      ? "dark"
      : "light";
  const theme = THEMES[resolvedKey] || THEMES.light;
  const root = document.documentElement;

  Object.entries(theme.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });

  if (theme.isLight) {
    root.classList.add("light", "theme-light");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.add("dark");
    root.classList.remove("light", "theme-light");
    root.setAttribute("data-theme", "dark");
  }

  try {
    localStorage.setItem(STORAGE_KEY, theme.key);
  } catch {}
}

export function initTheme() {
  applyTheme(getSavedTheme());
}