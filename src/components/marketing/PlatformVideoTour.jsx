import React, { useState, useEffect, useCallback } from "react";
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
  Volume2,
  VolumeX,
  Bot,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { playClick } from "@/lib/sounds";

export const TOUR_SLIDES = [
  {
    id: "overview",
    badge: "المشهد 1: مقدمة المنصة",
    title: "مرحباً بك في Black Fighters ⚡",
    subtitle: "المنظومة الأكاديمية الذكية الشاملة للطب وجميع الكليات — كل ما تحتاجه للنجاح والتفوق في مكان واحد",
    narration: "أهلاً بك في منصة بلاك فايترز الأكاديمية الشاملة. نوفر لك تفريغ المحاضرات الصوتية، التلخيص بنمط بوست مورتيم، بنك الكويزات التفاعلي، والتكرار المتباعد الذكي.",
    icon: Sparkles,
    color: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accent: "#19f08c",
    highlights: [
      "🎙️ تفريغ المحاضرات الصوتية بالحرف مع إرجاع المصطلحات الإنجليزية وعزل كلام الدكتور",
      "📄 تلخيص أكاديمي احترافي بنمط Post-Mortem مع جداول مقارنات ورسومات توضيحية SVG",
      "🖼️ استخراج ودمج صور وسلايدز الدكتور داخل التلخيص مع زرار إظهار وإخفاء الصور بضغطة زر",
      "🎯 بنك كويزات تفاعلي مربوط مباشرة ببوت التليجرام لإرسال الأسئلة كـ Polls للدفعة",
      "🧠 تثبيت الحفظ بخوارزمية التكرار المتباعد الذكية FSRS v4.5 واستوديو أدوات PDF",
    ],
    ctaText: "ابدأ جولتك الآن",
    ctaAction: null,
  },
  {
    id: "transcription",
    badge: "المشهد 2: التفريغ الصوتي",
    title: "تفريغ المحاضرات الصوتية الذكي 🎙️",
    subtitle: "سجل من المايك لايف داخل المحاضرة أو ارفع أي ريكورد (صوت أو فيديو حتى 200MB) ليتحول لنص فائق الدقة",
    narration: "ميزة التفريغ الصوتي تمكنك من تسجيل المحاضرة مباشرة من المايك أو رفع أي ملف صوت، ويقوم الذكاء الاصطناعي بتفريغ كلام الدكتور كلمة بكلمة وإرجاع المصطلحات الطبية بالإنجليزية.",
    icon: Headphones,
    color: "from-sky-500/20 via-blue-500/10 to-transparent",
    accent: "#38bdf8",
    highlights: [
      "🎙️ تسجيل مباشر من المايك بنقرة واحدة داخل المدرج، مع حفظ مستمر ومقاوم لانقطاع النت",
      "🇬🇧 استرجاع المصطلحات الطبية والعلمية المنطوقة بالإنجليزية تلقائياً مهما كانت لهجة الشرح",
      "💬 صندوق «قال الدكتور:» المميز بإطار منقّط لحفظ تنبيهات الدكتور وأسئلة الامتحان",
      "⚡ نفق سحابي آمن ومباشر يضمن ظهور التفريغ في ثوانٍ حتى لو كان المتصفح عليه موانع إعلانات",
      "📎 إمكانية إرفاق ملف PDF أو سلايدز الدكتور ليتم دمجها مع الشرح واستخراج صورها",
    ],
    ctaText: "جرب تفريغ المحاضرات الصوتية الآن",
    ctaAction: "/lectures",
  },
  {
    id: "ai_workflow",
    badge: "المشهد 3: خطوة بخطوة للـ AI",
    title: "المذاكرة بالـ AI ودمج ملف السلايدز 🤖📎",
    subtitle: "كيف تنسخ التفريغ الصوتي وترفعه مع سلايدز المحاضرة لأي ذكاء اصطناعي لصناعة أقوى مذكرة",
    narration: "الآن يمكنك بنقرة واحدة نسخ التفريغ مع برومبت المذاكرة المعد مسبقاً، وإرفاق ملف السلايدز في شات جي بي تي أو كلاود أو ديب سيك ليقوم بصناعة مذكرة بوست مورتيم متطابقة.",
    icon: Bot,
    color: "from-indigo-500/20 via-purple-500/10 to-transparent",
    accent: "#818cf8",
    highlights: [
      "📋 زر «نسخ التفريغ + برومبت الـ AI» ينسخ نص المحاضرة مدمجاً مع برومبت أكاديمي متخصص",
      "🚀 روابط تشغيل مباشرة تفتح ChatGPT و Claude و Gemini و DeepSeek بنقرة واحدة",
      "📎 ارفع ملف الـ PDF الخاص بسلايدز الدكتور في شات الـ AI ليقوم بدمج الصور مع كلام الشرح",
      "📄 ينتج الـ AI مذكرة شاملة بها كل كلمة قالها الدكتور مدموجة مع رسومات السلايدز",
      "✨ أو اختر «تحويل لمقرر داخل المنصة» لتوليد المذكرة والكويزات فوراً دون الحاجة لمواقع خارجية",
    ],
    ctaText: "فتح صفحة تفريغ المحاضرات",
    ctaAction: "/lectures",
  },
  {
    id: "summary_postmortem",
    badge: "المشهد 4: نمط Post-Mortem & الصور",
    title: "التلخيص الأكاديمي بنمط Post-Mortem 📄",
    subtitle: "نفس تنسيق مذكرات الدفعة المعتمد: تظليل أصفر، شرح عربي، كلام الدكتور، وزرار إظهار وإخفاء الصور",
    narration: "نمط بوست مورتيم يقدم لك تظليلاً أصفر على العناوين والمصطلحات، مع شرح عربي مفصل، ورسومات توضيحية، مع إمكانية إخفاء أو إظهار صور المحاضرة بضغطة زر.",
    icon: BookOpen,
    color: "from-amber-500/20 via-orange-500/10 to-transparent",
    accent: "#f59e0b",
    highlights: [
      "🟨 تظليل أصفر تلقائي على العناوين والجرعات والأرقام والمصطلحات في الجمل الإنجليزية",
      "⬛ شرح عربي تفصيلي في صندوق أنيق بحد أيمن عريض لتحقيق أقصى فهم واستيعاب",
      "🖼️ زرار التحكم في صور الملف: إظهار أو إخفاء صور الملف الأصلي في أي وقت حسب رغبتك",
      "📊 رسومات SVG تخطيطية لكل آلية وجداول مقارنات سوداء محددة لأسئلة ليلة الامتحان",
      "🖨️ تصدير بجميع الصيغ: مذكرة HTML تفاعلية، أو كتاب PDF (A4) للطباعة، أو عرض PowerPoint",
    ],
    ctaText: "ارفع ولخّص محاضرة الآن",
    ctaAction: "/create",
  },
  {
    id: "quiz_telegram",
    badge: "المشهد 5: الكويزات وتليجرام",
    title: "بنك الكويزات التفاعلي وبوت التليجرام 🎯✈️",
    subtitle: "امتحن على أي محاضرة فوراً، وشارك الكويزات مع زملائك على تليجرام كـ استطلاعات رأي تفاعلية (Polls)",
    narration: "اختبر فهمك بعد كل محاضرة من خلال بنك الكويزات الذكي، أو شارك الأسئلة مع زملائك في جروب الدفعة على تليجرام كاستطلاعات تفاعلية بضغطة زر.",
    icon: Brain,
    color: "from-violet-500/20 via-purple-500/10 to-transparent",
    accent: "#a855f7",
    highlights: [
      "🎯 توليد كويزات MCQ وحالات سريرية مخصصة من تفريغ المحاضرة أو ملخصها في ثوانٍ",
      "🚀 صفحة مستقلة لكل امتحان (/q/:id) برابط مباشر للمشاركة مع أصدقائك والدفعة",
      "✈️ إرسال الكويز بضغطة زر إلى بوت التليجرام لإنشاء استطلاعات تفاعلية (Polls)",
      "💡 تفسير فوري لكل إجابة صحيحة أو خاطئة مع توضيح التعليل الطبي والعلمي",
      "📊 بنك أسئلة تراكمي لأسئلة النظري والعملي لمراجعتها ليلة الامتحان مع تتبع درجاتك",
    ],
    ctaText: "ادخل بنك الكويزات",
    ctaAction: "/quizzes",
  },
  {
    id: "fsrs_mastery",
    badge: "المشهد 6: FSRS واستوديو الأدوات",
    title: "التكرار المتباعد FSRS v4.5 واستوديو الأدوات 🧠🛠️",
    subtitle: "نظام التثبيت الذكي يضمن تذكرك لكل معلومة حتى يوم الامتحان، بجانب حزمة متكاملة لأدوات الـ PDF",
    narration: "خوارزمية التكرار المتباعد الذكية إف إس آر إس تضمن تثبيت المعلومات في ذاكرتك طويلة المدى، بجانب استوديو متكامل لأدوات البي دي إف ومعمل العملي.",
    icon: Layers,
    color: "from-rose-500/20 via-pink-500/10 to-transparent",
    accent: "#f43f5e",
    highlights: [
      "🔄 خوارزمية FSRS v4.5 المتطورة لحساب الموعد المثالي لمراجعة وتسميع كل بطاقة استذكار",
      "🃏 بطاقات تسميع ذكية تُبنى تلقائياً من ملخصات ومحاضرات المستخدم مع تتبع مستويات الإتقان",
      "🛠️ استوديو أدوات PDF: دمج، تقسيم، ضغط، استخراج صور، وترقيم الملفات محلياً بدون إنترنت",
      "🔬 معمل العملي والصور لتحويل صور الأشعة والشرائح المجهرية إلى امتحانات عملي (OSCE)",
      "🏆 لوحة الشرف ونظام الإنجازات وXP لمتابعة التقدم والتنافس الأكاديمي مع زملائك",
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
    --sky: #38bdf8;
    --indigo: #818cf8;
    --amber: #f59e0b;
    --purple: #a855f7;
    --rose: #f43f5e;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", Tahoma, sans-serif;
    line-height: 1.6;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  .player-box {
    width: 100%;
    max-width: 960px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 25px 70px rgba(0,0,0,0.7);
  }
  .player-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border);
  }
  .timeline-bar {
    display: flex;
    gap: 8px;
    padding: 14px 24px;
    background: rgba(0,0,0,0.35);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
  }
  .timeline-seg {
    flex: 1;
    min-width: 80px;
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
    min-height: 420px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: radial-gradient(circle at top right, rgba(25,240,140,0.08), transparent 70%);
  }
  .badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    background: rgba(25,240,140,0.15);
    color: var(--accent);
    border: 1px solid rgba(25,240,140,0.3);
    margin-bottom: 12px;
  }
  h2 { font-size: 26px; font-weight: 900; margin-bottom: 8px; }
  p.sub { font-size: 14px; color: var(--muted); margin-bottom: 24px; }
  ul.points { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
  ul.points li {
    padding: 12px 16px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
  }
  .sim-box {
    margin-top: 20px;
    padding: 16px;
    border-radius: 16px;
    background: rgba(0,0,0,0.4);
    border: 1px dashed var(--border);
  }
  .player-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: rgba(0,0,0,0.45);
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
    gap: 12px;
  }
  .btn {
    cursor: pointer;
    padding: 10px 18px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 800;
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
    <div style="font-weight:900;font-size:16px;display:flex;align-items:center;gap:8px">
      <span>⚡ فيديو ودليل منصة Black Fighters الشامل</span>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-outline" style="padding:6px 12px;font-size:11px" onclick="toggleVoice()" id="voice-btn">🔊 الصوت: مفعل</button>
      <div id="slide-counter" style="font-size:12px;color:var(--muted)">1 / 6</div>
    </div>
  </div>
  <div class="timeline-bar" id="timeline-bar"></div>
  <div class="slide-stage" id="slide-stage">
    <div>
      <span class="badge" id="badge"></span>
      <h2 id="title"></h2>
      <p class="sub" id="subtitle"></p>
      <ul class="points" id="points"></ul>
    </div>
    <div class="sim-box" id="sim-box"></div>
  </div>
  <div class="player-footer">
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn btn-outline" onclick="prevSlide()">السابق</button>
      <button class="btn btn-outline" id="play-btn" onclick="togglePlay()">إيقاف مؤقت ⏸️</button>
      <button class="btn btn-primary" onclick="nextSlide()">التالي ◀</button>
    </div>
    <div style="display:flex;gap:8px">
      <a href="https://blackfighters.site" target="_blank" class="btn btn-outline" style="text-decoration:none">فتح الموقع 🚀</a>
    </div>
  </div>
</div>
<script>
  const slides = ${slidesJson};
  let current = 0;
  let playing = true;
  let voiceEnabled = true;
  let timer = null;

  function speakNarration(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ar";
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch(e){}
  }

  function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    document.getElementById("voice-btn").innerText = voiceEnabled ? "🔊 الصوت: مفعل" : "🔇 الصوت: معطل";
    if (!voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
    else if (voiceEnabled) speakNarration(slides[current].narration);
  }

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

    const sim = document.getElementById("sim-box");
    if (s.id === "ai_workflow") {
      sim.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">' +
        '<div><strong>خطوة عملية:</strong> انسخ التفريغ ببرومبت الـ AI والصقه في ChatGPT مع ملف السلايدز</div>' +
        '<a href="https://chatgpt.com" target="_blank" class="btn btn-outline" style="text-decoration:none;font-size:11px">فتح ChatGPT ↗</a>' +
      '</div>';
    } else if (s.id === "summary_postmortem") {
      sim.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div><strong>نمط Post-Mortem المعتمد:</strong> <span style="background:yellow;color:#000;padding:2px 6px;border-radius:4px;font-weight:bold">Yellow Title</span> مع شرح عربي مفصل</div>' +
        '<span class="badge" style="margin:0">زرار إظهار وإخفاء الصور 🖼️</span>' +
      '</div>';
    } else {
      sim.innerHTML = '<div style="font-size:12px;color:var(--muted)">⚡ Black Fighters — منصة الطلاب الأولى لجميع التخصصات والكليات</div>';
    }

    renderTimeline();
    speakNarration(s.narration);
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
    else {
      clearInterval(timer);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (playing) nextSlide();
    }, 8500);
  }

  renderSlide();
  startTimer();
</script>
</body>
</html>`;
}

export default function PlatformVideoTour({ onClose, onTryUpload, onSelectPlan }) {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progressSec, setProgressSec] = useState(0);
  const [viewMode, setViewMode] = useState("html"); // "html" | "video"
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [copiedDemo, setCopiedDemo] = useState(false);
  const [simQuizSelected, setSimQuizSelected] = useState(null);
  const [showDoctorFiguresInDemo, setShowDoctorFiguresInDemo] = useState(true);

  const SLIDE_DURATION = 8.5 / speedMultiplier;
  const slide = TOUR_SLIDES[currentIdx];

  // Speech narration helper
  const speakSlide = useCallback((text) => {
    if (!speechEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ar";
      u.rate = 1.05 * speedMultiplier;
      window.speechSynthesis.speak(u);
    } catch {}
  }, [speechEnabled, speedMultiplier]);

  // Autoplay ticker
  useEffect(() => {
    if (!isPlaying || viewMode !== "html") return undefined;
    const interval = setInterval(() => {
      setProgressSec((prev) => {
        if (prev >= SLIDE_DURATION - 0.2) {
          setCurrentIdx((c) => {
            const next = (c + 1) % TOUR_SLIDES.length;
            speakSlide(TOUR_SLIDES[next].narration);
            return next;
          });
          return 0;
        }
        return prev + 0.2;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, viewMode, SLIDE_DURATION, speakSlide]);

  const goToSlide = (idx) => {
    playClick();
    setCurrentIdx(idx);
    setProgressSec(0);
    speakSlide(TOUR_SLIDES[idx].narration);
  };

  const handleNext = () => {
    playClick();
    goToSlide((currentIdx + 1) % TOUR_SLIDES.length);
  };

  const handlePrev = () => {
    playClick();
    goToSlide((currentIdx - 1 + TOUR_SLIDES.length) % TOUR_SLIDES.length);
  };

  const toggleSpeech = () => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    if (!next && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      toast.info("تم تعطيل التعليق الصوتي");
    } else {
      toast.success("تم تفعيل التعليق الصوتي باللغة العربية 🔊");
      speakSlide(slide.narration);
    }
  };

  const handleDownloadStandaloneHtml = () => {
    const html = generateStandaloneTourHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "black-fighters-platform-video.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success("تم تنزيل فيديو ودليل المنصة التفاعلي كملف HTML مستقل يعمل بدون إنترنت! 📄⚡");
  };

  return (
    <div className="flex flex-col h-full bg-[#070a12] text-[#f5f7fa] select-none" dir="rtl">
      {/* Top Bar with Modes, Voice, & Download */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#090c11]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playClick();
              setViewMode("html");
            }}
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
            onClick={() => {
              playClick();
              setViewMode("video");
              if (window.speechSynthesis) window.speechSynthesis.cancel();
            }}
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSpeech}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              speechEnabled
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-white/15 bg-white/[0.04] text-[#9aa4b2] hover:text-white"
            }`}
            title="تشغيل أو كتم التعليق الصوتي باللغة العربية"
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{speechEnabled ? "التعليق الصوتي: يعمل" : "صوت"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadStandaloneHtml}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-bold text-[#f5f7fa] transition-colors cursor-pointer"
            title="تحميل هذا العرض التوضيحي كملف HTML مستقل لتشغيله في أي وقت أوفلاين"
          >
            <Download className="w-3.5 h-3.5 text-[#19f08c]" />
            <span className="hidden sm:inline">تحميل ملف HTML المستقل</span>
            <span className="sm:hidden">تحميل HTML</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Static Video */}
      {viewMode === "video" ? (
        <div className="relative bg-black aspect-video flex-1 min-h-[360px] flex items-center justify-center">
          <video
            className="w-full h-full object-contain"
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
        /* Mode 2: Interactive Cinematic HTML Video Showcase */
        <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          {/* Timeline Bar (6 Segments) */}
          <div className="mb-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#9aa4b2]">
              <span className="font-mono text-[11px] font-bold text-[#19f08c]">
                {slide.badge}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] tabular-nums">
                  {currentIdx + 1} / {TOUR_SLIDES.length}
                </span>
                <span className="text-[11px] text-[#646e7d]">
                  ({Math.round(((currentIdx + progressSec / SLIDE_DURATION) / TOUR_SLIDES.length) * 100)}%)
                </span>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2">
              {TOUR_SLIDES.map((s, idx) => {
                const isActive = idx === currentIdx;
                const isDone = idx < currentIdx;
                const pct = isActive ? (progressSec / SLIDE_DURATION) * 100 : isDone ? 100 : 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden cursor-pointer relative group"
                    title={s.title}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-[#19f08c] to-[#3bf59d] transition-all duration-150"
                      style={{ width: `${pct}%` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Scene Stage */}
          <div className="space-y-5">
            {/* Header + CTA */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span
                  className="inline-block px-3 py-1 rounded-full text-[11px] font-black border mb-2"
                  style={{
                    backgroundColor: `${slide.accent}15`,
                    color: slide.accent,
                    borderColor: `${slide.accent}40`,
                  }}
                >
                  {slide.badge}
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">{slide.title}</h2>
                <p className="text-xs sm:text-sm text-[#9aa4b2] mt-1 max-w-2xl leading-relaxed">
                  {slide.subtitle}
                </p>
              </div>

              {slide.ctaAction ? (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onClose?.();
                    if (slide.ctaAction === "/lectures" && onTryUpload) {
                      onTryUpload();
                    } else if (slide.ctaAction === "/pricing" && onSelectPlan) {
                      onSelectPlan();
                    } else if (slide.ctaAction) {
                      navigate(slide.ctaAction);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#19f08c] hover:bg-[#3bf59d] text-[#03150c] text-xs font-black transition-colors cursor-pointer shadow-lg whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{slide.ctaText}</span>
                </button>
              ) : null}
            </div>

            {/* Highlights Grid */}
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

            {/* Interactive Scene Live Simulator Box */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#9aa4b2] border-b border-white/[0.06] pb-2">
                <span className="font-bold flex items-center gap-1.5 text-white">
                  <Sparkles className="w-3.5 h-3.5 text-[#19f08c]" />
                  <span>محاكاة تفاعلية مباشرة لهذا المشهد:</span>
                </span>
                <span className="text-[11px] text-[#646e7d]">جرب الضغط والتفاعل بنفسك</span>
              </div>

              {/* Scene 1 Simulation: Dashboard & Fast Stats */}
              {slide.id === "overview" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                    <p className="text-[10px] text-[#9aa4b2]">رصيد النقاط</p>
                    <p className="text-base font-black text-[#19f08c]">1,000,000 XP</p>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                    <p className="text-[10px] text-[#9aa4b2]">المذكرات المنجزة</p>
                    <p className="text-base font-black text-sky-400">23 محاضرة</p>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                    <p className="text-[10px] text-[#9aa4b2]">نسبة الإتقان FSRS</p>
                    <p className="text-base font-black text-amber-400">33%</p>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                    <p className="text-[10px] text-[#9aa4b2]">استوديو الأدوات</p>
                    <p className="text-base font-black text-purple-400">متاح 24/7</p>
                  </div>
                </div>
              )}

              {/* Scene 2 Simulation: Audio Transcriber Live Waveform & Verbatim Sentence */}
              {slide.id === "transcription" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-sky-300">جاري تسجيل وتفريغ الشرح المباشر...</span>
                    </div>
                    <span className="font-mono text-xs text-sky-200">03:45 / 45:00</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5 text-xs">
                    <p className="text-[#f5f7fa]">
                      المريض بيشتكي من <b className="text-sky-300">Acute knee effusion</b> بعد الـ trauma.
                    </p>
                    <div className="p-2 rounded-lg border border-dashed border-amber-400/40 bg-amber-400/10 text-amber-200">
                      <b>💬 قال الدكتور:</b> السؤال ده بيجي في الامتحان النظري والشفوي كل سنة، ركزوا عليه!
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 3 Simulation: AI Workflow & Copy Prompt with PDF */}
              {slide.id === "ai_workflow" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-indigo-300">الخطوة 1: اضغط لنسخ برومبت المذاكرة مع التفريغ</p>
                      <p className="text-[11px] text-[#9aa4b2]">يجهز لك البرومبت الأكاديمي الشامل للصق في أي شات</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCopiedDemo(true);
                        toast.success("تم نسخ برومبت المذاكرة والتفريغ بنجاح! 📋");
                        setTimeout(() => setCopiedDemo(false), 2000);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copiedDemo ? "✅ تم النسخ!" : "📋 نسخ للـ AI"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <a href="https://chatgpt.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-emerald-500/50 text-white">
                      ChatGPT ↗
                    </a>
                    <a href="https://claude.ai" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-amber-500/50 text-white">
                      Claude ↗
                    </a>
                    <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-sky-500/50 text-white">
                      Gemini ↗
                    </a>
                    <a href="https://chat.deepseek.com" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/[0.03] border border-white/10 hover:border-indigo-500/50 text-white">
                      DeepSeek ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Scene 4 Simulation: Post-Mortem Card & Doctor Figures Toggle */}
              {slide.id === "summary_postmortem" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">نموذج بطاقة Post-Mortem للمذاكرة:</span>
                    <button
                      type="button"
                      onClick={() => setShowDoctorFiguresInDemo((v) => !v)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border border-white/15 bg-white/[0.05] text-[#f5f7fa] cursor-pointer hover:bg-white/10"
                    >
                      {showDoctorFiguresInDemo ? "🖼️ إخفاء صور الملف" : "🖼️ إظهار صور الملف"}
                    </button>
                  </div>
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-[#070a12] space-y-2 text-xs">
                    <p className="font-bold text-[#f5f7fa]">
                      <mark className="bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">Lachman Test</mark> is the most sensitive test for ACL tear.
                    </p>
                    <div className="p-2.5 rounded-lg border-r-4 border-amber-500 bg-white/[0.03] text-[#9aa4b2] leading-relaxed">
                      <b>الشرح بالعربي:</b> فحص لاخمان هو الفحص الأدق بنسبة 95% لتشخيص قطع الرباط الصليبي الأمامي.
                    </div>
                    {showDoctorFiguresInDemo ? (
                      <div className="p-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-300 flex items-center justify-between">
                        <span>🖼️ صورة من سلايدز الدكتور رقم 14 تم دمجها تلقائياً مع الشرح</span>
                        <span className="font-mono text-[10px]">Figure 14</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Scene 5 Simulation: Interactive Quiz Question */}
              {slide.id === "quiz_telegram" && (
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-white">
                    سؤال تجريبي: What is the single most sensitive physical examination test for an acute ACL tear?
                  </p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {[
                      { id: "A", text: "Anterior Drawer test", correct: false },
                      { id: "B", text: "Lachman test (95% sensitivity)", correct: true },
                      { id: "C", text: "McMurray test", correct: false },
                      { id: "D", text: "Pivot shift test", correct: false },
                    ].map((opt) => {
                      const isSel = simQuizSelected === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSimQuizSelected(opt.id);
                            if (opt.correct) {
                              toast.success("إجابة صحيحة! +25 XP 🎯");
                            } else {
                              toast.error("إجابة خاطئة — فحص Lachman هو الأكثر دقة");
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer font-medium ${
                            isSel
                              ? opt.correct
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold"
                                : "bg-rose-500/20 border-rose-500 text-rose-300"
                              : "bg-white/[0.03] border-white/10 hover:border-white/25 text-[#f5f7fa]"
                          }`}
                        >
                          <span className="font-mono font-bold mr-1">{opt.id})</span> {opt.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scene 6 Simulation: FSRS Retention Schedule */}
              {slide.id === "fsrs_mastery" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                    <p className="text-[10px] text-rose-300">مراجعة اليوم</p>
                    <p className="font-black text-white mt-1">12 بطاقة مستحقة</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-[10px] text-amber-300">تكرار بعد 3 أيام</p>
                    <p className="font-black text-white mt-1">28 بطاقة</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-emerald-300">تثبيت طويل المدى (FSRS)</p>
                    <p className="font-black text-white mt-1">94% Retention</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Video Player Navigation & Speed Controls */}
          <div className="pt-5 mt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setIsPlaying((p) => !p);
                }}
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

              {/* Speed Multiplier Pill */}
              <div className="flex items-center gap-1 border border-white/10 rounded-xl p-0.5 bg-white/[0.02]">
                {[1, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeedMultiplier(spd)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                      speedMultiplier === spd
                        ? "bg-[#19f08c] text-[#03150c]"
                        : "text-[#9aa4b2] hover:text-white"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
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
