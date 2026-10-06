import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { SUMMARY_TEMPLATES, SUBJECT_TYPES, COLOR_LEVELS } from "@/lib/summaryTemplates";
import { useLocale } from "@/lib/LocaleContext";

// صور توضيحية للقوالب (SVG مدمج)
const TEMPLATE_PREVIEWS = {
  lecture: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="10" width="100" height="6" rx="3" fill="#00e5ff" opacity="0.9"/>
      <rect x="10" y="22" width="80" height="4" rx="2" fill="#00e5ff" opacity="0.6"/>
      <rect x="10" y="34" width="200" height="3" rx="1" fill="#334155" opacity="0.5"/>
      <rect x="16" y="42" width="170" height="2.5" rx="1" fill="#475569" opacity="0.6"/>
      <rect x="16" y="49" width="150" height="2.5" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="10" y="58" width="90" height="5" rx="2" fill="#a855f7" opacity="0.8"/>
      <rect x="16" y="68" width="180" height="2.5" rx="1" fill="#475569" opacity="0.6"/>
      <rect x="16" y="75" width="160" height="2.5" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="16" y="82" width="190" height="2.5" rx="1" fill="#a855f7" opacity="0.3"/>
      <rect x="10" y="92" width="70" height="5" rx="2" fill="#00e5ff" opacity="0.7"/>
      <rect x="16" y="102" width="140" height="2.5" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="16" y="109" width="160" height="2.5" rx="1" fill="#475569" opacity="0.4"/>
      <rect x="10" y="120" width="180" height="2" rx="1" fill="#1e293b"/>
    </svg>
  ),
  guide: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="8" width="130" height="7" rx="3" fill="#00e5ff" opacity="0.9"/>
      <rect x="10" y="22" width="200" height="2.5" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="10" y="29" width="190" height="2.5" rx="1" fill="#475569" opacity="0.45"/>
      <rect x="10" y="36" width="180" height="2.5" rx="1" fill="#475569" opacity="0.4"/>
      <rect x="10" y="46" width="85" height="5" rx="2" fill="#a855f7" opacity="0.8"/>
      <rect x="16" y="56" width="175" height="2" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="16" y="62" width="160" height="2" rx="1" fill="#475569" opacity="0.45"/>
      <rect x="16" y="68" width="175" height="2" rx="1" fill="#475569" opacity="0.4"/>
      <rect x="16" y="74" width="155" height="2" rx="1" fill="#475569" opacity="0.35"/>
      <rect x="10" y="84" width="95" height="5" rx="2" fill="#a855f7" opacity="0.7"/>
      <rect x="16" y="94" width="165" height="2" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="16" y="100" width="145" height="2" rx="1" fill="#475569" opacity="0.45"/>
      <rect x="16" y="106" width="170" height="2" rx="1" fill="#475569" opacity="0.4"/>
      <rect x="16" y="112" width="150" height="2" rx="1" fill="#475569" opacity="0.35"/>
      <rect x="16" y="118" width="130" height="2" rx="1" fill="#475569" opacity="0.3"/>
    </svg>
  ),
  revision: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="8" width="110" height="7" rx="3" fill="#f59e0b" opacity="0.9"/>
      <rect x="6" y="22" width="208" height="32" rx="5" fill="#1e293b" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.4"/>
      <rect x="12" y="28" width="60" height="3.5" rx="1" fill="#f59e0b" opacity="0.7"/>
      <rect x="12" y="36" width="185" height="2" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="12" y="42" width="170" height="2" rx="1" fill="#475569" opacity="0.4"/>
      <rect x="6" y="60" width="208" height="32" rx="5" fill="#1e293b" stroke="#a855f7" strokeWidth="0.7" strokeOpacity="0.4"/>
      <rect x="12" y="66" width="55" height="3.5" rx="1" fill="#a855f7" opacity="0.7"/>
      <rect x="12" y="74" width="185" height="2" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="12" y="80" width="160" height="2" rx="1" fill="#475569" opacity="0.4"/>
      <rect x="6" y="98" width="208" height="32" rx="5" fill="#1e293b" stroke="#00e5ff" strokeWidth="0.7" strokeOpacity="0.4"/>
      <rect x="12" y="104" width="70" height="3.5" rx="1" fill="#00e5ff" opacity="0.7"/>
      <rect x="12" y="112" width="185" height="2" rx="1" fill="#475569" opacity="0.5"/>
      <rect x="12" y="118" width="150" height="2" rx="1" fill="#475569" opacity="0.4"/>
    </svg>
  ),
  bullets: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="8" width="80" height="6" rx="3" fill="#00e5ff" opacity="0.9"/>
      {[20, 32, 44, 56, 68, 80, 92, 104, 116, 128].map((y, i) => (
        <g key={y}>
          <circle cx="18" cy={y + 3} r="3" fill={i % 3 === 0 ? "#00e5ff" : i % 3 === 1 ? "#a855f7" : "#f59e0b"} opacity="0.8"/>
          <rect x="26" y={y} width={140 + (i % 4) * 15} height="2.5" rx="1" fill="#475569" opacity="0.55"/>
        </g>
      ))}
    </svg>
  ),
  qa: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      {[
        { y: 10, label: "س:", color: "#00e5ff" },
        { y: 38, label: "ج:", color: "#4ade80" },
        { y: 70, label: "س:", color: "#00e5ff" },
        { y: 98, label: "ج:", color: "#4ade80" },
      ].map(({ y, label, color }) => (
        <g key={y}>
          <rect x="8" y={y} width="14" height="6" rx="2" fill={color} opacity="0.85"/>
          <rect x="26" y={y + 1} width="150" height="4" rx="1.5" fill="#334155" opacity="0.8"/>
          <rect x="26" y={y + 9} width="130" height="3" rx="1" fill="#1e293b" opacity="0.5"/>
          <rect x="26" y={y + 16} width="145" height="3" rx="1" fill="#1e293b" opacity="0.4"/>
          <rect x="10" y={y + 24} width="200" height="0.5" fill="#1e293b"/>
        </g>
      ))}
    </svg>
  ),
  table: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="8" width="100" height="6" rx="3" fill="#a855f7" opacity="0.9"/>
      <rect x="8" y="20" width="204" height="8" rx="2" fill="#1e3a5f" opacity="0.8"/>
      {[28, 40, 52, 64, 76, 88, 100, 112, 124].map((y, i) => (
        <rect key={y} x="8" y={y} width="204" height="8" rx="2" fill={i % 2 === 0 ? "#0f172a" : "#1e293b"} opacity="0.6"/>
      ))}
      {[8, 75, 142, 212].map(x => (
        <line key={x} x1={x} y1="20" x2={x} y2="132" stroke="#334155" strokeWidth="0.5" opacity="0.7"/>
      ))}
      {[20, 28, 40, 52, 64, 76, 88, 100, 112, 124, 132].map(y => (
        <line key={y} x1="8" y1={y} x2="212" y2={y} stroke="#334155" strokeWidth="0.5" opacity="0.5"/>
      ))}
      <rect x="10" y="22" width="60" height="4" rx="1" fill="#a855f7" opacity="0.7"/>
      <rect x="78" y="22" width="60" height="4" rx="1" fill="#a855f7" opacity="0.7"/>
      <rect x="145" y="22" width="60" height="4" rx="1" fill="#a855f7" opacity="0.7"/>
    </svg>
  ),
  map: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="75" y="10" width="70" height="16" rx="8" fill="#00e5ff" opacity="0.3" stroke="#00e5ff" strokeWidth="1"/>
      <rect x="82" y="14" width="56" height="8" rx="3" fill="#00e5ff" opacity="0.7"/>
      <line x1="110" y1="26" x2="60" y2="50" stroke="#475569" strokeWidth="0.8"/>
      <line x1="110" y1="26" x2="110" y2="50" stroke="#475569" strokeWidth="0.8"/>
      <line x1="110" y1="26" x2="160" y2="50" stroke="#475569" strokeWidth="0.8"/>
      {[30, 85, 140].map((x) => (
        <g key={x}>
          <rect x={x} y="50" width="60" height="14" rx="7" fill="#a855f7" opacity="0.25" stroke="#a855f7" strokeWidth="0.7"/>
          <rect x={x + 5} y="54" width="50" height="6" rx="2" fill="#a855f7" opacity="0.6"/>
        </g>
      ))}
      <line x1="60" y1="64" x2="40" y2="85" stroke="#475569" strokeWidth="0.6"/>
      <line x1="60" y1="64" x2="80" y2="85" stroke="#475569" strokeWidth="0.6"/>
      <line x1="110" y1="64" x2="100" y2="85" stroke="#475569" strokeWidth="0.6"/>
      <line x1="110" y1="64" x2="120" y2="85" stroke="#475569" strokeWidth="0.6"/>
      {[18, 58, 88, 108, 130, 160].map((x) => (
        <rect key={x} x={x} y="85" width="42" height="10" rx="5" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" strokeWidth="0.5"/>
      ))}
    </svg>
  ),
  formula: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="8" width="110" height="6" rx="3" fill="#4ade80" opacity="0.9"/>
      {[20, 50, 80, 110].map((y) => (
        <g key={y}>
          <rect x="8" y={y} width="204" height="24" rx="5" fill="#0f2a1a" stroke="#4ade80" strokeWidth="0.5" strokeOpacity="0.4"/>
          <rect x="14" y={y + 4} width="80" height="5" rx="2" fill="#4ade80" opacity="0.6"/>
          <rect x="14" y={y + 13} width="140" height="3" rx="1" fill="#475569" opacity="0.4"/>
        </g>
      ))}
    </svg>
  ),
  timeline: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <line x1="30" y1="15" x2="30" y2="130" stroke="#00e5ff" strokeWidth="1.5" opacity="0.4"/>
      {[20, 45, 70, 95, 118].map((y, i) => (
        <g key={y}>
          <circle cx="30" cy={y + 4} r="5" fill="#00e5ff" opacity={0.9 - i * 0.1}/>
          <rect x="42" y={y} width="50" height="4" rx="2" fill="#f59e0b" opacity="0.7"/>
          <rect x="42" y={y + 7} width="150" height="2.5" rx="1" fill="#475569" opacity="0.5"/>
          <rect x="42" y={y + 13} width="130" height="2.5" rx="1" fill="#475569" opacity="0.4"/>
        </g>
      ))}
    </svg>
  ),
  original: (
    <svg viewBox="0 0 220 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="220" height="140" rx="8" fill="#0d1117"/>
      <rect x="10" y="8" width="90" height="6" rx="3" fill="#00e5ff" opacity="0.8"/>
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x="10" y={20 + i * 10} width={180 - (i % 3) * 20} height="3" rx="1" fill="#475569" opacity={0.4 + (i % 2) * 0.1}/>
      ))}
    </svg>
  ),
};

export default function SummaryTemplateSelector({ template, setTemplate, subject, setSubject, colorLevel, setColorLevel }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [showPreviews, setShowPreviews] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const SUBJECT_LABELS = {
    auto: { ar: "اختيار ذكي تلقائي", en: "Smart Auto Detect", descAr: "تحديد نوع المادة من المحتوى", descEn: "AI automatically identifies subject" },
    medical: { ar: "طب وعلوم صحية", en: "Medical & Health", descAr: "تعريفات، أعراض، تشخيص وعلاج", descEn: "Symptoms, mechanisms, diagnosis & Rx" },
    engineering: { ar: "هندسة وعلوم", en: "Engineering & Sciences", descAr: "قوانين، وحدات، اشتقاقات وأمثلة", descEn: "Formulas, units, proofs & examples" },
    law: { ar: "قانون وتشريعات", en: "Law & Legislation", descAr: "مواد، شروط، استثناءات وأحكام", descEn: "Articles, clauses, conditions & precedents" },
    humanities: { ar: "تاريخ وأدب", en: "Humanities & Arts", descAr: "تسلسل زمني، شخصيات وأفكار", descEn: "Timeline, figures, causes & impact" },
    business: { ar: "إدارة وأعمال", en: "Business & Management", descAr: "نماذج، قرارات ومؤشرات", descEn: "KPIs, models, decisions & case studies" },
    languages: { ar: "لغات", en: "Languages", descAr: "قواعد، مفردات وأمثلة", descEn: "Grammar, vocabulary & syntax" },
  };

  const COLOR_LABELS = {
    none: { ar: "بدون تلوين", en: "No Colors", descAr: "عناوين وBold فقط", descEn: "Headings and bold only" },
    medium: { ar: "تلوين متوسط", en: "Balanced Colors", descAr: "1-4 Highlights قصيرة لكل قسم", descEn: "1-4 targeted highlights per section" },
    rich: { ar: "تلوين مكثف", en: "Rich Colors", descAr: "ألوان أكثر للتعريفات والأمثلة", descEn: "Vibrant visual memory triggers" },
  };

  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-border/40">
      {/* نوع المادة */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-2 block">
          {isEn ? "📚 Subject Domain" : "📚 نوع المادة"}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECT_TYPES.map((item) => {
            const loc = SUBJECT_LABELS[item.value];
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setSubject(item.value)}
                className={`rounded-xl border p-2.5 text-start transition-colors ${
                  subject === item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <p className="text-xs font-black truncate">{isEn && loc ? loc.en : item.label}</p>
                <p className="text-[10px] opacity-70 truncate">{isEn && loc ? loc.descEn : item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* قالب التلخيص */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-muted-foreground">
            {isEn ? "🎨 Summary Architecture" : "🎨 قالب التلخيص"}
          </label>
          <button
            type="button"
            onClick={() => setShowPreviews(!showPreviews)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline font-bold"
          >
            <Eye className="w-3 h-3" />
            {showPreviews ? (isEn ? "Hide Preview" : "إخفاء المعاينة") : (isEn ? "Show Preview" : "اعرض المعاينة")}
            {showPreviews ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <AnimatePresence>
          {showPreviews && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="grid grid-cols-2 gap-2 pb-1">
                {SUMMARY_TEMPLATES.map((t) => (
                  <motion.button
                    key={t.value}
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setTemplate(t.value); setPreviewTemplate(t.value); }}
                    className={`relative rounded-xl border overflow-hidden transition-colors ${
                      template === t.value
                        ? "border-primary ring-1 ring-primary/40"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <div className="w-full h-24 bg-background/80">
                      {TEMPLATE_PREVIEWS[t.preview] || TEMPLATE_PREVIEWS.original}
                    </div>
                    <div className={`px-2 py-1.5 text-center ${template === t.value ? "bg-primary/10" : "bg-secondary/30"}`}>
                      <p className="text-[10px] font-black leading-tight">{t.label}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight truncate">{isEn && t.descEn ? t.descEn : t.desc}</p>
                    </div>
                    {template === t.value && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* اختيار القالب بدون معاينة */}
        {!showPreviews && (
          <div className="grid grid-cols-2 gap-2">
            {SUMMARY_TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`rounded-xl border p-2.5 text-start transition-colors ${
                  template === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <p className="text-xs font-black truncate">{t.label}</p>
                <p className="text-[10px] opacity-70 truncate">{isEn && t.descEn ? t.descEn : t.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* مستوى التلوين */}
      <div>
        <label className="text-xs font-bold text-muted-foreground mb-2 block">
          {isEn ? "🎨 Highlights & Colorization" : "🎨 مستوى التلوين"}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_LEVELS.map((item) => {
            const loc = COLOR_LABELS[item.value];
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setColorLevel(item.value)}
                className={`rounded-xl border p-2.5 text-center transition-colors ${
                  colorLevel === item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground hover:border-border/80"
                }`}
              >
                <p className="text-xs font-black">{isEn && loc ? loc.en : item.label}</p>
                <p className="text-[10px] opacity-70 leading-tight mt-0.5">{isEn && loc ? loc.descEn : item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
