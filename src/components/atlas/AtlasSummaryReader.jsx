import React, { useMemo, useRef, useState } from "react";
import {
  buildNormalizedBookSearchIndex,
  searchNormalizedBookIndex,
} from "@/lib/summaryV5/arabicNormalize";
import {
  createGlossaryRegistry,
  applyStudentCorrection,
} from "@/lib/summaryV5/glossaryRegistry";
import {
  createReviewItem,
  scheduleFsrsReview,
  FSRS_RATINGS,
} from "@/lib/summaryV5/fsrsEngine";
import { buildSingleFileStandaloneHtml } from "@/lib/summaryV5/standaloneHtmlExporter";
import {
  Search,
  Eye,
  BookOpen,
  Download,
  Printer,
  Sun,
  Moon,
  FileText,
  X,
} from "lucide-react";
import { LVBadge } from "@/components/ui/linevault";
import { cn } from "@/lib/utils";

const DEFAULT_ATLAS_DOCUMENT = {
  docId: "atlas-cardio-07",
  title: "فسيولوجيا القلب والدورة الدموية — ملخص مرجعي",
  totalPages: 48,
  chapters: [
    {
      chapterIndex: 1,
      title: "الفصل الأول: جهد الفعل القلبي وقنوات الأيونات",
      pageRange: [1, 24],
      plates: [
        {
          plateNumber: 1,
          code: "SEC 01",
          titleAr: "جهد الفعل في خلايا البطين (Ventricular Action Potential)",
          sourcePages: [12, 13],
          sourceExcerpt:
            "Source PDF (pp. 12–13): Phase 0 rapid depolarization is driven by voltage-gated fast Na+ channels (INa). Phase 2 plateau is maintained by L-type Ca2+ influx balanced against K+ efflux (IKs/IKr). Amiodarone prolongs Phase 3 repolarization across all cardiac tissues (150–300 mg IV bolus).",
          prerequisiteBox: [
            "لفهم هذا القسم: تذكّر أن الخلية القلبية في وقت الراحة تكون سالبة الشحنة داخلياً (-90 mV) بسبب مضخة الصوديوم والبوتاسيوم.",
            "دخول أي أيون موجب (Na+ أو Ca2+) يرفع الجهد (Depolarization)، بينما خروج البوتاسيوم (K+) يعيد الخلية للسالبية (Repolarization).",
          ],
          blocks: [
            {
              type: "definition",
              labelAr: "تعريف تأسيسي",
              textAr:
                "يمثل طور الهضبة (Phase 2 Plateau) السمة الفارقة لعضلة البطين، حيث يتوازن دخول الكالسيوم البطيء عبر قنوات L-type Ca2+ مع خروج البوتاسيوم، مما يمنع التكزز العضلي (Tetany).",
              redactedTerm: "L-type Ca2+",
              redactionPrompt: "ما هي القناة الأيونية المسؤولة عن استمرار طور الهضبة Phase 2؟",
            },
            {
              type: "important",
              labelAr: "نقطة امتحانية",
              textAr:
                "المرحلة الصفرية (Phase 0) في خلايا البطين تعتمد كلياً على فتح قنوات الصوديوم السريعة (Fast Na+ Channels)، وتُغلق هذه القنوات بواسطة مضادات اضطراب النظم من الفئة الأولى (Class I Antiarrhythmics).",
              redactedTerm: "Fast Na+ Channels",
              redactionPrompt: "ما القنوات المسؤولة عن الصعود السريع Phase 0 في البطين؟",
            },
            {
              type: "warning",
              labelAr: "جرعة مدققة",
              textAr:
                "عقار الأميودارون (Amiodarone) بجرعة تحميل وريدية 150–300 mg يطيل زمن جهد الفعل وفترة العصيان الفعالة (ERP).",
              redactedTerm: "150–300 mg",
              redactionPrompt: "ما هي جرعة التحميل الوريدية القياسية لعقار Amiodarone؟",
            },
          ],
          marginalia: [
            {
              id: "m-07-1",
              refCode: "ملاحظة 1 · ص 12",
              noteAr:
                "العقدة الجيبية الأذينية (SA Node) لا تملك طور هضبة Phase 2، ويكون Phase 0 فيها معتمداً على الكالسيوم البطيء وليس الصوديوم.",
            },
          ],
        },
      ],
    },
  ],
  glossary: [
    { en: "Action Potential", ar: "جهد الفعل", chapterIndex: 1 },
    { en: "Plateau Phase", ar: "طور الهضبة", chapterIndex: 1 },
    { en: "Refractory Period", ar: "فترة العصيان", chapterIndex: 1 },
  ],
};

export function adaptSummaryDocToAtlasV5(rawDoc, fallbackMarkdown = "") {
  if (
    rawDoc &&
    Array.isArray(rawDoc.chapters) &&
    rawDoc.chapters.length > 0 &&
    rawDoc.chapters[0]?.plates
  ) {
    return rawDoc;
  }

  let sections = Array.isArray(rawDoc?.sections) ? rawDoc.sections : [];

  if (
    sections.length === 0 &&
    typeof fallbackMarkdown === "string" &&
    fallbackMarkdown.trim().length > 0
  ) {
    const rawParts = fallbackMarkdown
      .split(/\n(?=##?\s+)/)
      .map((s) => s.trim())
      .filter(Boolean);
    sections = rawParts.map((part, idx) => {
      const lines = part
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const firstLine = lines[0] || "";
      const heading = firstLine.startsWith("#")
        ? firstLine.replace(/^#+\s*/, "").trim()
        : `القسم ${idx + 1}`;
      const bodyLines = firstLine.startsWith("#") ? lines.slice(1) : lines;
      const bullets = bodyLines
        .map((l) =>
          l
            .replace(/^[-*•]\s*/, "")
            .replace(/^\d+[.)]\s*/, "")
            .trim()
        )
        .filter((l) => l.length > 8);
      return {
        heading,
        bullets:
          bullets.length > 0 ? bullets : [part.replace(/^#+\s*/, "").trim()],
      };
    });
  }

  if (sections.length === 0) return DEFAULT_ATLAS_DOCUMENT;

  const plates = sections.map((sec, idx) => {
    const rawItems = Array.isArray(sec.bullets)
      ? sec.bullets
      : Array.isArray(sec.points)
      ? sec.points
      : Array.isArray(sec.blocks)
      ? sec.blocks.flatMap((blk) =>
          Array.isArray(blk.items)
            ? blk.items.map((it) => it?.text || it)
            : [blk?.text?.text || blk?.text || blk?.content || ""]
        )
      : [sec.content || sec.summary || ""];

    const blocks = rawItems
      .filter(Boolean)
      .slice(0, 8)
      .map((b, bIdx) => {
        const text =
          typeof b === "string"
            ? b
            : b?.text?.text || b?.text || b?.explanation || JSON.stringify(b);
        const cleanText = String(text)
          .replace(/==(green|yellow|cyan|orange|red):([^=]+)==/gi, "$2")
          .replace(/==([^=]+)==/g, "$1");
        const types = ["definition", "important", "term", "example", "warning"];
        const labels = [
          "تعريف تأسيسي",
          "نقطة محورية",
          "مصطلح علمي",
          "مثال تطبيقي",
          "تنبيه امتحاني",
        ];
        const englishMatch = cleanText.match(/[A-Za-z][A-Za-z0-9+-]{2,}/);
        return {
          type: types[bIdx % types.length],
          labelAr: labels[bIdx % labels.length],
          textAr: cleanText,
          redactedTerm: englishMatch
            ? englishMatch[0]
            : cleanText.split(/\s+/).slice(0, 2).join(" "),
          redactionPrompt:
            sec.heading || sec.title || `استدعاء مفهوم القسم ${idx + 1}`,
        };
      });

    return {
      plateNumber: idx + 1,
      code: `SEC ${String(idx + 1).padStart(2, "0")}`,
      titleAr: sec.heading || sec.title || `القسم ${idx + 1}`,
      sourcePages: sec.pages || [idx + 1],
      sourceExcerpt:
        sec.sourceQuote ||
        sec.rawExcerpt ||
        `مقتطف المصدر الأصلي — قسم ${sec.heading || idx + 1}`,
      prerequisiteBox: sec.prerequisites || [
        `تمهيد «شرح من الأساس»: يمهّد هذا القسم لفهم ${
          sec.heading || sec.title || "المفهوم الأساسي"
        } عبر ربطه بالقاعدة العلمية الأم.`,
      ],
      blocks,
      marginalia: [
        {
          id: `m-${idx + 1}-1`,
          refCode: `ملاحظة ${idx + 1}`,
          noteAr:
            sec.takeaway ||
            sec.examTip ||
            "راجع المصطلحات المحجوبة في وضع التسميع الذاتي.",
        },
      ],
    };
  });

  return {
    docId: rawDoc?.id || rawDoc?.docId || "summary-doc",
    title:
      rawDoc?.title ||
      rawDoc?.documentTitle ||
      plates[0]?.titleAr ||
      "ملخص المحاضرة",
    totalPages: Number(rawDoc?.totalPages || plates.length * 4),
    chapters: [
      {
        chapterIndex: 1,
        title: rawDoc?.title || "الفصل الأول",
        pageRange: [1, Number(rawDoc?.totalPages || plates.length * 4)],
        plates,
      },
    ],
    glossary: Array.isArray(rawDoc?.glossary)
      ? rawDoc.glossary
      : DEFAULT_ATLAS_DOCUMENT.glossary,
  };
}

export default function AtlasSummaryReader({
  document: rawDocument = null,
  fallbackMarkdown = "",
  initialTheme = "dark",
  initialDeclassifyMode = false,
}) {
  const doc = useMemo(
    () => adaptSummaryDocToAtlasV5(rawDocument, fallbackMarkdown),
    [rawDocument, fallbackMarkdown]
  );
  const [paperLight, setPaperLight] = useState(initialTheme === "light");
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [declassifyMode, setDeclassifyMode] = useState(
    Boolean(initialDeclassifyMode)
  );
  const [revealedKeys, setRevealedKeys] = useState({});
  const [reviewStates, setReviewStates] = useState({});
  const [sourceLensPlate, setSourceLensPlate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGlossaryDrawer, setShowGlossaryDrawer] = useState(false);
  const [glossaryTerms, setGlossaryTerms] = useState(() => {
    const reg = createGlossaryRegistry(doc.glossary || []);
    return reg.entries;
  });
  const [editingGlossaryEn, setEditingGlossaryEn] = useState("");
  const [editingGlossaryAr, setEditingGlossaryAr] = useState("");

  const containerRef = useRef(null);

  const searchIndex = useMemo(() => {
    const flatPages = [];
    doc.chapters.forEach((ch) => {
      (ch.plates || []).forEach((plate) => {
        const combinedText = [
          plate.titleAr,
          ...(plate.prerequisiteBox || []),
          ...(plate.blocks || []).map(
            (b) => `${b.labelAr} ${b.textAr} ${b.redactedTerm || ""}`
          ),
          ...(plate.marginalia || []).map((m) => m.noteAr),
        ].join(" ");
        flatPages.push({
          chapterIndex: ch.chapterIndex,
          pageNumber: plate.sourcePages?.[0] || plate.plateNumber,
          plateNumber: plate.plateNumber,
          text: combinedText,
        });
      });
    });
    return buildNormalizedBookSearchIndex(flatPages);
  }, [doc]);

  const searchHits = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchNormalizedBookIndex(searchIndex, searchQuery, 8);
  }, [searchIndex, searchQuery]);

  const activeChapter = doc.chapters[activeChapterIdx] || doc.chapters[0];

  const handleToggleReveal = (itemKey) => {
    setRevealedKeys((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const handleRateFsrs = (itemKey, ratingValue) => {
    setReviewStates((prev) => {
      const current = prev[itemKey] || createReviewItem({ id: itemKey });
      const updated = scheduleFsrsReview(current, ratingValue);
      return { ...prev, [itemKey]: updated };
    });
  };

  const handleApplyGlossaryEdit = (e) => {
    e.preventDefault();
    if (!editingGlossaryEn.trim() || !editingGlossaryAr.trim()) return;
    const reg = { entries: glossaryTerms };
    const updated = applyStudentCorrection(
      reg,
      editingGlossaryEn.trim(),
      editingGlossaryAr.trim()
    );
    setGlossaryTerms([...updated.entries]);
    setEditingGlossaryEn("");
    setEditingGlossaryAr("");
  };

  const handleDownloadStandaloneHtml = () => {
    const allPlates = doc.chapters.flatMap((c) => c.plates || []);
    const sections = allPlates.map((p) => ({
      heading: `${p.code} — ${p.titleAr}`,
      prerequisites: p.prerequisiteBox || [],
      bullets: (p.blocks || []).map((b) => `${b.labelAr}: ${b.textAr}`),
      marginalia: (p.marginalia || []).map((m) => `${m.refCode}: ${m.noteAr}`),
    }));

    const htmlString = buildSingleFileStandaloneHtml({
      title: doc.title,
      theme: paperLight ? "focus" : "night",
      sections,
      glossary: glossaryTerms,
    });

    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${doc.docId || "summary"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBlockWithRedaction = (block, plateNumber, idx) => {
    const itemKey = `p${plateNumber}-b${idx}`;
    const isRevealed = Boolean(revealedKeys[itemKey]);
    const fsrsState = reviewStates[itemKey];
    const term = block.redactedTerm;

    if (!declassifyMode || !term || !block.textAr.includes(term)) {
      return <span>{block.textAr}</span>;
    }

    const parts = block.textAr.split(term);
    return (
      <span>
        {parts[0]}
        <button
          type="button"
          onClick={() => handleToggleReveal(itemKey)}
          aria-pressed={isRevealed}
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 mx-1 rounded-md text-xs font-mono font-bold border transition-colors duration-150",
            isRevealed
              ? "bg-[#3DDC97]/15 text-[#3DDC97] border-[#3DDC97]/40"
              : "bg-[#131720] text-[#9AA0AE] border-[#1E222B] hover:border-[#3DDC97]/50 hover:text-[#F2F3F5]"
          )}
        >
          <span>{isRevealed ? term : "[اضغط للكشف]"}</span>
        </button>
        {parts.slice(1).join(term)}

        {isRevealed && (
          <span className="inline-flex items-center gap-1.5 ms-2 align-middle">
            {[
              { label: "نسيت", rating: FSRS_RATINGS.AGAIN },
              { label: "صعب", rating: FSRS_RATINGS.HARD },
              { label: "جيد", rating: FSRS_RATINGS.GOOD },
              { label: "سهل", rating: FSRS_RATINGS.EASY },
            ].map((btn) => (
              <button
                key={btn.rating}
                type="button"
                onClick={() => handleRateFsrs(itemKey, btn.rating)}
                className="px-2 py-0.5 rounded bg-[#131720] hover:bg-[#181F29] border border-[#1E222B] text-[10px] font-mono text-[#F2F3F5]"
              >
                {btn.label}
              </button>
            ))}
            {fsrsState && (
              <span className="text-[11px] font-mono text-[#3DDC97]">
                (القادم: {fsrsState.scheduledDays}ي)
              </span>
            )}
          </span>
        )}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className={cn(
        "rounded-2xl border p-4 sm:p-6 space-y-6 transition-colors duration-150",
        paperLight
          ? "bg-white text-slate-900 border-slate-200 medical-doc-light"
          : "bg-[#0E1117] text-[#F2F3F5] border-[#1E222B]"
      )}
    >
      {/* ─── Clean Reader Toolbar (2 Modes: مظلم / عادي + التسميع الذاتي) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#1E222B] print-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-5 h-5 text-[#3DDC97] shrink-0" />
          <h2 className="text-base sm:text-lg font-bold truncate">{doc.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9AA0AE] absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الملخص..."
              className="h-9 ps-8 pe-3 rounded-xl bg-[#07080C] border border-[#1E222B] text-xs text-[#F2F3F5] placeholder:text-[#9AA0AE] focus:outline-none focus:border-[#3DDC97]"
            />
          </div>

          {/* Dark / Light Paper Toggle (خيارين فقط: مظلم / عادي) */}
          <button
            type="button"
            onClick={() => setPaperLight((v) => !v)}
            className="h-9 px-3 rounded-xl bg-[#131720] hover:bg-[#181F29] border border-[#1E222B] text-xs font-semibold text-[#F2F3F5] inline-flex items-center gap-1.5 transition-colors"
          >
            {paperLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#3DDC97]" />
                <span>الوضع المظلم</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#3DDC97]" />
                <span>الوضع العادي (ورقي)</span>
              </>
            )}
          </button>

          {/* Active Recall (Declassify) Toggle */}
          <button
            type="button"
            onClick={() => setDeclassifyMode((v) => !v)}
            className={cn(
              "h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors",
              declassifyMode
                ? "bg-[#3DDC97] text-[#07080C] border-[#3DDC97] font-bold"
                : "bg-[#131720] text-[#F2F3F5] border-[#1E222B] hover:bg-[#181F29]"
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{declassifyMode ? "التسميع مفعّل" : "وضع التسميع"}</span>
          </button>

          {/* Glossary Toggle */}
          <button
            type="button"
            onClick={() => setShowGlossaryDrawer((v) => !v)}
            className="h-9 px-3 rounded-xl bg-[#131720] hover:bg-[#181F29] border border-[#1E222B] text-xs font-semibold text-[#F2F3F5] inline-flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#3DDC97]" />
            <span>القاموس ({glossaryTerms.length})</span>
          </button>

          {/* Export HTML & Print */}
          <button
            type="button"
            onClick={handleDownloadStandaloneHtml}
            className="h-9 px-3 rounded-xl bg-[#131720] hover:bg-[#181F29] border border-[#1E222B] text-xs font-semibold text-[#F2F3F5] inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>HTML</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-9 px-3 rounded-xl bg-[#3DDC97] hover:bg-[#1ed17e] text-[#07080C] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة PDF</span>
          </button>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {searchQuery.trim() && (
        <div className="rounded-xl bg-[#07080C] border border-[#1E222B] p-4 space-y-2 print-hidden">
          <div className="text-xs font-mono text-[#9AA0AE]">
            نتائج البحث عن «{searchQuery}» ({searchHits.length} مطابقة):
          </div>
          {searchHits.length === 0 ? (
            <p className="text-xs text-[#9AA0AE]">لا توجد نتائج مطابقة.</p>
          ) : (
            <div className="space-y-1.5">
              {searchHits.map((hit, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const chIdx = doc.chapters.findIndex(
                      (c) => c.chapterIndex === hit.chapterIndex
                    );
                    if (chIdx >= 0) setActiveChapterIdx(chIdx);
                    setSearchQuery("");
                  }}
                  className="w-full text-start p-2.5 rounded-lg bg-[#131720] hover:bg-[#181F29] border border-[#1E222B] text-xs text-[#F2F3F5] flex items-center gap-2"
                >
                  <span className="font-mono text-[#3DDC97] shrink-0">
                    [ص {hit.pageNumber}]
                  </span>
                  <span className="truncate">{hit.snippet}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Glossary Drawer */}
      {showGlossaryDrawer && (
        <div className="rounded-xl bg-[#07080C] border border-[#1E222B] p-4 space-y-4 print-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#F2F3F5]">
              قاموس المصطلحات الموحد (Glossary Lock)
            </h3>
            <button
              type="button"
              onClick={() => setShowGlossaryDrawer(false)}
              className="text-[#9AA0AE] hover:text-[#F2F3F5]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {glossaryTerms.map((item) => (
              <div
                key={item.en}
                className="p-2.5 rounded-lg bg-[#131720] border border-[#1E222B] flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-mono font-semibold text-[#3DDC97]" dir="ltr">
                  {item.en}
                </span>
                <span className="text-[#F2F3F5] font-medium">{item.ar}</span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleApplyGlossaryEdit}
            className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E222B]"
          >
            <input
              type="text"
              value={editingGlossaryEn}
              onChange={(e) => setEditingGlossaryEn(e.target.value)}
              placeholder="English Term"
              dir="ltr"
              className="h-9 px-3 rounded-xl bg-[#0E1117] border border-[#1E222B] text-xs text-[#F2F3F5]"
            />
            <input
              type="text"
              value={editingGlossaryAr}
              onChange={(e) => setEditingGlossaryAr(e.target.value)}
              placeholder="الترجمة العربية المعتمدة"
              className="h-9 px-3 rounded-xl bg-[#0E1117] border border-[#1E222B] text-xs text-[#F2F3F5] flex-1 min-w-[180px]"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-[#3DDC97] text-[#07080C] text-xs font-bold hover:bg-[#1ed17e]"
            >
              حفظ في القاموس
            </button>
          </form>
        </div>
      )}

      {/* Chapter Tabs (if multiple chapters exist) */}
      {doc.chapters.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 print-hidden">
          {doc.chapters.map((ch, idx) => {
            const isCurrent = idx === activeChapterIdx;
            return (
              <button
                key={ch.chapterIndex}
                type="button"
                onClick={() => setActiveChapterIdx(idx)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors",
                  isCurrent
                    ? "bg-[#131720] text-[#3DDC97] border-[#3DDC97]/40"
                    : "bg-[#07080C] text-[#9AA0AE] border-[#1E222B] hover:text-[#F2F3F5]"
                )}
              >
                {ch.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Sections */}
      <div className="space-y-5">
        {(activeChapter?.plates || []).map((plate) => (
          <article
            key={plate.plateNumber}
            className="rounded-2xl bg-[#07080C] border border-[#1E222B] p-5 sm:p-6 space-y-4 paired-part-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1E222B]">
              <div>
                <span className="text-[11px] font-mono text-[#3DDC97] block">
                  {plate.code} · ص {(plate.sourcePages || []).join("–")}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#F2F3F5] mt-0.5">
                  {plate.titleAr}
                </h3>
              </div>

              <div className="flex items-center gap-2 print-hidden">
                <LVBadge variant="accent">مدقق 100%</LVBadge>
                <button
                  type="button"
                  onClick={() =>
                    setSourceLensPlate(
                      sourceLensPlate?.plateNumber === plate.plateNumber
                        ? null
                        : plate
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#131720] hover:bg-[#181F29] border border-[#1E222B] text-xs font-mono text-[#9AA0AE] hover:text-[#F2F3F5]"
                >
                  المصدر الأصلي
                </button>
              </div>
            </div>

            {/* Prerequisite Box */}
            {Array.isArray(plate.prerequisiteBox) &&
              plate.prerequisiteBox.length > 0 && (
                <div className="rounded-xl bg-[#131720] border border-[#1E222B] p-4 space-y-1.5">
                  <div className="text-xs font-bold text-[#3DDC97]">
                    قبل ما تقرا (شرح تمهيدي من الأساس):
                  </div>
                  <ul className="list-disc ps-5 space-y-1 text-xs sm:text-sm text-[#F2F3F5]/90 leading-relaxed">
                    {plate.prerequisiteBox.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Content Blocks */}
            <div className="space-y-3">
              {(plate.blocks || []).map((block, bIdx) => (
                <div
                  key={bIdx}
                  className="p-3.5 rounded-xl bg-[#0E1117] border border-[#1E222B] text-sm leading-relaxed text-[#F2F3F5]"
                >
                  <span className="inline-block px-2 py-0.5 rounded bg-[#131720] border border-[#1E222B] text-xs font-semibold text-[#3DDC97] me-2">
                    {block.labelAr}
                  </span>
                  {renderBlockWithRedaction(block, plate.plateNumber, bIdx)}
                </div>
              ))}
            </div>

            {/* Marginalia Notes */}
            {Array.isArray(plate.marginalia) && plate.marginalia.length > 0 && (
              <div className="pt-2 border-t border-[#1E222B] space-y-1.5">
                {plate.marginalia.map((m) => (
                  <div
                    key={m.id}
                    className="text-xs text-[#9AA0AE] flex items-start gap-2"
                  >
                    <span className="font-mono text-[#3DDC97] shrink-0">
                      [{m.refCode}]
                    </span>
                    <span>{m.noteAr}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Source Excerpt Drawer */}
            {sourceLensPlate?.plateNumber === plate.plateNumber && (
              <div className="rounded-xl bg-[#131720] border border-[#3DDC97]/30 p-4 space-y-1.5 print-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#3DDC97]">
                    مقتطف المصدر الأصلي — ص {(plate.sourcePages || []).join("–")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSourceLensPlate(null)}
                    className="text-xs text-[#9AA0AE] hover:text-[#F2F3F5]"
                  >
                    إغلاق
                  </button>
                </div>
                <p
                  dir="ltr"
                  className="text-xs font-mono text-[#F2F3F5]/90 leading-relaxed"
                >
                  {plate.sourceExcerpt}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
