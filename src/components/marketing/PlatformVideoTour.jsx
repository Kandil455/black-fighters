import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Download,
  Headphones,
  BookOpen,
  Brain,
  Layers,
  Sparkles,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const TOUR_SLIDES = [
  {
    id: "overview",
    badge: "مقدمة المنصة",
    title: "مرحباً بك في Black Fighters ⚡",
    subtitle: "المنصة الأكاديمية الذكية الشاملة لدراسة الطب وجميع الكليات في مكان واحد",
    icon: Sparkles,
    color: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accent: "#19f08c",
    highlights: [
      "تفريغ المحاضرات الصوتية بالحرف مع إرجاع المصطلحات الإنجليزية وكلام الدكتور",
      "تلخيص أكاديمي احترافي بنمط Post-Mortem مع جداول مقارنات ورسومات توضيحية SVG",
      "استخراج ودمج صور وسلايدز الدكتور داخل التلخيص مع زرار إظهار/إخفاء الصور",
      "بنك كويزات تفاعلي مربوط مباشرة ببوت التليجرام لإرسال الأسئلة كـ Polls للدفعة",
      "تثبيت الحفظ بخوارزمية التكرار المتباعد الذكية FSRS v4.5",
    ],
    ctaText: "ابدأ جولتك الآن",
    ctaAction: null,
  },
  {
    id: "transcription",
    badge: "ميزة التفريغ الصوتي",
    title: "تفريغ المحاضرات الصوتية الذكي 🎙️",
    subtitle: "سجل من المايك أو ارفع ريكورد المحاضرة ليتحول إلى تفريغ طبي فائق الدقة",
    icon: Headphones,
    color: "from-sky-500/20 via-blue-500/10 to-transparent",
    accent: "#38bdf8",
    highlights: [
      "🎙️ تسجيل مباشر من المايك لايف داخل المحاضرة أو رفع أي ملف صوت/فيديو حتى 200MB",
      "🇬🇧 استرجاع المصطلحات الطبية المنطوقة بالإنجليزية تلقائياً مهما كانت لهجة الشرح",
      "💬 صندوق «قال الدكتور:» بإطار منقّط لحفظ كلمات الدكتور الحرفية وتنبيهاته",
      "📄 توليد مذكرة Post-Mortem كاملة (إنجليزي + شرح عربي + رسومات SVG + تجميعة الامتحان)",
      "📎 إمكانية إرفاق ملف PDF / سلايدز الدكتور لدمجها واستخراج صورها مع التفريغ",
    ],
    ctaText: "جرب تفريغ المحاضرات الصوتية الآن",
    ctaAction: "/lectures",
  },
  {
    id: "summary_postmortem",
    badge: "نمط Post-Mortem & الصور",
    title: "التلخيص الأكاديمي بنمط Post-Mortem 📄",
    subtitle: "نفس تنسيق المذكرات المعتمد مع دمج صور الدكتور وإمكانية إخفائها بضغطة زر",
    icon: BookOpen,
    color: "from-amber-500/20 via-orange-500/10 to-transparent",
    accent: "#f59e0b",
    highlights: [
      "🟨 تظليل أصفر تلقائي على العناوين والجرعات والأرقام والمصطلحات في الجمل الإنجليزية",
      "⬛ شرح عربي تفصيلي في صندوق أنيق بحد أيمن عريض لتحقيق أقصى فهم",
      "🖼️ زرار التحكم في صور الملف: إظهار أو إخفاء صور الملف الأصلي في أي وقت",
      "📊 رسومات SVG تخطيطية لكل آلية وجداول مقارنات سوداء محددة للامتحان",
      "🖨️ تصدير بجميع الصيغ: مذكرة HTML تفاعلية، أو كتاب PDF (A4) للطباعة، أو عرض PowerPoint",
    ],
    ctaText: "ارفع ولخّص محاضرة الآن",
    ctaAction: "/create",
  },
  {
    id: "quiz_telegram",
    badge: "الكويزات وبوت التليجرام",
    title: "بنك الكويزات التفاعلي وبوت التليجرام 🎯",
    subtitle: "امتحن على أي محاضرة فوراُ، وشارك الكويزات مع زملائك على تليجرام كـ Polls",
    icon: Brain,
    color: "from-violet-500/20 via-purple-500/10 to-transparent",
    accent: "#a855f7",
    highlights: [
      "🎯 توليد كويزات MCQ وحالات سريرية مخصصة من تفريغ المحاضرة أو الملخص",
      "🚀 صفحة مستقلة لكل امتحان (/q/:id) برابط مباشر للمشاركة مع الدفعة",
      "✈️ إرسال الكويز بضغطة زر إلى بوت التليجرام لإنشاء استطلاعات تفاعلية (Polls)",
      "💡 تفسير فوري لكل إجابة صحيحة أو خاطئة مع توضيح السبب العلمي",
      "📊 بنك أسئلة تراكمي لأسئلة النظري والعملي لمراجعتها ليلة الامتحان",
    ],
    ctaText: "ادخل بنك الكويزات",
    ctaAction: "/quizzes",
  },
  {
    id: "fsrs_mastery",
    badge: "المراجعة والتثبيت",
    title: "تثبيت الحفظ والمراجعة الذكية بـ FSRS 🧠",
    subtitle: "نظام التكرار المتباعد الذكي يضمن عدم نسيان أي معلومة حتى يوم الامتحان",
    icon: Layers,
    color: "from-rose-500/20 via-pink-500/10 to-transparent",
    accent: "#f43f5e",
    highlights: [
      "🔄 خوارزمية FSRS v4.5 المتطورة لحساب الموعد المثالي لمراجعة كل بطاقة",
      "🃏 فلاش كاردز ذكية تُبنى تلقائياً من ملخصات ومحاضرات المستخدم",
      "🛠️ استوديو أدوات PDF: دمج، تقسيم، ضغط، وترقيم الملفات بدون إنترنت",
      "🔬 معمل العملي والصور لتحويل صور الأشعة والشرائح إلى امتحانات عملي (OSCE)",
      "🏆 لوحة الشرف ونظام الإنجازات لمتابعة التقدم والتنافس الأكاديمي",
    ],
    ctaText: "ابدأ المراجعة الذكية",
    ctaAction: "/review",
  },
];

export function generateStandaloneTourHtml() {
  const slidesJson = JSON.stringify(TOUR_SLIDES);
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>فيديو ودليل منصة Black Fighters الشامل ⚡</title>
<style>
  :root {
    --bg: #070a12;
    --card: #0d121f;
    --border: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #19f08c;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Tahoma, sans-serif;
    line-height: 1.6;
    padding: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  .player-box {
    width: 100%;
    max-width: 900px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  }
  .player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border);
  }
  .timeline-bar {
    display: flex;
    gap: 8px;
    padding: 16px 24px;
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .timeline-seg {
    flex: 1;
    min-width: 90px;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 999px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
  }
  .timeline-seg.active .fill {
    height: 100%;
    background: var(--accent);
    width: 100%;
    transition: width 0.1s linear;
  }
  .timeline-seg.done .fill {
    height: 100%;
    background: var(--accent);
    width: 100%;
  }
  .slide-stage {
    padding: 36px 32px;
    min-height: 380px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: radial-gradient(circle at top right, rgba(25,240,140,0.1), transparent 70%);
  }
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: bold;
    background: rgba(25,240,140,0.15);
    color: var(--accent);
    border: 1px solid rgba(25,240,140,0.3);
    margin-bottom: 12px;
  }
  h2 { font-size: 26px; font-weight: 900; margin-bottom: 8px; }
  p.sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; }
  ul.points { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
  ul.points li {
    padding: 10px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
  }
  .player-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(0,0,0,0.4);
    border-top: 1px solid var(--border);
  }
  .btn {
    cursor: pointer;
    padding: 10px 20px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: bold;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: 0.15s;
  }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-outline { background: rgba(255,255,255,0.05); color: var(--text); border: 1px solid var(--border); }
  .btn:hover { opacity: 0.9; transform: translateY(-1px); }
</style>
</head>
<body>
<div class="player-box">
  <div class="player-header">
    <div style="font-weight:900;font-size:16px">⚡ فيديو وجولة منصة Black Fighters</div>
    <div id="slide-counter" style="font-size:12px;color:var(--muted)">1 / 5</div>
  </div>
  <div class="timeline-bar" id="timeline-bar"></div>
  <div class="slide-stage" id="slide-stage">
    <div>
      <span class="badge" id="badge"></span>
      <h2 id="title"></h2>
      <p class="sub" id="subtitle"></p>
      <ul class="points" id="points"></ul>
    </div>
  </div>
  <div class="player-footer">
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" id="prev-btn" onclick="prevSlide()">السابق</button>
      <button class="btn btn-outline" id="play-btn" onclick="togglePlay()">إيقاف مؤقت ⏸️</button>
      <button class="btn btn-primary" id="next-btn" onclick="nextSlide()">التالي ◀</button>
    </div>
    <a href="https://blackfighters.site" target="_blank" class="btn btn-outline" style="text-decoration:none">فتح المنصة الآن 🚀</a>
  </div>
</div>
<script>
  const slides = ${slidesJson};
  let current = 0;
  let playing = true;
  let timer = null;

  function renderTimeline() {
    const bar = document.getElementById("timeline-bar");
    bar.innerHTML = "";
    slides.forEach((s, idx) => {
      const seg = document.createElement("div");
      seg.className = "timeline-seg " + (idx === current ? "active" : idx < current ? "done" : "");
      seg.onclick = () => goTo(idx);
      seg.innerHTML = '<div class="fill"></div>';
      bar.appendChild(seg);
    });
  }

  function renderSlide() {
    const s = slides[current];
    document.getElementById("badge").innerText = s.badge;
    document.getElementById("title").innerText = s.title;
    document.getElementById("subtitle").innerText = s.subtitle;
    document.getElementById("slide-counter").innerText = (current + 1) + " / " + slides.length;
    const pts = document.getElementById("points");
    pts.innerHTML = "";
    s.highlights.forEach(h => {
      const li = document.createElement("li");
      li.innerText = h;
      pts.appendChild(li);
    });
    renderTimeline();
  }

  function nextSlide() {
    current = (current + 1) % slides.length;
    renderSlide();
  }

  function prevSlide() {
    current = (current - 1 + slides.length) % slides.length;
    renderSlide();
  }

  function goTo(idx) {
    current = idx;
    renderSlide();
  }

  function togglePlay() {
    playing = !playing;
    document.getElementById("play-btn").innerText = playing ? "إيقاف مؤقت ⏸️" : "تشغيل ▶️";
    if (playing) startTimer();
    else clearInterval(timer);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (playing) nextSlide();
    }, 7000);
  }

  renderSlide();
  startTimer();
</script>
</body>
</html>`;
}

export default function PlatformVideoTour({ onClose, onTryUpload }) {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressSec, setProgressSec] = useState(0);
  const [viewMode, setViewMode] = useState("html"); // "html" | "video"

  const SLIDE_DURATION = 8; // seconds per slide
  const slide = TOUR_SLIDES[currentIdx];

  useEffect(() => {
    if (!isPlaying || viewMode !== "html") return undefined;
    const interval = setInterval(() => {
      setProgressSec((prev) => {
        if (prev >= SLIDE_DURATION - 0.2) {
          setCurrentIdx((c) => (c + 1) % TOUR_SLIDES.length);
          return 0;
        }
        return prev + 0.2;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, viewMode, currentIdx]);

  const goToSlide = (idx) => {
    setCurrentIdx(idx);
    setProgressSec(0);
  };

  const handleNext = () => {
    goToSlide((currentIdx + 1) % TOUR_SLIDES.length);
  };

  const handlePrev = () => {
    goToSlide((currentIdx - 1 + TOUR_SLIDES.length) % TOUR_SLIDES.length);
  };

  const handleDownloadStandaloneHtml = () => {
    const html = generateStandaloneTourHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "black-fighters-platform-tour.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success("تم تحميل فيديو ودليل المنصة كملف HTML مستقل يعمل بدون إنترنت! 📄⚡");
  };

  return (
    <div className="flex flex-col h-full bg-[#070a12] text-[#f5f7fa] select-none" dir="rtl">
      {/* Top Bar with Modes & Download */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-white/[0.08] bg-[#090c11]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("html")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              viewMode === "html"
                ? "bg-[#19f08c] text-[#03150c]"
                : "text-[#9aa4b2] hover:text-[#f5f7fa] bg-white/[0.04]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فيديو ودليل المنصة التفاعلي (HTML)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("video")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              viewMode === "video"
                ? "bg-[#19f08c] text-[#03150c]"
                : "text-[#9aa4b2] hover:text-[#f5f7fa] bg-white/[0.04]"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>الفيديو المصور (MP4)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownloadStandaloneHtml}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-bold text-[#f5f7fa] transition-colors cursor-pointer"
          title="تحميل هذا العرض التوضيحي كملف HTML مستقل لتشغيله في أي وقت"
        >
          <Download className="w-3.5 h-3.5 text-[#19f08c]" />
          <span className="hidden sm:inline">تحميل كملف HTML مستقل</span>
        </button>
      </div>

      {viewMode === "video" ? (
        <div className="relative bg-black aspect-video flex-1 flex items-center justify-center p-4">
          <video
            className="w-full h-full max-h-[500px] object-contain rounded-xl"
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster="/videos/black-fighters-poster.jpg"
          >
            <source src="/videos/black-fighters-intro.webm" type="video/webm" />
            <source src="/videos/black-fighters-intro.mp4" type="video/mp4" />
            متصفحك لا يدعم تشغيل الفيديو.
          </video>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between p-5 sm:p-7 overflow-y-auto">
          {/* Timeline Bar (like YouTube chapters / Instagram stories) */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {TOUR_SLIDES.map((s, idx) => {
              const isPast = idx < currentIdx;
              const isCurr = idx === currentIdx;
              const fillPct = isPast
                ? 100
                : isCurr
                  ? (progressSec / SLIDE_DURATION) * 100
                  : 0;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  className="group flex flex-col gap-1.5 text-right cursor-pointer"
                >
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#19f08c] transition-all duration-200"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold truncate transition-colors ${
                      isCurr ? "text-[#19f08c]" : "text-[#646e7d] group-hover:text-[#9aa4b2]"
                    }`}
                  >
                    0{idx + 1}. {s.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Slide Stage */}
          <div className="my-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span
                  className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border"
                  style={{
                    backgroundColor: `${slide.accent}15`,
                    color: slide.accent,
                    borderColor: `${slide.accent}40`,
                  }}
                >
                  {slide.badge}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">{slide.title}</h2>
                <p className="text-sm text-[#9aa4b2] mt-1 max-w-2xl leading-relaxed">
                  {slide.subtitle}
                </p>
              </div>

              {slide.ctaAction ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate(slide.ctaAction);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#19f08c] hover:bg-[#3bf59d] text-[#03150c] text-xs font-black transition-colors cursor-pointer shadow-lg whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{slide.ctaText}</span>
                </button>
              ) : null}
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {slide.highlights.map((item, hIdx) => (
                <div
                  key={hIdx}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 hover:bg-white/[0.04] transition-colors"
                >
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: slide.accent }}
                  />
                  <p className="text-xs sm:text-sm font-semibold text-[#f5f7fa] leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Player Controls */}
          <div className="pt-6 mt-6 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="w-9 h-9 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 text-white grid place-items-center transition-colors cursor-pointer"
                title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => goToSlide(0)}
                className="w-9 h-9 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 text-[#9aa4b2] hover:text-white grid place-items-center transition-colors cursor-pointer"
                title="إعادة التشغيل من البداية"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <span className="font-mono text-xs text-[#9aa4b2] tabular pr-2">
                الشريحة {currentIdx + 1} من {TOUR_SLIDES.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/10 text-xs font-bold text-[#f5f7fa] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#19f08c] hover:bg-[#3bf59d] text-[#03150c] text-xs font-black transition-colors cursor-pointer"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
