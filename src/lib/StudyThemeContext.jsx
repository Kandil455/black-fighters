import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { applyTheme } from "@/lib/themes";

export const DEFAULT_THEMES = [
  {
    id: "linevault_emerald",
    name: "LineVault Emerald",
    nameAr: "ثيم LineVault الزمردي الفخم",
    tag: "LineVault Official",
    desc: "خلفية حبرية صامتة (#05070a) مع أسطح زجاجية (.glass) ولون زمردي (#19f08c) موحد",
    image: null,
    isVideo: false,
    isLight: false,
    primaryColor: "#19f08c",
    accentColor: "#19f08c",
    bgBase: "#05070a",
    previewGradient: "from-[#05070a] via-[#090c11] to-[#19f08c]/30",
  },
  {
    id: "obsidian_minimal",
    name: "Obsidian Dark",
    nameAr: "الوضع الليلي العميق",
    tag: "True Dark Ink",
    desc: "وضع ليلي حبري صامت مع تباين ناصع الوضوح للمذاكرة الطويلة",
    image: null,
    isVideo: false,
    isLight: false,
    primaryColor: "#19f08c",
    accentColor: "#19f08c",
    bgBase: "#05070a",
    previewGradient: "from-[#05070a] via-[#090c11] to-[#0e131b]",
  },
  {
    id: "pure_black",
    name: "Pure OLED Ink",
    nameAr: "حبر OLED نقي",
    tag: "Black Fighters Solid",
    desc: "خلفية داكنة سادة لراحة العين وتوفير الطاقة على شاشات OLED",
    image: null,
    isVideo: false,
    isLight: false,
    primaryColor: "#19f08c",
    accentColor: "#19f08c",
    bgBase: "#05070a",
    previewGradient: "from-black via-[#05070a] to-[#090c11]",
  },
];

const StudyThemeContext = createContext({
  currentTheme: DEFAULT_THEMES[0],
  colorMode: "dark",
  isDark: true,
  setThemeId: () => {},
  setColorMode: () => {},
  toggleColorMode: () => {},
  allThemes: DEFAULT_THEMES,
  customThemes: [],
  addCustomTheme: () => {},
  removeCustomTheme: () => {},
  isPro: false,
});

const STORAGE_KEY = "bf_study_bg_theme_id_v5";
const CUSTOM_STORAGE_KEY = "bf_custom_study_wallpapers_v5";

export function StudyThemeProvider({ children }) {
  let profile = null;
  try {
    const auth = useAuth();
    profile = auth?.profile;
  } catch {
    profile = null;
  }

  const isPro = Boolean(
    profile?.subscription_plan === "pro" ||
      profile?.subscription_plan === "plus" ||
      profile?.subscription_plan === "max" ||
      profile?.subscription_plan === "supreme" ||
      profile?.subscription_plan === "ultimate" ||
      profile?.is_pro
  );

  const [customThemes, setCustomThemes] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [themeId, setThemeIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || "linevault_emerald";
    } catch {
      return "linevault_emerald";
    }
  });

  const allThemes = [...customThemes, ...DEFAULT_THEMES];
  const currentTheme = allThemes.find((t) => t.id === themeId) || DEFAULT_THEMES[0];
  const isDark = true;
  const colorMode = "dark";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {}

    const root = document.documentElement;
    root.classList.add("dark");
    root.classList.remove("light", "theme-light");
    root.setAttribute("data-theme", "dark");

    try {
      applyTheme("linevault");
    } catch {}
  }, [themeId]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customThemes));
    } catch {}
  }, [customThemes]);

  const setThemeId = useCallback((id) => {
    setThemeIdState(id);
  }, []);

  const setColorMode = useCallback(() => {
    setThemeIdState("linevault_emerald");
  }, []);

  const toggleColorMode = useCallback(() => {
    setThemeIdState("linevault_emerald");
  }, []);

  const addCustomTheme = (file) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error("يرجى اختيار صورة (JPG, PNG, WebP) أو فيديو (MP4, WebM)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (!dataUrl) return;
      const newTheme = {
        id: `custom_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, "").slice(0, 20),
        nameAr: "خلفية مخصصة",
        tag: isVideo ? "Custom Video" : "Custom Image",
        desc: "خلفية مخصصة من جهازك",
        image: dataUrl,
        isVideo,
        isLight: false,
        primaryColor: "#19f08c",
        accentColor: "#19f08c",
        bgBase: "#05070a",
        previewGradient: "from-[#05070a] to-[#090c11]",
        isCustom: true,
      };
      setCustomThemes((prev) => [newTheme, ...prev]);
      setThemeIdState(newTheme.id);
      toast.success("تم تطبيق الخلفية بنجاح");
    };
    reader.readAsDataURL(file);
  };

  const removeCustomTheme = (id) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== id));
    if (themeId === id) {
      setThemeIdState("linevault_emerald");
    }
  };

  return (
    <StudyThemeContext.Provider
      value={{
        currentTheme,
        colorMode,
        isDark,
        setThemeId,
        setColorMode,
        toggleColorMode,
        allThemes,
        customThemes,
        addCustomTheme,
        removeCustomTheme,
        isPro,
      }}
    >
      {children}
    </StudyThemeContext.Provider>
  );
}

export function useStudyTheme() {
  return useContext(StudyThemeContext);
}
