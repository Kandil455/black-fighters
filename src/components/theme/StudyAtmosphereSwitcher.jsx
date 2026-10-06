import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Palette, Check, X, Upload, Video, 
  Image as ImageIcon, Trash2, Crown, Plus
} from "lucide-react";
import { useStudyTheme, DEFAULT_THEMES } from "@/lib/StudyThemeContext";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sounds";

export function StudyAtmosphereSwitcher({ triggerClassName = "" }) {
  const { 
    currentTheme, setThemeId, allThemes, customThemes, 
    addCustomTheme, removeCustomTheme, isPro 
  } = useStudyTheme();
  
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSelect = (id) => {
    setThemeId(id);
    playClick();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addCustomTheme(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/90 overflow-hidden overscroll-contain"
          onClick={() => setOpen(false)}
          dir="ltr"
        >
          {/* SCROLL ARCHITECTURE (measured, not guessed): the overlay used to be
              overflow-y-auto AND backdrop-blur-2xl — scrolling inside a
              backdrop-filtered element re-rasterizes the blur bands every
              frame (1080p ≈ 3.3G texture samples/frame at 40px radius), plus
              every uploaded wallpaper video decoded simultaneously. Now the
              overlay never scrolls (overflow-hidden, no filter), the sheet
              caps at 92vh, and the ONE scroll container is the unblurred
              body below — native-smooth at zero filter cost. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090a10] border border-white/20 shadow-[0_30px_100px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            {/* Top Accent Line */}
            <div
              className="h-1.5 w-full shrink-0 transition-colors duration-500"
              style={{
                background: `linear-gradient(90deg, ${currentTheme.primaryColor}, ${currentTheme.accentColor})`,
              }}
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${currentTheme.primaryColor}33, ${currentTheme.accentColor}22)`,
                    border: `1px solid ${currentTheme.primaryColor}55`,
                  }}
                >
                  <Palette className="w-5 h-5" style={{ color: currentTheme.primaryColor }} />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-white font-heading tracking-wide flex items-center gap-2">
                    <span>Study Wallpapers & Custom Backgrounds</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Select a preset or upload your own custom photo or live video background
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors border border-white/10"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto max-h-[65vh] p-4 sm:p-6 space-y-6">
              
              {/* ── Custom Upload Banner & Action Hub ── */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-black text-white font-heading">
                      Upload Custom Wallpaper
                    </h4>
                    {isPro ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> PRO UNLIMITED & VIDEO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white/70 border border-white/15">
                        Free: 1 Image Max
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/55">
                    {isPro
                      ? "Upload high-res images (JPG, PNG, WebP) or animated live videos (MP4, WebM)."
                      : "Free users can upload 1 image background. Upgrade to Pro for unlimited images & live videos!"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={isPro ? "image/*,video/mp4,video/webm" : "image/*"}
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-4 rounded-xl text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-[color,background-color,border-color,box-shadow,transform] flex items-center gap-2 hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4 text-primary" />
                    <span>Upload Image / Video</span>
                  </button>

                  {!isPro && (
                    <Link
                      to="/subscriptions"
                      onClick={() => setOpen(false)}
                      className="h-10 px-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-black flex items-center gap-1.5 hover:opacity-95 transition-opacity"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Unlock Pro</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* ── Custom Uploaded Wallpapers (if any) ── */}
              {customThemes.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Your Uploaded Wallpapers</span>
                    <span className="text-[10px] text-white/40">({customThemes.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {customThemes.map((theme) => {
                      const isSelected = theme.id === currentTheme.id;
                      return (
                        <div
                          key={theme.id}
                          className={cn(
                            "relative flex flex-col rounded-2xl overflow-hidden border-2 transition-colors duration-200 group",
                            isSelected
                              ? "border-primary shadow-[0_0_25px_rgba(0,245,255,0.35)] ring-2 ring-primary/60 scale-[1.01]"
                              : "border-white/10 hover:border-white/30 bg-white/[0.03]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(theme.id)}
                            className="relative h-28 w-full bg-black/60 overflow-hidden text-left focus:outline-none"
                          >
                            {theme.isVideo ? (
                              <video
                                src={theme.videoUrl}
                                muted
                                loop
                                autoPlay={isSelected}
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <img
                                src={theme.image}
                                alt={theme.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-[#090a10] via-black/20 to-transparent" />

                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black/75 border border-white/20 text-white flex items-center gap-1">
                              {theme.isVideo ? <Video className="w-2.5 h-2.5 text-purple-400" /> : <ImageIcon className="w-2.5 h-2.5 text-cyan-400" />}
                              <span>{theme.tag}</span>
                            </div>

                            {isSelected && (
                              <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-black flex items-center gap-1 shadow-lg">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Active</span>
                              </div>
                            )}
                          </button>

                          <div className="p-3 bg-[#090a10]/95 flex items-center justify-between border-t border-white/5">
                            <span className="text-xs font-bold text-white truncate max-w-[180px]">
                              {theme.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCustomTheme(theme.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-white/5 transition-colors"
                              title="Delete custom wallpaper"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Default Presets Grid ── */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-white/50 uppercase tracking-wider">
                  Preset 8K Study Themes
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {DEFAULT_THEMES.map((theme) => {
                    const isSelected = theme.id === currentTheme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelect(theme.id)}
                        className={cn(
                          "relative flex flex-col text-left rounded-2xl overflow-hidden border-2 transition-colors duration-200 group text-start focus:outline-none",
                          isSelected
                            ? "border-primary shadow-[0_0_30px_rgba(0,245,255,0.35)] ring-2 ring-primary/60 scale-[1.01]"
                            : "border-white/10 hover:border-white/35 bg-white/[0.03] hover:bg-white/[0.07]"
                        )}
                        style={{
                          borderColor: isSelected ? theme.primaryColor : undefined,
                        }}
                      >
                        {/* Image Preview / Banner */}
                        <div className="relative h-32 sm:h-36 w-full bg-black/60 overflow-hidden shrink-0">
                          {theme.image ? (
                            <img
                              src={theme.image}
                              alt={theme.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                              <span className="text-xs font-mono font-bold text-white/40 tracking-widest">
                                PURE DARK MINIMAL
                              </span>
                            </div>
                          )}

                          {/* Gradient shadow over image */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#090a10] via-black/30 to-transparent" />

                          {/* Theme Tag Badge */}
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/70 border border-white/20 text-white backdrop-blur-md">
                            {theme.tag}
                          </div>

                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div
                              className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-xl text-black"
                              style={{ background: theme.primaryColor }}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Active</span>
                            </div>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="p-3.5 bg-[#090a10]/95 flex-1 flex flex-col justify-between border-t border-white/5">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-black text-base text-white font-heading">
                                {theme.name}
                              </span>
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: theme.primaryColor, boxShadow: `0 0 8px ${theme.primaryColor}` }}
                              />
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                              {theme.desc}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#06070a] flex items-center justify-between text-xs text-white/50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] tracking-wider text-cyan-400 font-bold">
                  BLACK FIGHTERS STUDIO • DYNAMIC BACKGROUNDS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-6 py-2.5 rounded-xl font-black text-xs text-black bg-gradient-to-r from-cyan-400 to-primary hover:opacity-95 transition-opacity shadow-lg"
              >
                Apply & Save ✓
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          playClick();
        }}
        className={cn(
          // transition-colors only — a blanket hover transition drags the
          // framer mount transform into the hover path (this trigger sits
          // inside the hero tilt card; forced reflow + jumpy scale).
          // No hover scale — transform-only scale inside cards is the banned
          // idle-jitter pattern; feedback = border + bg lighten (§7 recipe).
          "inline-flex items-center gap-2 rounded-2xl font-black transition-[color,background-color,border-color] duration-200 shadow-lg group",
          "h-9 px-3.5 min-w-0 max-w-full text-xs",
          "bg-white/[0.08] border border-white/20 hover:border-primary/50 text-foreground hover:bg-white/[0.14]",
          triggerClassName
        )}
        title={`${currentTheme.name} — Change Study Wallpaper`}
      >
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: currentTheme.primaryColor, boxShadow: `0 0 10px ${currentTheme.primaryColor}` }}
        >
          <Sparkles className="w-2.5 h-2.5 text-black" />
        </div>
        <span className="font-heading truncate font-mono text-[11px] min-w-0">{currentTheme.name}</span>
        <Palette className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>

      {/* Render Modal into document.body with React Portal */}
      {mounted && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}

export default StudyAtmosphereSwitcher;
