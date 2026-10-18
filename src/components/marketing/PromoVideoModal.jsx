import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  FileText,
  Brain,
  Swords,
  Send,
  Zap,
  CheckCircle2,
  Crown,
  ArrowRight,
  RotateCcw,
  Flame,
  Gauge,
  Cpu,
} from "lucide-react";
import { promoAudio } from "@/lib/promoAudioEngine";

const BASE_SCENE_DURATION_MS = 4800;

const SCENES = [
  {
    id: "upload-cache",
    badgeAr: "01 / الكاش الذكي للدفعة كلها ⚡",
    badgeEn: "01 / INSTANT UPLOAD & SMART BATCH CACHE",
    titleAr: "ارفع المحاضرة مرة.. والـ ٤٠١ طالب يفتحوها في ٠.٣ ثانية!",
    titleEn: "Drop Any Lecture PDF. Processed in 0.3s.",
    subtitleAr:
      "لو أي حد من دفعتك رفع المحاضرة قبلك، البصمة الرقمية الذكية بتلقطها فوراً (Cache Hit) وتفتحهالك في لمح البصر من غير ما تسحب توكن واحد!",
    subtitleEn:
      "When 401 students in your batch upload the same lecture, our Smart Content Fingerprint delivers an instant Cache Hit with 0 wait time.",
    narrationAr:
      "يا وحش الدفعة! ارفع أي ملف محاضرة مهما كان تقيل، ولو أي حد من الـ ٤٠١ طالب في دفعتك رفعه قبلك، الكاش الذكي هيفتحهولك في تلت ثانية بالظبط ومن غير ما يستهلك توكن واحد!",
    narrationEn:
      "Welcome to Black Fighters! Drop any heavy lecture PDF, and if anyone in your 401-student batch uploaded it before, our Smart Cache delivers it in 0.3 seconds with zero token cost!",
    accent: "#2563EB",
    icon: Zap,
  },
  {
    id: "bilingual-summary",
    badgeAr: "02 / الزيتونة متلونة وجاهزة للامتحان 🎯",
    badgeEn: "02 / HIGH-YIELD BILINGUAL SUMMARY",
    titleAr: "كل سؤال امتحان متلون قدامك.. من غير رغي ولا حشو!",
    titleEn: "Every Exam Pearl Highlighted. Zero Fluff.",
    subtitleAr:
      "اختار حجم الملخص (صغير، متوسط، كبير) وباللغة اللي تريحك (بايلينجوال، عربي، أو إنجليزي). التعريفات والأرقام ومواضع الأسئلة متلونة أوتوماتيك!",
    subtitleEn:
      "Switch seamlessly between Bilingual, English, or Arabic. Critical definitions, mechanisms, and red-flag clinical pearls are color-coded automatically.",
    narrationAr:
      "انسى التوهان في السلايدز! كل معلومة بتيجي في الامتحان متلونة ومتقسمة قدامك بنظام البايلينجوال عشان تحفظ المصطلح الإنجليزي وتفهم الشرح بالمصري في ثواني!",
    narrationEn:
      "Never miss an exam question again. Every clinical pearl, mechanism, and comparison table is color-coded and structured in Bilingual, English, or Arabic.",
    accent: "#10B981",
    icon: FileText,
  },
  {
    id: "hybrid-quiz",
    badgeAr: "03 / كويزات الكاش الهجين وبنك الأخطاء 🧠",
    badgeEn: "03 / HYBRID AI QUIZ & MISTAKE BANK",
    titleAr: "أسئلة متجددة مبتخلصش.. وشرح يفهمك كل تريكة!",
    titleEn: "Endless Fresh Questions + Instant Clinical Explanations.",
    subtitleAr:
      "محرك الكويزات الهجين بيخلط أقوى أسئلة كاش الدفعة مع أسئلة جديدة بالذكاء الاصطناعي في كل مرة، وبيحفظ غلطاتك عشان متقعش فيها تاني أبداً.",
    subtitleEn:
      "Our Hybrid Quiz Engine blends verified batch-cached questions with newly generated AI scenarios so every practice test is fresh, accurate, and fast.",
    narrationAr:
      "عايز تحل كتير؟ محرك الكويزات الهجين بيدمج أسئلة الكاش المعتمدة مع أسئلة جديدة ليك مخصوص في كل محاولة، مع تفسير كامل لكل إجابة وبنك لأخطائك!",
    narrationEn:
      "Master every topic with our Hybrid Quiz Engine. It combines verified batch questions with newly generated scenarios, complete with deep explanations.",
    accent: "#8B5CF6",
    icon: Brain,
  },
  {
    id: "live-challenge",
    badgeAr: "04 / تحديات لايف ١ ضد ١ مع صحابك 🔥",
    badgeEn: "04 / 1V1 LIVE CHALLENGE ARENA",
    titleAr: "افتح روم تحدي لايف.. وورّي الدفعة مين التوب!",
    titleEn: "Battle Your Classmates Live in Real Time.",
    subtitleAr:
      "بضغطة زرار اعمل غرفة تحدي، ابعت اللينك لصاحبك على تليجرام أو واتساب، واتنافسوا لايف بالثانية على نفس أسئلة محاضرتكم!",
    subtitleEn:
      "Create a live challenge room in one click, share the code on Telegram or WhatsApp, and compete head-to-head on speed and accuracy.",
    narrationAr:
      "المذاكرة بقت حماس ومنافسة! افتح روم تحدي لايف واحد ضد واحد أو مع شلتك، ابعت الكود في ثانية، واكسب نقط وتصدر لوحة شرف الكلية!",
    narrationEn:
      "Turn studying into an adrenaline rush. Launch a live 1v1 Challenge Room, share the room link with your friends, and climb the leaderboard.",
    accent: "#F59E0B",
    icon: Swords,
  },
  {
    id: "telegram-bot",
    badgeAr: "05 / تصدير فوري لبوت التليجرام واستطلاعات حية ✈️",
    badgeEn: "05 / 1-CLICK TELEGRAM BOT & LIVE POLLS",
    titleAr: "ملخصاتك وكويزاتك على موبايلك في التليجرام فوراً!",
    titleEn: "Your Summaries & Quiz Polls Delivered to Telegram.",
    subtitleAr:
      "صدّر كبسولة المذاكرة التفاعلية أو ابعت الأسئلة كـ Quiz Polls لايف على شات التليجرام بضغطة واحدة. اشترك دلوقتي وضمن الامتياز!",
    subtitleEn:
      "Export formatted study capsules and interactive Telegram Quiz Polls directly to your phone so you can revise anywhere, anytime.",
    narrationAr:
      "وبضغطة زرار واحدة، ابعت ملخصاتك وكويزاتك التفاعلية على بوت التليجرام مباشرة! مستني إيه يا بطل؟ اشترك دلوقتي في بلاك فايترز وقفل موادك باكتساح!",
    narrationEn:
      "And with one click, export your entire study guide and interactive Quiz Polls straight to our Telegram Bot. Join Black Fighters today!",
    accent: "#0088CC",
    icon: Send,
  },
];

export default function PromoVideoModal({
  open,
  onClose,
  onSelectPlan,
  onTryUpload,
}) {
  // Default to Egyptian Arabic ("ar") as requested by the user
  const [videoLang, setVideoLang] = useState("ar");
  const isEn = videoLang === "en";

  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.25);
  const [subStep, setSubStep] = useState(0);
  const [omniCustomLine, setOmniCustomLine] = useState("");
  const [omniLoading, setOmniLoading] = useState(false);

  const containerRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  const currentSceneObj = SCENES[activeScene] || SCENES[0];

  // Trigger audio + narration when modal opens or scene changes
  useEffect(() => {
    if (!open) {
      promoAudio.stopAll();
      return;
    }
    setSubStep(0);
    promoAudio.setMuted(isMuted);
    if (isPlaying) {
      promoAudio.startBackgroundMusic();
      promoAudio.playSceneTransition();
      const narrationText = isEn
        ? currentSceneObj.narrationEn
        : currentSceneObj.narrationAr;
      promoAudio.speakNarration(
        narrationText,
        isEn ? "en" : "ar",
        currentSceneObj.id
      );
    } else {
      promoAudio.stopBackgroundMusic();
    }
  }, [open, activeScene, isEn]);

  // Kinetic sub-beats inside each scene for ultra-fast visual motion
  useEffect(() => {
    if (!open || !isPlaying) return;
    const subInterval = setInterval(() => {
      setSubStep((prev) => {
        const next = (prev + 1) % 4;
        promoAudio.playSubBeatTick();
        return next;
      });
    }, Math.max(450, Math.round(950 / playbackSpeed)));
    return () => clearInterval(subInterval);
  }, [open, isPlaying, activeScene, playbackSpeed]);

  // Handle play/pause toggle effects
  useEffect(() => {
    if (!open) return;
    if (isPlaying) {
      promoAudio.startBackgroundMusic();
    } else {
      promoAudio.stopBackgroundMusic();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    }
  }, [isPlaying, open]);

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      promoAudio.setMuted(next);
      if (!next && isPlaying) {
        const narrationText = isEn
          ? currentSceneObj.narrationEn
          : currentSceneObj.narrationAr;
        promoAudio.speakNarration(
          narrationText,
          isEn ? "en" : "ar",
          currentSceneObj.id
        );
      }
      return next;
    });
  }, [isEn, isPlaying, currentSceneObj]);

  // Fast Timeline progress loop
  useEffect(() => {
    if (!open || !isPlaying) return;
    lastTickRef.current = Date.now();
    const effectiveDuration = BASE_SCENE_DURATION_MS / playbackSpeed;

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setSceneProgress((prev) => {
        const nextPct = prev + (delta / effectiveDuration) * 100;
        if (nextPct >= 100) {
          setActiveScene((s) => (s + 1) % SCENES.length);
          return 0;
        }
        return nextPct;
      });
    }, 35);

    return () => clearInterval(interval);
  }, [open, isPlaying, activeScene, playbackSpeed]);

  const handleSelectScene = (idx) => {
    setActiveScene(idx);
    setSceneProgress(0);
    setSubStep(0);
    setIsPlaying(true);
    promoAudio.playSuccessChime();
  };

  const cycleSpeed = () => {
    setPlaybackSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.6 : 1));
    promoAudio.playSuccessChime();
  };

  const generateLiveOmniEgyptianHook = async () => {
    if (omniLoading) return;
    setOmniLoading(true);
    try {
      const res = await fetch("/api/promo-omni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "script",
          sceneId: currentSceneObj.id,
        }),
      });
      const data = await res.json();
      const line =
        data?.scriptLine ||
        "يا بطل الدفعة! مع بلاك فايترز ومحرك الكاش الذكي هتفرم المحاضرات في ثواني وتقفل الامتحان باكتساح!";
      setOmniCustomLine(line);
      promoAudio.playSuccessChime();
      promoAudio.speakNarration(line, "ar", `live-${Date.now()}`);
    } catch {
      const fallbackLine =
        "يا وحش الكلية! اشترك دلوقتي في بلاك فايترز واستلم ملخصاتك وكويزاتك في تلت ثانية بالكاش الذكي!";
      setOmniCustomLine(fallbackLine);
      promoAudio.speakNarration(fallbackLine, "ar", "live-fallback");
    } finally {
      setOmniLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!open) return null;

  const animatedStudentsCount =
    subStep === 0 ? 142 : subStep === 1 ? 289 : subStep === 2 ? 378 : 401;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-5 overflow-y-auto"
        dir={isEn ? "ltr" : "rtl"}
      >
        <motion.div
          ref={containerRef}
          initial={{ scale: 0.92, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 14 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="relative w-full max-w-5xl rounded-3xl border border-white/15 bg-[#070A12] text-white shadow-[0_32px_120px_rgba(0,0,0,0.92)] overflow-hidden flex flex-col"
        >
          {/* Ambient Top Glow */}
          <div
            className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[680px] h-[260px] rounded-full blur-[110px] opacity-40 transition-colors duration-300"
            style={{ backgroundColor: currentSceneObj.accent }}
          />

          {/* Top Segmented Story Progress Bar + Controls */}
          <div className="relative z-20 px-4 sm:px-7 pt-4 pb-3 border-b border-white/[0.08] bg-[#0B0F1B]/90">
            {/* 5-Scene Progress Segments */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {SCENES.map((sc, idx) => {
                const fill =
                  idx < activeScene ? 100 : idx === activeScene ? sceneProgress : 0;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleSelectScene(idx)}
                    className="group relative h-2.5 rounded-full bg-white/10 overflow-hidden cursor-pointer text-left"
                    title={isEn ? sc.titleEn : sc.titleAr}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${fill}%`,
                        backgroundColor: sc.accent,
                        boxShadow: `0 0 12px ${sc.accent}`,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>gemini-omni-1.1-flash</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-[11px] font-extrabold text-blue-300">
                  <Sparkles className="w-3 h-3" />
                  {isEn ? "TURBO PROMO" : "إعلان المنصة بالعامية المصرية 🇪🇬"}
                </span>
                <span className="hidden md:inline-block text-xs font-mono text-slate-400 tabular-nums">
                  {String(activeScene + 1).padStart(2, "0")} / 05
                </span>
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-1.5">
                {/* Language Switcher (Default: Egyptian Arabic) */}
                <button
                  type="button"
                  onClick={() => setVideoLang((l) => (l === "ar" ? "en" : "ar"))}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-[11px] font-extrabold text-amber-300 transition cursor-pointer"
                >
                  {isEn ? "🇪🇬 عامية مصرية" : "🇬🇧 English"}
                </button>

                {/* Speed Control */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/15 border border-purple-500/35 text-[11px] font-mono font-extrabold text-purple-300 hover:bg-purple-500/25 transition cursor-pointer"
                  title="سرعة التنقل"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{playbackSpeed}x</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] text-xs font-bold text-white transition cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">
                        {isEn ? "Pause" : "إيقاف"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">
                        {isEn ? "Play" : "تشغيل"}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isMuted
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>{isEn ? "Unmute" : "تشغيل الصوت"}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                      <span>{isEn ? "Audio ON" : "صوت مصري شغال"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScene(0)}
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-slate-300 hover:text-white transition cursor-pointer"
                  title={isEn ? "Replay" : "إعادة من الأول"}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-slate-300 hover:text-white transition cursor-pointer"
                  title={isEn ? "Fullscreen" : "ملء الشاشة"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    promoAudio.stopAll();
                    onClose?.();
                  }}
                  className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-rose-500/25 text-slate-300 hover:text-rose-200 transition cursor-pointer"
                  title={isEn ? "Close" : "إغلاق"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Stage: Split Between Narrative Copy & Fast Kinetic UI Choreography */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-7 items-center min-h-[400px]">
            {/* Narrative Column (5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSceneObj.id}
                  initial={{ opacity: 0, x: isEn ? -24 : 24, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: isEn ? 24 : -24, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  className="space-y-3.5"
                >
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-extrabold tracking-wider uppercase"
                    style={{
                      backgroundColor: `${currentSceneObj.accent}22`,
                      color: currentSceneObj.accent,
                      border: `1px solid ${currentSceneObj.accent}55`,
                    }}
                  >
                    <currentSceneObj.icon className="w-3.5 h-3.5" />
                    {isEn ? currentSceneObj.badgeEn : currentSceneObj.badgeAr}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug text-white">
                    {isEn ? currentSceneObj.titleEn : currentSceneObj.titleAr}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {isEn ? currentSceneObj.subtitleEn : currentSceneObj.subtitleAr}
                  </p>

                  {/* Synchronized Voiceover Subtitle Box + Omni Live Generator */}
                  <div className="rounded-2xl bg-white/[0.05] border border-emerald-500/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        {isEn
                          ? "OMNI 1.1 FLASH VOICEOVER"
                          : "التعليق الصوتي بالعامية المصرية 🎙️"}
                      </div>
                      <button
                        type="button"
                        onClick={generateLiveOmniEgyptianHook}
                        disabled={omniLoading}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-extrabold text-emerald-300 transition cursor-pointer"
                      >
                        {omniLoading
                          ? "جاري التوليد..."
                          : isEn
                          ? "⚡ Live Omni Hook"
                          : "⚡ جملة حماسية بـ Omni"}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-white font-bold leading-relaxed">
                      “
                      {omniCustomLine ||
                        (isEn
                          ? currentSceneObj.narrationEn
                          : currentSceneObj.narrationAr)}
                      ”
                    </p>
                  </div>

                  {/* Scene Switcher Tabs */}
                  <div className="grid grid-cols-5 gap-1.5 pt-1">
                    {SCENES.map((sc, i) => {
                      const Icon = sc.icon;
                      const active = i === activeScene;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => handleSelectScene(i)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[10px] font-extrabold transition cursor-pointer ${
                            active
                              ? "bg-white/15 border-white/40 text-white shadow-lg scale-[1.03]"
                              : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
                          }`}
                        >
                          <Icon
                            className="w-4 h-4 mb-1"
                            style={{ color: active ? sc.accent : undefined }}
                          />
                          <span className="truncate max-w-full">
                            {i === 0
                              ? isEn
                                ? "Cache"
                                : "الكاش ⚡"
                              : i === 1
                              ? isEn
                                ? "Summary"
                                : "الزيتونة"
                              : i === 2
                              ? isEn
                                ? "Quiz"
                                : "الكويز"
                              : i === 3
                              ? isEn
                                ? "1v1 Live"
                                : "التحدي 🔥"
                              : isEn
                              ? "Telegram"
                              : "تليجرام"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Visual Stage Column (7 cols): Ultra-Fast Kinetic UI Choreography */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl border border-white/15 bg-[#0D1322] p-4 sm:p-6 shadow-2xl min-h-[340px] flex flex-col justify-between overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeScene === 0 && (
                    <motion.div
                      key="scene-0"
                      initial={{ opacity: 0, scale: 0.9, rotateX: 8 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">
                              Cardiology_Pathology_Lecture_04.pdf
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              94 Pages • SHA-256 Fingerprint #8F4A92C
                            </div>
                          </div>
                        </div>
                        <motion.span
                          key={subStep}
                          initial={{ scale: 0.85 }}
                          animate={{ scale: 1 }}
                          className="px-2.5 py-1 rounded-md bg-emerald-500/25 border border-emerald-400/60 text-emerald-300 text-xs font-black tabular-nums shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                        >
                          ⚡ CACHE HIT 0.31s
                        </motion.span>
                      </div>

                      {/* Batch Cohort Counter with Live Kinetic Ticking */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-white/[0.05] border border-emerald-500/30 p-3">
                          <div className="text-[11px] text-slate-300 font-bold">
                            {isEn ? "Batch Students Synced" : "طلاب الدفعة المستفيدين"}
                          </div>
                          <motion.div
                            key={animatedStudentsCount}
                            initial={{ y: 8, opacity: 0.5 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xl font-black text-emerald-400 tabular-nums mt-0.5"
                          >
                            {animatedStudentsCount} / 401
                          </motion.div>
                          <div className="text-[10px] text-emerald-300 font-bold mt-1">
                            {isEn ? "0 Tokens Spent!" : "توفير ١٠٠٪ من التوكنز!"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
                          <div className="text-[11px] text-slate-300 font-bold">
                            {isEn ? "Summary Depth" : "حجم التلخيص"}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            {["صغير", "متوسط", "كبير"].map((lbl, idx) => (
                              <span
                                key={lbl}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  subStep % 3 === idx
                                    ? "bg-blue-600 text-white scale-105 shadow"
                                    : "bg-white/10 text-slate-300"
                                }`}
                              >
                                {lbl}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
                          <div className="text-[11px] text-slate-300 font-bold">
                            {isEn ? "Output Language" : "لغة الملخص"}
                          </div>
                          <div className="text-sm font-black text-blue-400 mt-1">
                            Bilingual (EN + عربي)
                          </div>
                          <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                            {isEn ? "100% Exam Terms" : "المصطلح + الشرح بالمصري"}
                          </div>
                        </div>
                      </div>

                      {/* Animated Progress Verification */}
                      <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
                          <span className="text-xs sm:text-sm font-extrabold text-emerald-100">
                            {isEn
                              ? "Lecture Fingerprint Matched! Instant Delivery!"
                              : "البصمة اتطابقت في الكاش! الملخص والكويز جاهزين في نفس اللحظة!"}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-black text-emerald-300 tabular-nums">
                          100%
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {activeScene === 1 && (
                    <motion.div
                      key="scene-1"
                      initial={{ opacity: 0, x: 40, scale: 0.94 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -40, scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      className="space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                          {isEn
                            ? "BILINGUAL SMART STUDY GUIDE • V3"
                            : "الزيتونة المتلونة • مصطلح إنجليزي + شرح مصري"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-[10px] font-bold">
                            تعريفات
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] font-bold">
                            أرقام
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                            سؤال امتحان 🔥
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2.5 text-xs sm:text-sm">
                        <div className="font-black text-white flex items-center justify-between">
                          <span>1. Acute Coronary Syndrome (متلازمة الشريان التاجي)</span>
                          <motion.span
                            animate={{ scale: subStep % 2 === 0 ? 1.08 : 1 }}
                            className="px-2 py-0.5 rounded bg-rose-500/25 border border-rose-500/50 text-rose-200 text-[10px] font-black"
                          >
                            جاي في الامتحان 🔥
                          </motion.span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">
                          •{" "}
                          <span
                            className={`px-1.5 py-0.5 rounded font-black transition-all duration-200 ${
                              subStep >= 0
                                ? "bg-yellow-400/30 text-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.3)]"
                                : ""
                            }`}
                          >
                            Troponin I / T
                          </span>{" "}
                          أدق إنزيم لتشخيص الجلطة؛ بيعلى في الدم خلال{" "}
                          <span
                            className={`px-1.5 py-0.5 rounded font-black transition-all duration-200 ${
                              subStep >= 1
                                ? "bg-emerald-400/30 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                : ""
                            }`}
                          >
                            3–4 ساعات
                          </span>{" "}
                          ويفضل عالي لمدة ٧ لـ ١٠ أيام.
                        </p>
                        <p className="text-slate-200 leading-relaxed">
                          •{" "}
                          <span
                            className={`px-1.5 py-0.5 rounded font-black transition-all duration-200 ${
                              subStep >= 2
                                ? "bg-rose-500/30 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
                                : ""
                            }`}
                          >
                            خلي بالك (Red Flag):
                          </span>{" "}
                          في جلطة الجدار السفلي (Leads II, III, aVF) اوعى تدي Nitrates عشان الضغط ميقعش فجأة!
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-xl bg-blue-500/15 border border-blue-500/35 p-3">
                          <div className="font-black text-blue-300 mb-1">
                            STEMI (انسداد كلي)
                          </div>
                          <div className="text-slate-200 font-medium">
                            ST elevation • قسطرة فورية خلال 90 دقيقة
                          </div>
                        </div>
                        <div className="rounded-xl bg-purple-500/15 border border-purple-500/35 p-3">
                          <div className="font-black text-purple-300 mb-1">
                            NSTEMI (انسداد جزئي)
                          </div>
                          <div className="text-slate-200 font-medium">
                            ST depression • Troponin إيجابي عالي
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeScene === 2 && (
                    <motion.div
                      key="scene-2"
                      initial={{ opacity: 0, y: 30, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -30, scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      className="space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-purple-500/25 border border-purple-500/50 text-purple-200 text-xs font-black">
                          ⚡ كويز هجين: 50% من كاش الدفعة + 50% أسئلة جديدة ليك
                        </span>
                        <span className="text-xs font-mono text-amber-400 font-black tabular-nums">
                          ⏱ 00:{39 - subStep * 3}
                        </span>
                      </div>

                      <div className="rounded-xl bg-white/[0.06] border border-white/15 p-3.5">
                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed" dir="ltr">
                          Q4: A 58-year-old male presents with crushing chest pain & ST-elevation in leads II, III, and aVF. Which coronary artery is occluded?
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" dir="ltr">
                        {[
                          { label: "A. Left Anterior Descending (LAD)", ok: false },
                          { label: "B. Right Coronary Artery (RCA)", ok: true },
                          { label: "C. Left Circumflex Artery (LCx)", ok: false },
                          { label: "D. Posterior Cerebral Artery", ok: false },
                        ].map((opt) => {
                          const showCorrect = subStep >= 1 && opt.ok;
                          return (
                            <motion.div
                              key={opt.label}
                              animate={{ scale: showCorrect ? 1.03 : 1 }}
                              className={`p-2.5 rounded-xl border font-bold flex items-center justify-between transition-all ${
                                showCorrect
                                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                                  : "bg-white/[0.03] border-white/10 text-slate-400"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {showCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              )}
                            </motion.div>
                          );
                        })}
                      </div>

                      <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/35 p-3 text-xs text-emerald-100 font-bold">
                        💡 التفسير بالمصري: Leads II, III, aVF بتبص على الجدار السفلي للقلب واللي بيغذيه الشريان التاجي الأيمن (RCA) في 85% من الحالات!
                      </div>
                    </motion.div>
                  )}

                  {activeScene === 3 && (
                    <motion.div
                      key="scene-3"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.08 }}
                      transition={{ type: "spring", stiffness: 450, damping: 26 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <Swords className="w-5 h-5 text-amber-400 animate-bounce" />
                          <span className="text-sm font-black text-white">
                            {isEn ? "LIVE 1v1 CHALLENGE ROOM" : "روم تحدي لايف ١ ضد ١ مع صحابك 🔥"}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                          ROOM #BF-9042
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-gradient-to-b from-emerald-500/20 to-transparent border-2 border-emerald-400/60 p-4 text-center shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/30 border-2 border-emerald-400 mx-auto flex items-center justify-center font-black text-lg text-emerald-200">
                            أنت
                          </div>
                          <div className="font-black text-white mt-2">د. أحمد (أنت)</div>
                          <motion.div
                            key={subStep}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-black text-emerald-400 tabular-nums mt-1"
                          >
                            {850 + subStep * 50} نقطة
                          </motion.div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 text-[10px] font-black mt-2">
                            <Flame className="w-3 h-3" /> {5 + subStep}x Streak متتالي!
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white/[0.04] border border-white/15 p-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-400/50 mx-auto flex items-center justify-center font-black text-lg text-blue-300">
                            S
                          </div>
                          <div className="font-black text-white mt-2">د. سارة (المنافس)</div>
                          <div className="text-2xl font-black text-blue-400 tabular-nums mt-1">
                            {780 + subStep * 20} نقطة
                          </div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px] font-bold mt-2">
                            سرعة الإجابة: 1.8 ثانية
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-center text-xs font-extrabold text-amber-200">
                        🏆 شير لينك الروم على جروب الدفعة في تليجرام أو واتساب وتحدى لحد 50 طالب لايف!
                      </div>
                    </motion.div>
                  )}

                  {activeScene === 4 && (
                    <motion.div
                      key="scene-4"
                      initial={{ opacity: 0, x: -35, scale: 0.94 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 35, scale: 0.94 }}
                      transition={{ type: "spring", stiffness: 450, damping: 28 }}
                      className="space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-[#0088CC]" />
                          <span className="text-xs sm:text-sm font-black text-white">
                            @Black_Fighters_FREE_bot • بوت التليجرام المباشر
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#0088CC]/30 text-[#38bdf8] text-[11px] font-black">
                          متصل فوراً ✓
                        </span>
                      </div>

                      <div className="space-y-2.5 bg-[#09101D] rounded-xl p-3.5 border border-white/10">
                        <div className="rounded-xl bg-[#182533] p-3 text-xs space-y-1.5 border border-[#0088CC]/40">
                          <div className="font-black text-[#38bdf8]">
                            📚 كبسولة محاضرتك وصلت على تليجرام!
                          </div>
                          <div className="text-slate-200 font-medium">
                            • Cardiology_Lecture_04_StudyGuide.html (تفتح بدون نت على موبايلك)
                          </div>
                        </div>

                        <div className="rounded-xl bg-[#182533] p-3 text-xs space-y-2 border border-emerald-500/40">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-emerald-400">
                              📊 كويز تفاعلي على تليجرام (Telegram Quiz Poll)
                            </span>
                            <span className="text-[10px] text-amber-300 font-bold">
                              تصويت حي للدفعة
                            </span>
                          </div>
                          <div className="font-bold text-white">
                            إيه هو أدق تحليل لتشخيص جلطة القلب الحادة؟
                          </div>
                          <div className="space-y-1.5">
                            <div className="relative overflow-hidden flex items-center justify-between bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-emerald-200 font-black">
                              <span>✓ Cardiac Troponin I (cTnI)</span>
                              <span>{88 + subStep * 2}%</span>
                            </div>
                            <div className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1 text-slate-400">
                              <span>LDH Isoenzymes</span>
                              <span>{12 - subStep * 2}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* High-Converting Bottom Call-To-Action Bar */}
          <div className="relative z-20 px-5 sm:px-8 py-4 border-t border-white/10 bg-gradient-to-r from-[#0B1020] via-[#111A34] to-[#0B1020] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-start">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 items-center justify-center text-amber-400 shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-black text-white">
                  {isEn
                    ? "Ready to 10x Your Exam Scores with Black Fighters?"
                    : "جاهز تقفل موادك وتوفر ٩٠٪ من وقت المذاكرة يا بطل؟"}
                </div>
                <div className="text-xs text-slate-300">
                  {isEn
                    ? "Unlock Unlimited Smart Summaries, Hybrid Quizzes, Live Challenges & Telegram Bot Sync."
                    : "اشترك دلوقتي وافتح الكاش الذكي للدفعة، الملخصات المتلونة، الكويزات الهجينة، وبوت التليجرام فوراً!"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  promoAudio.stopAll();
                  onClose?.();
                  onTryUpload?.();
                }}
                className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs sm:text-sm font-bold text-white transition cursor-pointer"
              >
                {isEn ? "Try Lecture Upload Free" : "جرب ارفع محاضرتك ببلاش"}
              </button>

              <button
                type="button"
                onClick={() => {
                  promoAudio.stopAll();
                  onClose?.();
                  onSelectPlan?.();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-xs sm:text-sm font-black text-white shadow-[0_10px_30px_rgba(16,185,129,0.45)] transition cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>
                  {isEn ? "Subscribe & Unlock Full Access" : "اشترك دلوقتي في المنصة 🚀"}
                </span>
                <ArrowRight className={`w-4 h-4 ${isEn ? "" : "rotate-180"}`} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
