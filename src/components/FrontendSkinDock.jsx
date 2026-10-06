import React, { useEffect, useState } from "react";

export const FRONTEND_SKINS = [
  {
    id: "visor",
    num: "1",
    label: "Visor 6.0",
    sub: "Cyan × Ember",
    dot: "#5cf2ff",
    accent: "#5cf2ff",
  },
  {
    id: "linevault",
    num: "2",
    label: "LineVault",
    sub: "Emerald × Carbon",
    dot: "#3DDC97",
    accent: "#3DDC97",
  },
  {
    id: "atlas",
    num: "3",
    label: "Atlas V5",
    sub: "Royal Gold",
    dot: "#e5b84b",
    accent: "#e5b84b",
  },
  {
    id: "linear",
    num: "4",
    label: "Linear OLED",
    sub: "Pure Black × White",
    dot: "#ffffff",
    accent: "#ffffff",
  },
  {
    id: "crimson",
    num: "5",
    label: "Cyber Arena",
    sub: "Fighter Crimson",
    dot: "#ff2e54",
    accent: "#ff2e54",
  },
];

export function getSavedSkin() {
  if (typeof window === "undefined") return "linevault";
  try {
    return localStorage.getItem("bf_frontend_skin") || "linevault";
  } catch {
    return "linevault";
  }
}

export function applyFrontendSkin(skinId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-bf-skin", skinId);
  try {
    localStorage.setItem("bf_frontend_skin", skinId);
    window.dispatchEvent(new CustomEvent("bf-skin-change", { detail: skinId }));
  } catch {
    // ignore storage errors
  }
}

export default function FrontendSkinDock() {
  const [skin, setSkin] = useState(getSavedSkin);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    applyFrontendSkin(skin);
    const onExternal = (e) => {
      if (e?.detail) setSkin(e.detail);
    };
    window.addEventListener("bf-skin-change", onExternal);
    return () => window.removeEventListener("bf-skin-change", onExternal);
  }, [skin]);

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-1/2 z-[9990] -translate-x-1/2 max-w-[96vw]"
    >
      <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#07090e]/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-white/80 hover:bg-white/10"
          title="تبديل أشكال الواجهة الخمسة"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[rgb(var(--lv-accent))]" />
          <span>5 أشكال للـ Front</span>
        </button>

        {!collapsed && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {FRONTEND_SKINS.map((s) => {
              const active = skin === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSkin(s.id);
                    applyFrontendSkin(s.id);
                  }}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-[rgb(var(--lv-accent))] text-[#03150b] shadow-sm"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: active ? "#03150b" : s.dot }}
                  />
                  <span>
                    {s.num}. {s.label}
                  </span>
                </button>
              );
            })}
            <a
              href="/bf-5-frontends.html"
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-mono text-white/80 hover:border-white/30 hover:text-white"
            >
              معاينة شاملة ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
