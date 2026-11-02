import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { applyTheme } from "@/lib/themes";

export const DEFAULT_THEMES = [
  {
    id: "academic_light",
    name: "Academic Light",
    nameAr: "الوضع النهاري الأكاديمي (أبيض)",
    tag: "Default Academic",
    desc: "خلفية ورقية بيضاء ناصعة مريحة للقراءة الأكاديمية والطبية مع تباين واضح",
    image: null,
    isVideo: false,
    isLight: true,
    primaryColor: "#10b981",
    accentColor: "#059669",
    bgBase: "#f8fafc",
    previewGradient: "from-[#ffffff] via-[#f8fafc] to-[#10b981]/20",
  },
  {
    id: "linevault_emerald",
    name: "Emerald Dark",
    nameAr: "الوضع الليلي الهادئ",
    tag: "Dark Mode",
    desc: "خلفية داكنة هادئة (#05070a) مع أسطح زجاجية ولون زمردي مريح للإضاءة المنخفضة",
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
];

const StudyThemeContext = createContext({
  currentTheme: DEFAULT_THEMES[0],
  colorMode: "light",
  isDark: false,
  setThemeId: () => {},
  setColorMode: () => {},
  toggleColorMode: () => {},
  allThemes: DEFAULT_THEMES,
  customThemes: [],
  addCustomTheme: () => {},
  removeCustomTheme: () => {},
  isPro: false,
});

const STORAGE_KEY = "iiiak_study_theme_id_v2";
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
      // Primary default theme is White (Academic Light).
      // Only keep dark if user explicitly chose it with the v2 key.
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || "academic_light";
    } catch {
      return "academic_light";
    }
  });

  const allThemes = [...customThemes, ...DEFAULT_THEMES];
  const currentTheme = allThemes.find((t) => t.id === themeId) || DEFAULT_THEMES[0];
  const isDark = !currentTheme.isLight;
  const colorMode = isDark ? "dark" : "light";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {}

    try {
      applyTheme(currentTheme.isLight ? "light" : "dark");
    } catch {}
  }, [themeId, currentTheme.isLight]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customThemes));
    } catch {}
  }, [customThemes]);

  const setThemeId = useCallback((id) => {
    if (id === "light" || id === "clinical") {
      setThemeIdState("academic_light");
    } else if (id === "dark" || id === "linevault") {
      setThemeIdState("linevault_emerald");
    } else {
      setThemeIdState(id);
    }
  }, []);

  const setColorMode = useCallback((mode) => {
    if (mode === "dark") {
      setThemeIdState("linevault_emerald");
    } else {
      setThemeIdState("academic_light");
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    setThemeIdState((prev) => {
      const found = [...customThemes, ...DEFAULT_THEMES].find((t) => t.id === prev);
      const currentlyLight = found ? Boolean(found.isLight) : prev === "academic_light";
      return currentlyLight ? "linevault_emerald" : "academic_light";
    });
  }, [customThemes]);

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
      setThemeIdState("academic_light");
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
