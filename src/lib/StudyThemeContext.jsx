import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export const DEFAULT_THEMES = [
  {
    id: "clinical_light",
    name: "Clinical Light",
    tag: "Medical Paper",
    desc: "خلفية سريرية فاتحة هادئة — أبيض بارد وكحلي بترولي بدون تشتيت",
    image: null,
    isVideo: false,
    primaryColor: "#0B1F33",
    accentColor: "#2B8A9E",
    bgBase: "#F6F8FA",
    previewGradient: "from-slate-100 via-white to-cyan-50",
  },
  {
    id: "pure_black",
    name: "Pure Black",
    tag: "Black Fighters Solid",
    desc: "خلفية سوداء سادة بالكامل بدون أي مشتتات أو رسومات ملونة لراحة العين",
    image: null,
    isVideo: false,
    primaryColor: "#00f5ff",
    accentColor: "#bf5fff",
    bgBase: "#000000",
    previewGradient: "from-black via-zinc-950 to-black",
  },
  {
    id: "deep_space",
    name: "Deep Space",
    tag: "Cosmic Nebula",
    desc: "Space observatory overlooking deep sapphire blue and violet nebula for deep focus",
    image: "/backgrounds/deep_space.webp",
    isVideo: false,
    primaryColor: "#00f5ff",
    accentColor: "#7c3aed",
    bgBase: "#07080f",
    previewGradient: "from-cyan-400 via-blue-500 to-violet-600",
  },
  {
    id: "black_fighters",
    name: "Black Fighters Elite",
    tag: "Warrior Battlestation",
    desc: "Dark warrior room with glowing sword and shield crest, crimson and purple neon",
    image: "/backgrounds/black_fighters.webp",
    isVideo: false,
    primaryColor: "#ff3366",
    accentColor: "#a855f7",
    bgBase: "#09060b",
    previewGradient: "from-rose-500 via-purple-600 to-cyan-400",
  },
  {
    id: "tokyo_synthwave",
    name: "Tokyo Lo-Fi",
    tag: "Sunset Lo-Fi Study",
    desc: "Cozy lo-fi anime sunset with warm fairy lights and peaceful study vibes",
    image: "/backgrounds/tokyo_synthwave.webp",
    isVideo: false,
    primaryColor: "#ff4b91",
    accentColor: "#ff76ce",
    bgBase: "#0b0610",
    previewGradient: "from-pink-500 via-purple-500 to-indigo-600",
  },
  {
    id: "emerald_matrix",
    name: "Emerald Matrix",
    tag: "Quantum Cyber Lab",
    desc: "Futuristic digital green lab with floating algorithms and clean mint ambient lighting",
    image: "/backgrounds/emerald_matrix.webp",
    isVideo: false,
    primaryColor: "#00ff88",
    accentColor: "#00f5ff",
    bgBase: "#050b08",
    previewGradient: "from-emerald-400 via-teal-500 to-cyan-400",
  },
  {
    id: "obsidian_minimal",
    name: "Obsidian Dark",
    tag: "Pure Minimalist",
    desc: "Clean matte black obsidian theme without background image for maximum speed and zero distraction",
    image: null,
    isVideo: false,
    primaryColor: "#00f5ff",
    accentColor: "#bf5fff",
    bgBase: "#07080c",
    previewGradient: "from-zinc-700 via-zinc-800 to-black",
  },
];

const StudyThemeContext = createContext({
  currentTheme: DEFAULT_THEMES[0],
  setThemeId: () => {},
  allThemes: DEFAULT_THEMES,
  customThemes: [],
  addCustomTheme: () => {},
  removeCustomTheme: () => {},
  isPro: false,
});

const STORAGE_KEY = "bf_study_bg_theme_id_v4";
const CUSTOM_STORAGE_KEY = "bf_custom_study_wallpapers_v4";

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

  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "clinical_light";
    } catch {
      return "clinical_light";
    }
  });

  // Persist selected theme
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {}
  }, [themeId]);

  // Persist custom themes
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customThemes));
    } catch {}
  }, [customThemes]);

  const addCustomTheme = (file) => {
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      toast.error("يرجى اختيار صورة (JPG, PNG, WebP) أو فيديو (MP4, WebM)");
      return;
    }

    // Free users: max 1 custom image, NO video
    if (!isPro) {
      if (isVideo) {
        toast.error("رفع خلفيات الفيديو المباشرة متاح لمشتركي Pro فقط! 👑");
        return;
      }
      if (customThemes.length >= 1) {
        toast.error("المستخدم المجاني يمكنه إضافة خلفية مخصصة واحدة فقط. اشترك في Pro لإضافة عدد غير محدود وفيديوهات! 👑");
        return;
      }
    }

    // Read as Base64 data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const newCustom = {
        id: `custom_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, "").slice(0, 20) || "Custom Wallpaper",
        tag: isVideo ? "Custom Live Video" : "Custom User Image",
        desc: isVideo ? "User uploaded animated video wallpaper" : "User uploaded custom wallpaper",
        image: isVideo ? null : dataUrl,
        videoUrl: isVideo ? dataUrl : null,
        isVideo,
        primaryColor: isVideo ? "#bf5fff" : "#00f5ff",
        accentColor: "#ff3366",
        bgBase: "#07080c",
        previewGradient: "from-cyan-400 to-purple-600",
      };

      setCustomThemes((prev) => [newCustom, ...prev]);
      setThemeId(newCustom.id);
      toast.success(isVideo ? "تم تطبيق فيديو الخلفية بنجاح! 🎬" : "تم تطبيق صورة الخلفية المخصصة بنجاح! 🖼️");
    };

    reader.readAsDataURL(file);
  };

  const removeCustomTheme = (id) => {
    setCustomThemes((prev) => prev.filter((t) => t.id !== id));
    if (themeId === id) {
      setThemeId("clinical_light");
    }
    toast.info("تم حذف الخلفية المخصصة");
  };

  const allThemes = [...customThemes, ...DEFAULT_THEMES];
  const currentTheme = allThemes.find((t) => t.id === themeId) || DEFAULT_THEMES[0];

  return (
    <StudyThemeContext.Provider
      value={{
        currentTheme,
        setThemeId,
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
