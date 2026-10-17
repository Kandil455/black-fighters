/**
 * TxtQuizDropzone.jsx
 * Instant TXT-to-Quiz panel.
 * Drop or pick any .txt file → auto-detects if it's Q&A format or raw text,
 * then either extracts MCQs offline (0 credits, instant) or routes to AI generation.
 *
 * Design: editorial / brutalist system (--paper, --ink, --sig, .card, .btn, .mono)
 */

import React, { useCallback, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { tryOfflineExtraction } from "@/lib/offlineExamParser";
import { useLocale } from "@/lib/LocaleContext";
import { useAuth } from "@/lib/AuthContext";
import { getQuizCost } from "@/lib/creditCosts";
import { localAnalyzeQuizSource } from "@/lib/quizQuality";
import { FileText, Sparkles, Loader2, ClipboardCheck, Zap } from "@/components/ui/animatedIcons";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

/**
 * Heuristic: is the TXT a formatted Q&A / MCQ bank?
 * Returns { isQAFormat: bool, confidence: 0-1 }
 */
function detectTxtMode(text = "") {
  const lines = text.split("\n");
  const sample = lines.slice(0, 80).join("\n");

  // Strong Q&A signals
  const qaPatterns = [
    /^\s*(?:Q\d*[:.)]|Question\s*\d*[:.)]|س\s*\d*[:.)]|سؤال\s*\d*[:.)])/im,
    /^\s*\d+\s*[.)]\s*.{10,}/m,
    /^\s*[A-Da-dأابجد]\s*[.)]\s*.{3,}/m,
    /(?:answer|correct|الإجابة|الصحيح|الحل)\s*[:=]\s*[A-Da-dأابجد]/i,
  ];
  const qaHits = qaPatterns.filter((p) => p.test(sample)).length;

  // Separator signals
  const hasSeparators = /\n\s*[-─=*]{3,}\s*\n/.test(text.slice(0, 3000));

  const confidence = Math.min(1, (qaHits * 0.3) + (hasSeparators ? 0.15 : 0));
  return { isQAFormat: confidence >= 0.3, confidence };
}

/* ─── component ───────────────────────────────────────────────────────────── */

export default function TxtQuizDropzone({ onQuizReady }) {
  const { locale, dir } = useLocale();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isEn = locale === "en";

  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [txtMode, setTxtMode] = useState(null); // null | 'qa' | 'explain'
  const [title, setTitle] = useState("");
  const [numQ, setNumQ] = useState(10);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(""); // 'reading' | 'parsing' | 'ai' | 'saving'
  const [offlineResult, setOfflineResult] = useState(null); // fast parsed questions

  const credits = profile?.credits ?? 0;
  const aiCost = useMemo(() => getQuizCost(numQ, false), [numQ]);
  const canAffordAI = credits >= aiCost;

  /* ── file read ── */
  const readFile = useCallback(async (f) => {
    if (!f || !f.name.match(/\.txt$/i)) {
      toast.error(isEn ? "Only .txt files are supported here" : "بس ملفات .txt مدعومة هنا");
      return;
    }
    setFile(f);
    setPhase("reading");
    setLoading(true);
    setOfflineResult(null);
    setTxtMode(null);
    try {
      const text = await f.text();
      setRawText(text);
      if (!title) setTitle(f.name.replace(/\.txt$/i, ""));

      // Detect mode
      const { isQAFormat } = detectTxtMode(text);
      setTxtMode(isQAFormat ? "qa" : "explain");

      // Try offline extraction immediately
      if (isQAFormat) {
        setPhase("parsing");
        const parsed = tryOfflineExtraction(text);
        if (parsed.success && parsed.questions.length >= 2) {
          setOfflineResult(parsed);
        }
      }
    } catch (err) {
      toast.error(err.message || (isEn ? "Could not read file" : "مقدرناش نقرأ الملف"));
      setFile(null);
    } finally {
      setLoading(false);
      setPhase("");
    }
  }, [isEn, title]);

  /* ── drag & drop ── */
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) readFile(f);
  }, [readFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  /* ── instant offline save (0 credits) ── */
  const handleSaveOffline = async () => {
    if (!offlineResult?.questions?.length) return;
    setLoading(true);
    setPhase("saving");
    try {
      const me = await base44.auth.me();
      const quiz = await base44.entities.StandaloneQuiz.create({
        title: title.trim() || file.name,
        owner_id: me.id,
        owner_name: me.full_name || me.email,
        questions: offlineResult.questions,
        is_public: true,
        show_explanations: false,
        quiz_mode: "extract",
        quiz_profile: "balanced",
        source_analysis: { recommendation: "extract", question_count: offlineResult.questions.length },
        quality_stats: { source: "txt_offline_parser", accepted: offlineResult.questions.length },
      });
      toast.success(
        isEn
          ? `✅ ${offlineResult.questions.length} questions extracted — 0 credits used!`
          : `✅ ${offlineResult.questions.length} سؤال اتاستخرج — 0 كريدت!`
      );
      navigate(`/q/${quiz.id}`);
    } catch (err) {
      console.error("[TxtQuizDropzone] save failed:", err);
      toast.error(isEn ? "Failed to save quiz" : "حصل خطأ في الحفظ");
    } finally {
      setLoading(false);
      setPhase("");
    }
  };

  /* ── AI generation from TXT ── */
  const handleAIGenerate = async () => {
    if (!rawText || rawText.trim().length < 30) {
      return toast.error(isEn ? "Text is too short" : "النص قصير جداً");
    }
    if (!title.trim()) return toast.error(isEn ? "Add a quiz title" : "اكتب عنوان للكويز");
    if (!canAffordAI) return toast.error(isEn ? "Not enough credits" : "الكريدتس مش كافية");

    setLoading(true);
    setPhase("ai");
    let chargedJob = null;
    try {
      const me = await base44.auth.me();
      const jobKey = crypto.randomUUID();

      const charge = await base44.functions.invoke("chargeAiJob", {
        action: "charge", jobKey, task: "quiz", questionCount: numQ,
      });
      chargedJob = { jobKey, cost: charge.data.cost };

      const localAnalysis = localAnalyzeQuizSource(rawText);
      const res = await base44.functions.invoke("generateStudyContent", {
        task: "quiz",
        text: rawText.slice(0, 18000),
        numQuestions: numQ,
        difficulty: "mixed",
        quizProfile: "balanced",
        withExplanation: true,
        quizMode: txtMode === "qa" ? "extract" : "generate",
        sourceAnalysis: localAnalysis,
        language: "auto",
      });

      const questions = res?.data?.result?.questions || res?.data?.questions || [];
      if (!questions.length) throw new Error("NO_QUESTIONS");

      await base44.functions.invoke("chargeAiJob", { action: "finalize", jobKey }).catch(() => {});

      if (onQuizReady) {
        onQuizReady({ questions, title, mode: "txt_ai" });
        return;
      }

      const quiz = await base44.entities.StandaloneQuiz.create({
        title: title.trim(),
        owner_id: me.id,
        owner_name: me.full_name || me.email,
        questions,
        is_public: true,
        show_explanations: true,
        quiz_mode: txtMode === "qa" ? "extract" : "generate",
        quiz_profile: "balanced",
        source_analysis: localAnalysis,
        quality_stats: { source: "txt_ai", accepted: questions.length },
      });
      toast.success(
        isEn
          ? `✅ ${questions.length} questions generated from your TXT`
          : `✅ ${questions.length} سؤال من ملفك`
      );
      navigate(`/q/${quiz.id}`);
    } catch (err) {
      if (chargedJob) {
        await base44.functions.invoke("chargeAiJob", { action: "refund", ...chargedJob }).catch(() => {});
      }
      const code = err?.response?.data?.error || err.message || "";
      if (/INSUFFICIENT_CREDITS/i.test(code)) toast.error(isEn ? "Not enough credits" : "كريدتس مش كافية");
      else if (/NO_QUESTIONS/i.test(code)) toast.error(isEn ? "Could not generate questions" : "مقدرناش نولّد أسئلة");
      else toast.error(isEn ? "Error generating quiz" : "حصل خطأ في الكويز");
    } finally {
      setLoading(false);
      setPhase("");
    }
  };

  /* ── reset ── */
  const reset = () => {
    setFile(null);
    setRawText("");
    setTxtMode(null);
    setTitle("");
    setOfflineResult(null);
    setPhase("");
  };

  /* ── render ── */
  return (
    <div dir={dir} className="txt-quiz-drop">
      <style>{`
        .txt-quiz-drop { font-family: var(--font-sans, system-ui); }
        .txt-drop-zone {
          border: 2px dashed var(--line, #e5e5e5);
          border-radius: 14px;
          background: var(--paper2, #fafafa);
          transition: border-color .2s, background .2s;
          cursor: pointer;
          text-align: center;
          padding: 2.5rem 1.5rem;
          position: relative;
        }
        .txt-drop-zone.drag-over {
          border-color: var(--sig, #e63946);
          background: color-mix(in srgb, var(--sig, #e63946) 6%, var(--paper2, #fafafa));
        }
        .txt-drop-zone .drop-icon {
          width: 48px; height: 48px;
          margin: 0 auto 1rem;
          color: var(--sig, #e63946);
          opacity: .8;
        }
        .txt-drop-zone .drop-head {
          font-size: 1.1rem; font-weight: 900;
          color: var(--ink, #0d0d0d);
          margin-bottom: .3rem;
        }
        .txt-drop-zone .drop-sub {
          font-size: .82rem;
          color: var(--mute, #888);
        }
        .txt-result-card {
          border: 1.5px solid var(--line, #e5e5e5);
          border-radius: 14px;
          background: var(--paper2, #fafafa);
          padding: 1.25rem 1.5rem;
        }
        .txt-mode-badge {
          display: inline-flex; align-items: center; gap: .4rem;
          padding: .25rem .75rem;
          border-radius: 999px;
          font-size: .75rem; font-weight: 800;
          letter-spacing: .04em;
        }
        .txt-mode-badge.qa {
          background: color-mix(in srgb, var(--sig, #e63946) 12%, transparent);
          color: var(--sig, #e63946);
          border: 1px solid color-mix(in srgb, var(--sig, #e63946) 30%, transparent);
        }
        .txt-mode-badge.explain {
          background: color-mix(in srgb, #0ea5e9 10%, transparent);
          color: #0ea5e9;
          border: 1px solid color-mix(in srgb, #0ea5e9 30%, transparent);
        }
        .txt-action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: .75rem;
          margin-top: 1.25rem;
        }
        @media (max-width: 520px) { .txt-action-grid { grid-template-columns: 1fr; } }
        .txt-btn {
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          padding: .75rem 1rem;
          border-radius: 10px;
          font-weight: 800; font-size: .85rem;
          border: none; cursor: pointer;
          transition: opacity .15s, transform .1s;
        }
        .txt-btn:active { transform: scale(.97); }
        .txt-btn:disabled { opacity: .5; cursor: not-allowed; }
        .txt-btn.primary {
          background: var(--ink, #0d0d0d);
          color: var(--paper, #fff);
        }
        .txt-btn.accent {
          background: var(--sig, #e63946);
          color: #fff;
        }
        .txt-btn.ghost {
          background: transparent;
          color: var(--mute, #888);
          border: 1.5px solid var(--line, #e5e5e5);
        }
        .txt-title-input {
          width: 100%;
          padding: .6rem .9rem;
          border-radius: 8px;
          border: 1.5px solid var(--line, #e5e5e5);
          background: var(--paper, #fff);
          color: var(--ink, #0d0d0d);
          font-size: .9rem; font-weight: 600;
          outline: none;
          margin-bottom: .75rem;
        }
        .txt-title-input:focus { border-color: var(--sig, #e63946); }
        .txt-offline-banner {
          display: flex; align-items: center; gap: .6rem;
          padding: .6rem 1rem;
          border-radius: 8px;
          background: color-mix(in srgb, #22c55e 10%, transparent);
          border: 1px solid color-mix(in srgb, #22c55e 30%, transparent);
          color: #16a34a;
          font-size: .82rem; font-weight: 700;
          margin-bottom: 1rem;
        }
        [data-theme="dark"] .txt-drop-zone { background: var(--paper2); }
        [data-theme="dark"] .txt-result-card { background: var(--paper2); }
        [data-theme="dark"] .txt-title-input { background: var(--paper2); color: var(--ink); }
        [data-theme="dark"] .txt-btn.primary { background: var(--ink); color: var(--paper); }
      `}</style>

      {/* ── drop zone (no file yet) ── */}
      {!file && (
        <div
          className={`txt-drop-zone${dragging ? " drag-over" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          aria-label={isEn ? "Drop TXT file or click to browse" : "اسحب ملف TXT أو اضغط للاختيار"}
        >
          <FileText className="drop-icon" />
          <p className="drop-head">
            {isEn ? "Drop your .txt file here" : "حط ملفك .txt هنا"}
          </p>
          <p className="drop-sub">
            {isEn
              ? "Works with Q&A banks, notes, or any plain text — quiz ready in seconds"
              : "بيشتغل مع بنوك أسئلة، ملاحظات، أو أي نص عادي — كويز في ثواني"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            style={{ display: "none" }}
            onChange={(e) => readFile(e.target.files?.[0])}
          />
        </div>
      )}

      {/* ── file loaded ── */}
      <AnimatePresence>
        {file && (
          <motion.div
            className="txt-result-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* file header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                <FileText style={{ width: 20, height: 20, color: "var(--sig)" }} />
                <span style={{ fontWeight: 800, fontSize: ".9rem", color: "var(--ink)" }}>
                  {file.name}
                </span>
                <span style={{ fontSize: ".75rem", color: "var(--mute)" }}>
                  {(file.size / 1024).toFixed(1)} KB · {rawText.split(/\s+/).length.toLocaleString()} {isEn ? "words" : "كلمة"}
                </span>
              </div>
              <button
                className="txt-btn ghost"
                style={{ padding: ".25rem .7rem", fontSize: ".75rem" }}
                onClick={reset}
              >
                {isEn ? "Change" : "تغيير"}
              </button>
            </div>

            {/* mode badge */}
            {txtMode && (
              <div style={{ marginBottom: ".75rem" }}>
                {txtMode === "qa" ? (
                  <span className="txt-mode-badge qa">
                    <ClipboardCheck style={{ width: 13, height: 13 }} />
                    {isEn ? "Q&A Bank detected" : "بنك أسئلة — استخراج فوري"}
                  </span>
                ) : (
                  <span className="txt-mode-badge explain">
                    <Sparkles style={{ width: 13, height: 13 }} />
                    {isEn ? "Explanatory text — AI will generate MCQs" : "نص شرح — الـ AI هيولّد أسئلة"}
                  </span>
                )}
              </div>
            )}

            {/* offline banner */}
            {offlineResult && (
              <div className="txt-offline-banner">
                <Zap style={{ width: 15, height: 15 }} />
                {isEn
                  ? `${offlineResult.questions.length} questions parsed instantly (0 credits!)`
                  : `${offlineResult.questions.length} سؤال اتحلّل فوراً (0 كريدت!)`}
              </div>
            )}

            {/* loading phase */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".75rem", color: "var(--mute)", fontSize: ".85rem" }}>
                <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                {phase === "reading" && (isEn ? "Reading file…" : "بيقرأ الملف…")}
                {phase === "parsing" && (isEn ? "Parsing questions…" : "بيستخرج الأسئلة…")}
                {phase === "ai" && (isEn ? "AI is generating your quiz…" : "الـ AI بيولّد الكويز…")}
                {phase === "saving" && (isEn ? "Saving quiz…" : "بيحفظ الكويز…")}
              </div>
            )}

            {/* title input */}
            {!loading && rawText && (
              <input
                className="txt-title-input"
                placeholder={isEn ? "Quiz title…" : "عنوان الكويز…"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}

            {/* question count slider (for AI mode) */}
            {!loading && rawText && txtMode === "explain" && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--mute)", display: "block", marginBottom: ".4rem" }}>
                  {isEn ? `Questions: ${numQ}` : `عدد الأسئلة: ${numQ}`}
                </label>
                <input
                  type="range"
                  min={3} max={30} step={1}
                  value={numQ}
                  onChange={(e) => setNumQ(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--sig)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "var(--mute)" }}>
                  <span>3</span>
                  <span style={{ color: canAffordAI ? "var(--sig)" : "#ef4444", fontWeight: 700 }}>
                    {isEn ? `${aiCost} credits` : `${aiCost} كريدت`}
                    {!canAffordAI && ` (${isEn ? "insufficient" : "غير كافي"})`}
                  </span>
                  <span>30</span>
                </div>
              </div>
            )}

            {/* action buttons */}
            {!loading && rawText && (
              <div className="txt-action-grid">
                {/* Offline instant (Q&A banks) */}
                {offlineResult && (
                  <button
                    className="txt-btn primary"
                    onClick={handleSaveOffline}
                    disabled={loading}
                  >
                    <Zap style={{ width: 16, height: 16 }} />
                    {isEn
                      ? `Use Offline (${offlineResult.questions.length}Q · Free)`
                      : `فوري (${offlineResult.questions.length}س · مجاني)`}
                  </button>
                )}

                {/* AI Generate */}
                <button
                  className="txt-btn accent"
                  onClick={handleAIGenerate}
                  disabled={loading || !canAffordAI}
                  style={{ gridColumn: offlineResult ? "2" : "1 / -1" }}
                >
                  <Sparkles style={{ width: 16, height: 16 }} />
                  {isEn
                    ? `AI Generate (${aiCost} credits)`
                    : `توليد بالـ AI (${aiCost} كريدت)`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
