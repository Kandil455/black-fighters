import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Youtube,
  Sparkles,
  BookOpen,
  MessageSquare,
  Printer,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  BookmarkPlus,
  PlayCircle,
  Brain,
  RotateCcw,
  Sun,
  Moon,
  Clock,
  X,
  MessageCircle,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import {
  modifyYouTubeLecture,
  saveYouTubeAsCourse,
  saveYouTubeAsQuiz,
} from "@/lib/youtubeService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { getEstimatedYouTubeCredits, parseYouTubeTime, STEP_LABELS_AR, STEP_LABELS_EN } from "@/features/theory/youtube-studio/youtubeStudioConfig";
import { escapeHtml, isEnglishNode, preprocessBidiMarkdown } from "@/features/theory/youtube-studio/bidiMarkdown";

/**
 * ⚡️ Bi-Directional Section Viewer (BidiMarkdownViewer)
 * Matches the requested modular clinical layout:
 * - Part pill badge
 * - English Core Notes (Strict LTR, left bullets, highlighted terms)
 * - (الشرح بالعربي) pill badge
 * - Arabic Clinical Walkthrough (Strict RTL, right bullets, bold terms)
 * - Dual bilingual tables (English first, Arabic below)
 */
function BidiMarkdownViewer({ markdown, theme = "dark", isEn = false }) {
  const isLight = theme === "light";
  const processed = React.useMemo(() => (markdown ? preprocessBidiMarkdown(markdown) : ""), [markdown]);

  const parsedParts = React.useMemo(() => {
    if (!processed) return [];
    // Split markdown by ## (H2) headings while preserving delimiters
    const rawParts = processed.split(/\n(?=##\s+)/);

    return rawParts.map((rawPart, idx) => {
      const trimmed = rawPart.trim();
      const firstLine = trimmed.split("\n")[0] || "";
      const isH2 = firstLine.startsWith("## ");
      const title = isH2 ? firstLine.replace(/^##\s+/, "").trim() : "";

      // Robust check for embedded Arabic Walkthrough split:
      // Matches ### (الشرح بالعربي) / (الشرح بالعربي) / **الشرح بالعربي:** / الشرح بالعربي: / ### الشرح التفصيلي
      const splitRegex = /(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*{0,2})\s*\(?الشرح\s+(?:بالعربي|التفصيلي|الإكلينيكي)\)?(?:\*{0,2})\s*:?/i;
      const splitMatch = trimmed.match(splitRegex);

      if (splitMatch && splitMatch.index !== undefined && splitMatch.index > 15) {
        const enChunk = trimmed.slice(0, splitMatch.index).trim();
        const arChunk = trimmed.slice(splitMatch.index).trim();
        return {
          id: idx,
          type: "paired_part",
          title,
          enContent: enChunk,
          arContent: arChunk,
        };
      }

      // Standalone section (intro, standalone table, or summary)
      const hasEnglishKeyword = /English Core Notes|Diagnostic Criteria|Technical Notes|Classification|Comparison Table \(English\)/i.test(title);
      const arabicLetters = (trimmed.match(/[\u0600-\u06FF]/g) || []).length;
      const englishLetters = (trimmed.match(/[a-zA-Z]/g) || []).length;
      const isEnglish = hasEnglishKeyword || (englishLetters > 35 && englishLetters > arabicLetters * 1.3);

      return {
        id: idx,
        type: "standalone",
        title,
        content: trimmed,
        isEnglish,
      };
    });
  }, [processed]);

  if (!markdown) return null;

  return (
    <div className="space-y-8">
      {parsedParts.map((item) => {
        if (item.type === "paired_part") {
          return (
            <div
              key={item.id}
              className={`paired-part-card my-8 rounded-3xl p-6 sm:p-8 space-y-6 transition-colors duration-300 ${
                isLight
                  ? "bg-white border border-slate-300 shadow-xl text-slate-900"
                  : "bg-[#070a14] border border-white/10 shadow-2xl text-slate-100"
              }`}
            >
              {/* Part Header Badge */}
              <div className={`flex items-center justify-between border-b pb-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                <div className="part-header-pill">
                  {item.title}
                </div>
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  BILINGUAL CLINICAL MODULE
                </span>
              </div>

              {/* 1. English Core Notes (Strict LTR) */}
              <div dir="ltr" className="bidi-ltr text-left font-sans space-y-3" style={{ direction: "ltr", textAlign: "left" }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: () => null,
                    h2: () => null,
                    h3: ({ children }) => (
                      <h3 className={`text-base font-black font-mono mt-4 mb-2 text-left ${isLight ? "text-sky-800" : "text-sky-300"}`}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left" }}
                        className={`my-2.5 leading-7 text-[15px] font-sans font-medium text-left ${isLight ? "text-slate-900" : "text-slate-100"}`}
                      >
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul
                        className={`my-3 space-y-2 list-disc ps-6 text-left ${isLight ? "marker:text-sky-700 text-slate-900" : "marker:text-sky-400 text-slate-100"}`}
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                      >
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol
                        className={`my-3 space-y-2 list-decimal ps-6 text-left ${isLight ? "marker:text-sky-700 text-slate-900" : "marker:text-sky-400 text-slate-100"}`}
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                      >
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left" }}
                        className={`leading-7 text-[15px] font-medium text-left ${isLight ? "text-slate-900" : "text-slate-100"}`}
                      >
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className={`font-black ${isLight ? "text-black" : "text-white"}`}>{children}</strong>
                    ),
                    code: ({ inline, children }) => (
                      <code className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                        isLight
                          ? "bg-sky-100 border border-sky-300 text-sky-950 font-bold"
                          : "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                      }`}>
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className={`my-5 overflow-x-auto rounded-xl border ${
                        isLight ? "border-slate-300 bg-white" : "border-sky-500/30 bg-[#070b16]"
                      }`}>
                        <table className="w-full text-xs sm:text-sm text-left border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className={`p-3 border-b font-mono font-bold text-left ${
                        isLight ? "bg-sky-100/80 border-slate-300 text-sky-950" : "bg-sky-500/15 border-sky-500/25 text-sky-200"
                      }`}>
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className={`p-3 border-b align-top text-left font-sans ${
                        isLight ? "border-slate-200 text-slate-900 font-medium" : "border-white/5 text-slate-200"
                      }`}>
                        {children}
                      </td>
                    ),
                  }}
                >
                  {item.enContent.replace(/^##\s+.*?\n/, "")}
                </ReactMarkdown>
              </div>

              {/* Divider & Arabic Walkthrough */}
              <div className={`border-t pt-4 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                <div className="flex justify-end mb-3">
                  <div className="arabic-walkthrough-pill">
                    {isEn ? "(Arabic Clinical Walkthrough):" : "(الشرح بالعربي):"}
                  </div>
                </div>

                <div dir="rtl" className="bidi-rtl text-right font-sans space-y-3" style={{ direction: "rtl", textAlign: "right" }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: () => null,
                      h2: () => null,
                      h3: () => null,
                      p: ({ children }) => {
                        const isEnP = isEnglishNode(children);
                        return (
                          <p
                            dir={isEnP ? "ltr" : "rtl"}
                            style={{
                              direction: isEnP ? "ltr" : "rtl",
                              textAlign: isEnP ? "left" : "right",
                              unicodeBidi: "isolate",
                            }}
                            className={`my-3 leading-8 text-[15px] font-sans font-medium ${isEnP ? "text-left" : "text-right"} ${isLight ? "text-slate-900" : "text-slate-100"}`}
                          >
                            {children}
                          </p>
                        );
                      },
                      ul: ({ children }) => (
                        <ul
                          className={`my-3 space-y-2 list-disc pe-6 ${isLight ? "marker:text-emerald-700 text-slate-900" : "marker:text-emerald-400 text-slate-100"}`}
                          dir="rtl"
                          style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol
                          className={`my-3 space-y-2 list-decimal pe-6 ${isLight ? "marker:text-emerald-700 text-slate-900" : "marker:text-emerald-400 text-slate-100"}`}
                          dir="rtl"
                          style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => {
                        const isEnLi = isEnglishNode(children);
                        return (
                          <li
                            dir={isEnLi ? "ltr" : "rtl"}
                            style={{
                              direction: isEnLi ? "ltr" : "rtl",
                              textAlign: isEnLi ? "left" : "right",
                              unicodeBidi: "isolate",
                            }}
                            className={`leading-7 text-[15px] font-medium ${isEnLi ? "text-left ps-4" : "text-right"} ${isLight ? "text-slate-900" : "text-slate-200"}`}
                          >
                            {children}
                          </li>
                        );
                      },
                      strong: ({ children }) => (
                        <strong className={`font-black ${isLight ? "text-black" : "text-white"}`}>{children}</strong>
                      ),
                      code: ({ inline, children }) => (
                        <code
                          dir="ltr"
                          className={`bidi-isolate px-1.5 py-0.5 rounded font-mono text-xs mx-1 inline-block ${
                            isLight
                              ? "bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold"
                              : "bg-white/10 text-cyan-300"
                          }`}
                        >
                          {children}
                        </code>
                      ),
                      table: ({ children }) => (
                        <div className={`my-5 overflow-x-auto rounded-xl border ${
                          isLight ? "border-slate-300 bg-white" : "border-white/10 bg-[#0d1122]"
                        }`}>
                          <table className="w-full text-xs sm:text-sm text-right border-collapse">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className={`p-3 border-b font-bold text-right ${
                          isLight ? "bg-emerald-100/80 border-slate-300 text-emerald-950" : "bg-white/5 border-white/10 text-white"
                        }`}>
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className={`p-3 border-b align-top text-right font-sans ${
                          isLight ? "border-slate-200 text-slate-900 font-medium" : "border-white/5 text-slate-200"
                        }`}>
                          {children}
                        </td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className={`my-4 p-4 rounded-xl border-r-4 text-right ${
                          isLight
                            ? "bg-purple-50 border-purple-600 text-purple-950 font-medium"
                            : "bg-purple-500/10 border-purple-500 text-purple-200"
                        }`}>
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {item.arContent.replace(/^(?:#{1,4}\s*)?(?:\*{0,2})\s*\(?الشرح\s+(?:بالعربي|التفصيلي|الإكلينيكي)\)?(?:\*{0,2})[:\s]*/i, "")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        }

        // Standalone Section (Intro, Standalone Table, Pitfalls, etc.)
        if (item.isEnglish) {
          return (
            <div
              key={item.id}
              dir="ltr"
              className={`bidi-ltr my-6 p-6 sm:p-8 rounded-2xl border text-left font-sans shadow-lg transition-colors duration-300 ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900 shadow-xl"
                  : "bg-[#070a14] border-sky-500/25 text-slate-100 shadow-sky-950/20"
              }`}
            >
              {item.title && (
                <div className="part-header-pill mb-4">
                  {item.title}
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ children }) => (
                    <h1 className={`text-xl sm:text-2xl font-black font-mono mb-4 text-left ${isLight ? "text-sky-900" : "text-sky-300"}`}>
                      {children}
                    </h1>
                  ),
                  h2: () => null,
                  h3: ({ children }) => (
                    <h3 className={`text-base font-bold font-mono mt-5 mb-2 text-left ${isLight ? "text-sky-800" : "text-sky-100"}`}>
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className={`my-2.5 leading-7 text-[15px] font-sans font-medium text-left ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul
                      className={`my-3 space-y-2 list-disc ps-6 text-left ${isLight ? "marker:text-sky-700 text-slate-900" : "marker:text-sky-400 text-slate-100"}`}
                      style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol
                      className={`my-3 space-y-2 list-decimal ps-6 text-left ${isLight ? "marker:text-sky-700 text-slate-900" : "marker:text-sky-400 text-slate-100"}`}
                      style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                    >
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className={`leading-7 text-[15px] font-medium text-left ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className={`font-black ${isLight ? "text-black" : "text-white"}`}>{children}</strong>
                  ),
                  code: ({ inline, children }) => (
                    <code className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                      isLight
                        ? "bg-sky-100 border border-sky-300 text-sky-950 font-bold"
                        : "bg-sky-500/15 border border-sky-500/30 text-sky-300"
                    }`}>
                      {children}
                    </code>
                  ),
                  table: ({ children }) => (
                    <div className={`my-5 overflow-x-auto rounded-xl border ${
                      isLight ? "border-slate-300 bg-white" : "border-sky-500/30 bg-[#070b16]"
                    }`}>
                      <table className="w-full text-xs sm:text-sm text-left border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className={`p-3 border-b font-mono font-bold text-left ${
                      isLight ? "bg-sky-100/80 border-slate-300 text-sky-950" : "bg-sky-500/15 border-sky-500/25 text-sky-200"
                    }`}>
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className={`p-3 border-b align-top text-left font-sans ${
                      isLight ? "border-slate-200 text-slate-900 font-medium" : "border-white/5 text-slate-200"
                    }`}>
                      {children}
                    </td>
                  ),
                }}
              >
                {item.content.replace(/^##\s+.*?\n/, "")}
              </ReactMarkdown>
            </div>
          );
        }

        // Standalone Arabic Section
        return (
          <div
            key={item.id}
            dir="rtl"
            className={`bidi-rtl my-6 p-6 sm:p-8 rounded-2xl border text-right font-sans shadow-lg transition-colors duration-300 ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 shadow-xl"
                : "bg-[#090d1a] border-white/10 text-slate-100 shadow-black/40"
            }`}
          >
            {item.title && (
              <div className="part-header-pill mb-4">
                {item.title}
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className={`text-2xl sm:text-3xl font-black mb-4 border-b pb-3 text-right ${isLight ? "text-black border-slate-200" : "text-white border-white/10"}`}>
                    {children}
                  </h1>
                ),
                h2: () => null,
                h3: ({ children }) => (
                  <h3 className={`text-base sm:text-lg font-bold mt-5 mb-2 border-r-4 pr-3 text-right ${isLight ? "text-slate-950 border-red-500" : "text-white border-red-400"}`}>
                    {children}
                  </h3>
                ),
                p: ({ children }) => {
                  const isEnP = isEnglishNode(children);
                  return (
                    <p
                      dir={isEnP ? "ltr" : "rtl"}
                      style={{ direction: isEnP ? "ltr" : "rtl", textAlign: isEnP ? "left" : "right" }}
                      className={`my-3 leading-8 text-[15px] font-sans font-medium ${isEnP ? "text-left" : "text-right"} ${isLight ? "text-slate-900" : "text-slate-100"}`}
                    >
                      {children}
                    </p>
                  );
                },
                ul: ({ children }) => (
                  <ul
                    className={`my-3 space-y-2 list-disc pr-6 text-right ${isLight ? "marker:text-red-600 text-slate-900" : "marker:text-red-400 text-slate-100"}`}
                    style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    className={`my-3 space-y-2 list-decimal pr-6 text-right ${isLight ? "marker:text-red-600 text-slate-900" : "marker:text-red-400 text-slate-100"}`}
                    style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => {
                  const isEnLi = isEnglishNode(children);
                  return (
                    <li
                      dir={isEnLi ? "ltr" : "rtl"}
                      style={{ direction: isEnLi ? "ltr" : "rtl", textAlign: isEnLi ? "left" : "right" }}
                      className={`leading-7 text-[15px] font-medium ${isEnLi ? "text-left ps-4" : "text-right"} ${isLight ? "text-slate-900" : "text-slate-200"}`}
                    >
                      {children}
                    </li>
                  );
                },
                strong: ({ children }) => (
                  <strong className={`font-black ${isLight ? "text-black" : "text-white"}`}>{children}</strong>
                ),
                code: ({ inline, children }) => (
                  <code
                    dir="ltr"
                    className={`bidi-isolate px-1.5 py-0.5 rounded font-mono text-xs mx-1 inline-block ${
                      isLight
                        ? "bg-slate-100 border border-slate-300 text-slate-900 font-bold"
                        : "bg-white/10 text-cyan-300"
                    }`}
                  >
                    {children}
                  </code>
                ),
                table: ({ children }) => (
                  <div className={`my-5 overflow-x-auto rounded-xl border ${
                    isLight ? "border-slate-300 bg-white" : "border-white/10 bg-[#0d1122]"
                  }`}>
                    <table className="w-full text-xs sm:text-sm text-right border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className={`p-3 border-b font-bold text-right ${
                    isLight ? "bg-slate-100 border-slate-300 text-slate-950" : "bg-white/5 border-white/10 text-white"
                  }`}>
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className={`p-3 border-b align-top text-right font-sans ${
                    isLight ? "border-slate-200 text-slate-900 font-medium" : "border-white/5 text-slate-200"
                  }`}>
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className={`my-4 p-4 rounded-xl border-r-4 text-right ${
                    isLight ? "bg-purple-50 border-purple-600 text-purple-950 font-medium" : "bg-purple-500/10 border-purple-500 text-purple-200"
                  }`}>
                    {children}
                  </blockquote>
                ),
              }}
            >
              {item.content.replace(/^##\s+.*?\n/, "")}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

export default function YouTubeAIStudio() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const stepLabels = isEn ? STEP_LABELS_EN : STEP_LABELS_AR;
  const userCredits = Number(profile?.credits || 0);

  // Inputs
  const [url, setUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mode, setMode] = useState("both"); // 'both' | 'summary_only' | 'quiz_only'
  const [quizCount, setQuizCount] = useState(10);
  const [docTheme, setDocTheme] = useState("dark"); // 'dark' | 'light'
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // Dynamic cost calculation according to platform rules: 1 hr = 20 credits, 10 Qs = 5 credits
  const estimatedCredits = React.useMemo(() => {
    return getEstimatedYouTubeCredits({ startTime, endTime, mode, quizCount });
  }, [startTime, endTime, mode, quizCount]);

  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");

  // Results
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("notes"); // 'notes' | 'quiz' | 'chat'

  // Quiz Interaction State
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // AI Chat Refiner Drawer
  const [chatMessages, setChatMessages] = useState(() => [
    {
      sender: "ai",
      text: isEn
        ? "Hello Doctor! I am your AI clinical assistant. You can ask me to modify the notes, add new comparison tables, or calculate emergency resuscitation dosages!"
        : "مرحباً دكتور! أنا المساعد السريري الذكي. تقدر تطلب مني أعدل في المذكرة، أضيف جداول مقارنة جديدة، أو أحسب جرعات إنعاش فورية!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const chatEndRef = useRef(null);

  // Persistence status
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savedCourseId, setSavedCourseId] = useState(null);
  const [savedQuizId, setSavedQuizId] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleQuickPasteDemo = () => {
    setUrl("https://youtu.be/IKlpGhcWjo0");
    setCustomTitle(isEn ? "ABCDE Approach in Emergency & Critical Care" : "منهجية الـ ABCDE في طوارئ الباطنة والحالات الحرجة");
    setError("");
  };

  const handleSynthesize = async (e) => {
    e?.preventDefault();
    if (!isAdmin && userCredits < estimatedCredits) {
      toast.error(
        isEn
          ? `Your current balance (${userCredits} Credits) is insufficient. This operation requires approx. ${estimatedCredits} Credits. Please recharge.`
          : `رصيدك الحالي (${userCredits} كريدت) غير كافٍ. تتطلب هذه العملية حوالي ${estimatedCredits} كريدت. يرجى شحن الكريدتس.`
      );
      navigate("/subscriptions");
      return;
    }
    if (!url.trim()) {
      setError(isEn ? "Please enter a valid YouTube URL first" : "يرجى إدخال رابط يوتيوب صالح أولاً");
      return;
    }

    setError("");
    setIsProcessing(true);
    setProcessStep(0);

    const stepInterval = setInterval(() => {
      setProcessStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 4500);

    try {
      // Secure server job: transcript fetch + AI synthesis + atomic credit charge/refund
      const { invokeSecureFunction } = await import("@/lib/secureFunctions");
      const effectiveTitle = customTitle.trim() || (isEn ? "YouTube Lecture" : "محاضرة يوتيوب");
      const s = parseYouTubeTime(startTime);
      const e = parseYouTubeTime(endTime);
      const durationSeconds = (e !== null && s !== null && e > s) ? (e - s) : 0;

      const response = await invokeSecureFunction("youtube-ai-job", {
        url: url.trim(),
        title: effectiveTitle,
        mode,
        quizCount: Number(quizCount) || 10,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        durationSeconds,
        jobKey: crypto.randomUUID(),
      });
      const synthData = response.data || {};
      if (!synthData.success) throw new Error(synthData.error || (isEn ? "Lecture synthesis failed" : "فشلت عملية التلخيص"));
      if (synthData.charged > 0) {
        toast.info(
          isEn
            ? `${synthData.charged} credits deducted to process lecture 🧾`
            : `تم خصم ${synthData.charged} كريدت لتشغيل المحاضرة 🧾`
        );
      }

      clearInterval(stepInterval);

      setResult({
        videoId: synthData.videoId,
        url: url.trim(),
        title: effectiveTitle,
        markdown: synthData.markdown,
        quiz: synthData.quiz,
        mode: synthData.mode || mode,
      });

      if (mode === "quiz_only") {
        setActiveTab("quiz");
        toast.success(isEn ? `Successfully generated ${synthData.quiz?.length || 0} quiz questions! 🎯` : `تم توليد ${synthData.quiz?.length || 0} سؤال كويز بنجاح! 🎯`);
      } else if (mode === "summary_only") {
        setActiveTab("notes");
        toast.success(isEn ? "Successfully generated comprehensive clinical notes! 📑" : "تم توليد المذكرة السريرية الشاملة بنجاح! 📑");
      } else {
        setActiveTab("notes");
        toast.success(isEn ? "Successfully generated notes and question bank! 🚀" : "تم توليد المذكرة وبنك الأسئلة بنجاح! 🚀");
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error("Synthesis failed:", err);
      setError(err.message || (isEn ? "An error occurred while analyzing and synthesizing the lecture" : "حدث خطأ أثناء تحليل وتلخيص المحاضرة"));
      toast.error(err.message || (isEn ? "Synthesis failed" : "فشلت عملية التلخيص"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendModification = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !result?.markdown || isModifying) return;

    const userPrompt = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: userPrompt }]);
    setIsModifying(true);

    try {
      const updatedMarkdown = await modifyYouTubeLecture({
        currentMarkdown: result.markdown,
        promptInstruction: userPrompt,
      });

      setResult((prev) => ({ ...prev, markdown: updatedMarkdown }));
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: isEn
            ? `Edit applied successfully, Doctor! Notes updated with: "${userPrompt.slice(0, 40)}..." ✅`
            : `تم تطبيق التعديل بنجاح يا دكتور! تم تحديث المذكرة بالطلب الخاص بك: "${userPrompt.slice(0, 40)}..." ✅`,
        },
      ]);
      toast.success(isEn ? "Notes updated successfully! ✨" : "تم تحديث المذكرة بنجاح! ✨");
    } catch (err) {
      console.error("Modification failed:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: isEn
            ? `Sorry Doctor, an error occurred while applying the edit: ${err.message}`
            : `عذراً دكتور، حدث خطأ أثناء تطبيق التعديل: ${err.message}`,
        },
      ]);
      toast.error(isEn ? "Failed to modify notes" : "فشل تعديل المذكرة");
    } finally {
      setIsModifying(false);
    }
  };

  const handleSaveToCourses = async () => {
    if (!result?.markdown) return;
    setSavingCourse(true);
    try {
      const newCourse = await saveYouTubeAsCourse({
        title: result.title,
        markdown: result.markdown,
        videoId: result.videoId,
        url: result.url,
      });
      setSavedCourseId(newCourse.id);
      toast.success(isEn ? "Lecture saved as course to your dashboard! 📚" : "تم حفظ المحاضرة ككورس في لوحة تحكمك! 📚");
    } catch (err) {
      console.error("Save course error:", err);
      toast.error(isEn ? "Failed to save course to database" : "فشل حفظ الكورس في قاعدة البيانات");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleSaveToQuizzes = async () => {
    if (!result?.quiz?.length) return;
    setSavingQuiz(true);
    try {
      const newQuiz = await saveYouTubeAsQuiz({
        title: result.title,
        questions: result.quiz,
        videoId: result.videoId,
      });
      setSavedQuizId(newQuiz.id);
      toast.success(isEn ? "Question bank saved to your quizzes list! 🧠" : "تم حفظ بنك الأسئلة في قائمة الكويزات! 🧠");
    } catch (err) {
      console.error("Save quiz error:", err);
      toast.error(isEn ? "Failed to save quiz" : "فشل حفظ الكويز");
    } finally {
      setSavingQuiz(false);
    }
  };

  const calculateScore = () => {
    if (!result?.quiz) return { score: 0, total: 0, pct: 0 };
    let correct = 0;
    result.quiz.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      const correctAns = String(q.correctAnswer || "A").trim().toUpperCase();
      if (userAns && userAns.toUpperCase().startsWith(correctAns)) {
        correct++;
      }
    });
    return {
      score: correct,
      total: result.quiz.length,
      pct: Math.round((correct / result.quiz.length) * 100),
    };
  };

  const handlePrintMedicalGuide = () => {
    try {
      const guideEl = document.getElementById("printable-medical-guide");
      if (!guideEl) {
        window.print();
        return;
      }

      const printWin = window.open("", "_blank");
      if (!printWin) {
        // Fallback if popup blocker intervenes
        window.print();
        return;
      }

      const contentHtml = guideEl.innerHTML;
      const title = result?.title || customTitle || (isEn ? "Comprehensive Clinical Medical Summary" : "الملخص الطبي السريري الشامل");

      printWin.document.open();
      printWin.document.write(`<!DOCTYPE html>
<html lang="${isEn ? "en" : "ar"}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - ${isEn ? "A4 Print" : "طباعة A4"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Cairo', 'Plus Jakarta Sans', -apple-system, sans-serif;
      font-size: 13.5px;
      line-height: 1.8;
      width: 100% !important;
      max-width: 100% !important;
    }
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .print-header h1 {
      margin: 0 0 4px 0;
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
    }
    .print-header p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .brand-badge {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 900;
      font-size: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .paired-part-card {
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 18px;
      margin-bottom: 20px;
      background: #ffffff;
    }
    .part-header-pill {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 5px 12px;
      border-radius: 7px;
      font-weight: 900;
      font-size: 13.5px;
      margin-bottom: 12px;
    }
    .arabic-walkthrough-pill {
      display: inline-block;
      background: #1e293b;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 12.5px;
      margin-bottom: 8px;
    }
    .bidi-ltr {
      direction: ltr !important;
      text-align: left !important;
      font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif !important;
    }
    .bidi-ltr ul, .bidi-ltr ol {
      padding-left: 22px !important;
      padding-right: 0 !important;
    }
    .bidi-rtl {
      direction: rtl !important;
      text-align: right !important;
      font-family: 'Cairo', sans-serif !important;
    }
    .bidi-rtl ul, .bidi-rtl ol {
      padding-right: 22px !important;
      padding-left: 0 !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      border: 1px solid #94a3b8;
      padding: 8px 10px;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      color: #1e293b;
    }
    mark, .hl-yellow {
      background-color: #fef08a !important;
      color: #000000 !important;
      font-weight: 800 !important;
      padding: 2px 5px;
      border-radius: 4px;
      border-bottom: 2px solid #ca8a04;
    }
    mark.hl-green, .hl-green {
      background-color: #bbf7d0 !important;
      color: #000000 !important;
      font-weight: 800 !important;
      padding: 2px 5px;
      border-radius: 4px;
      border-bottom: 2px solid #16a34a;
    }
    mark.hl-red, .hl-red {
      background-color: #fecaca !important;
      color: #000000 !important;
      font-weight: 800 !important;
      padding: 2px 5px;
      border-radius: 4px;
      border-bottom: 2px solid #dc2626;
    }
    mark.hl-cyan, .hl-cyan {
      background-color: #bae6fd !important;
      color: #000000 !important;
      font-weight: 800 !important;
      padding: 2px 5px;
      border-radius: 4px;
      border-bottom: 2px solid #0284c7;
    }
    mark.hl-orange, .hl-orange {
      background-color: #fed7aa !important;
      color: #000000 !important;
      font-weight: 800 !important;
      padding: 2px 5px;
      border-radius: 4px;
      border-bottom: 2px solid #ea580c;
    }
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    blockquote {
      border-right: 4px solid #7c3aed;
      background: #faf5ff;
      padding: 10px 14px;
      margin: 12px 0;
      border-radius: 6px;
    }
    strong {
      color: #000000;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>${isEn ? "Dual Clinical Medical Summary — Black Fighters Academy" : "الملخص الإكلينيكي الطبي المزدوج — أكاديمية Black Fighters"}</p>
    </div>
    <div class="brand-badge">BLACK FIGHTERS MED</div>
  </div>
  <div class="print-body">
    ${contentHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  <\/script>
</body>
</html>`);
      printWin.document.close();
    } catch (err) {
      console.error("Print popup failed, falling back to in-page print:", err);
      window.print();
    }
  };

  return (
    <div dir={dir || (isEn ? "ltr" : "rtl")} className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-slate-100">
      {/* Header — was a red-gradient "MASTER AI" console with three blurred orbs, a
          giant watermark logo and five coloured feature pills. Students don't need
          a control room; they need one clear promise and the input. Now: a plain
          card, the platform accent, and a single line of what they get. */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-[#0E1117] p-6 sm:p-7">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#131820] text-primary">
                <Youtube className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {isEn ? "YouTube lecture" : "محاضرة يوتيوب"}
                </p>
                <h1 className="text-xl font-black leading-snug text-foreground sm:text-2xl">
                  {isEn ? "Turn a lecture into notes" : "حوّل المحاضرة لمذكرة"}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-[13.5px] leading-7 text-muted-foreground">
              {isEn
                ? "Paste the link: you get structured notes and an MCQ bank you can study from — no setup."
                : "الصق الرابط وتاخد مذكرة مرتبة + بنك أسئلة تذاكر منه — من غير أي إعداد."}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-[#131820] px-3.5 py-2.5 text-xs font-bold text-amber-300">
              <Coins className="h-4 w-4" />
              <span>{isEn ? `${userCredits ?? 0} credits` : `رصيدك: ${userCredits ?? 0} كريدت`}</span>
            </div>
            <Link
              to="/subscriptions"
              className="rounded-xl border border-border px-3.5 py-2.5 text-center text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {isEn ? "Top up" : "شحن الكريدتس"}
            </Link>
            <button
              type="button"
              onClick={handleQuickPasteDemo}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <PlayCircle className="h-4 w-4" />
              {isEn ? "Try an example" : "جرّب مثال"}
            </button>
          </div>
        </div>
      </header>

      {/* Input Form */}
      {!result && (
        <form onSubmit={handleSynthesize} className="glass-card border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 bg-[#0a0d18]/90 overflow-hidden max-w-full">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                {isEn ? "YouTube Lecture URL" : "رابط فيديو المحاضرة على YouTube"} <span className="text-red-400">*</span>
              </label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={isEn ? "https://youtu.be/... or https://www.youtube.com/watch?v=..." : "https://youtu.be/... أو https://www.youtube.com/watch?v=..."}
                className="bg-white/[0.03] border-white/10 text-white font-mono text-sm py-5 focus-visible:ring-primary/50"
                dir="ltr"
                disabled={isProcessing}
              />
            </div>

            {/* Optional Time Range Slice */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{isEn ? "Select lecture time slice (Optional)" : "تحديد مقطع زمني معين من المحاضرة (اختياري)"}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {isEn ? "e.g., 05:00 to 45:00 or in seconds (300)" : "مثال: 05:00 إلى 45:00 أو بالثواني (300)"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{isEn ? "Start Time:" : "وقت البدء (Start Time):"}</label>
                  <Input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder={isEn ? "00:00 or 120" : "00:00 أو 120"}
                    dir="ltr"
                    className="bg-white/[0.03] border-white/10 text-white font-mono text-xs py-4 text-center placeholder:text-slate-600"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{isEn ? "End Time:" : "وقت الانتهاء (End Time):"}</label>
                  <Input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder={isEn ? "e.g., 25:30" : "مثال: 25:30"}
                    dir="ltr"
                    className="bg-white/[0.03] border-white/10 text-white font-mono text-xs py-4 text-center placeholder:text-slate-600"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Output Mode Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2.5">
                {isEn ? "Required Lecture Output Mode" : "نوع المخرجات المطلوبة من المحاضرة"} <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("both")}
                  disabled={isProcessing}
                  className={`p-4 rounded-2xl border text-start transition-colors flex flex-col justify-between gap-3 ${
                    mode === "both"
                      ? "bg-red-500/15 border-red-500 text-white shadow-lg shadow-red-500/10 ring-1 ring-red-500"
                      : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    {mode === "both" && <CheckCircle2 className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white mb-1">
                      {isEn ? "Notes + Quiz Together ⚡" : "المذكرة + الكويز معاً ⚡"}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isEn
                        ? "Clinical lecture notes + English Core Notes + Interactive MCQ Bank."
                        : "شرح سريري كامل بالعربي + Core Notes إنجليزي + بنك أسئلة MCQ."}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("summary_only")}
                  disabled={isProcessing}
                  className={`p-4 rounded-2xl border text-start transition-colors flex flex-col justify-between gap-3 ${
                    mode === "summary_only"
                      ? "bg-sky-500/15 border-sky-500 text-white shadow-lg shadow-sky-500/10 ring-1 ring-sky-500"
                      : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    {mode === "summary_only" && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white mb-1">
                      {isEn ? "Clinical Notes Only 📑" : "ملخص سريري فقط 📑"}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isEn
                        ? "100% focus on reference notes and comparison tables without quizzes."
                        : "تركيز 100% على المرجع والتلخيص والجداول بدون توليد أسئلة."}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("quiz_only")}
                  disabled={isProcessing}
                  className={`p-4 rounded-2xl border text-start transition-colors flex flex-col justify-between gap-3 ${
                    mode === "quiz_only"
                      ? "bg-purple-500/15 border-purple-500 text-white shadow-lg shadow-purple-500/10 ring-1 ring-purple-500"
                      : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    {mode === "quiz_only" && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white mb-1">
                      {isEn ? "Quiz & Questions Only 🧠" : "كويز وأسئلة فقط 🧠"}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {isEn
                        ? "Generate high-yield clinical MCQs (up to 100) without summary."
                        : "توليد بنك أسئلة سريرية مكثفة (حتى 100 سؤال) بدون ملخص."}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                  {isEn ? "Custom Notes Title (Optional)" : "عنوان مخصص للمذكرة (اختياري)"}
                </label>
                <Input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={isEn ? "e.g., ABCDE Critical Care Assessment & Resuscitation" : "مثال: منهجية تقييم وإنعاش الحالات الحرجة ABCDE"}
                  className="bg-white/[0.03] border-white/10 text-white text-sm py-5"
                  disabled={isProcessing}
                />
              </div>

              <div>
                {mode !== "summary_only" ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                        {isEn ? "Number of Quiz MCQs — Up to 100 questions 🎯" : "عدد أسئلة الكويز (MCQs) — حتى 100 سؤال 🎯"}
                      </label>
                      <span className="text-xs font-mono font-bold text-red-400">
                        {isEn ? `${quizCount} Questions` : `${quizCount} سؤال`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {[5, 10, 20, 30, 50, 75, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setQuizCount(num)}
                          disabled={isProcessing}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                            Number(quizCount) === num
                              ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                              : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 mr-auto sm:mr-0">
                        <Input
                          type="number"
                          min={3}
                          max={100}
                          value={quizCount}
                          onChange={(e) => setQuizCount(Math.max(3, Math.min(100, Number(e.target.value) || 3)))}
                          disabled={isProcessing}
                          className="w-20 h-8 bg-white/[0.03] border-white/20 text-white font-mono font-bold text-xs rounded-lg"
                        />
                        <span className="text-[10px] text-slate-400">{isEn ? "Qs" : "سؤال"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <BookOpen className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>
                        {isEn ? (
                          <>
                            <strong>Notes Only</strong> Mode: AI will focus 100% on comprehensive medical reference and comparison tables without generating questions.
                          </>
                        ) : (
                          <>
                            وضع <strong>ملخص فقط</strong>: سيتم تركيز كامل الذكاء الاصطناعي على بناء المرجع الطبي الشامل وجداول المقارنة دون توليد أسئلة.
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {userCredits < estimatedCredits && !isAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <div className="flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isEn
                    ? `Your current balance (${userCredits} Credits) is lower than required (${estimatedCredits} Credits).`
                    : `رصيدك الحالي (${userCredits} كريدت) أقل من تكلفة المحاضرة المطلوبة (${estimatedCredits} كريدت).`}
                </span>
              </div>
              <Link
                to="/subscriptions"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs text-center transition-colors shrink-0 shadow-md"
              >
                {isEn ? "Recharge Credits ⚡" : "شحن كريدتس لتشغيل المحاضرة ⚡"}
              </Link>
            </div>
          )}

          <Button
            type="submit"
            disabled={isProcessing || !url.trim()}
            className="w-full h-auto min-h-[56px] py-3.5 px-4 sm:px-6 text-sm sm:text-base font-black whitespace-normal break-words leading-relaxed bg-primary hover:brightness-105 text-[#03150c] rounded-2xl gap-2 cursor-pointer transition"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2.5 text-center flex-wrap w-full py-1">
                <Loader2 className="w-5 h-5 animate-spin shrink-0 text-white" />
                <span className="break-words text-xs sm:text-sm md:text-base">
                  {stepLabels[processStep] || (isEn ? "Processing Clinical Analysis..." : "جاري المعالجة السريرية...")}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-center w-full py-1">
                <div className="inline-flex items-center gap-2">
                  <Sparkles className="w-5 h-5 shrink-0 text-amber-300" />
                  <span className="break-words text-xs sm:text-sm md:text-base">
                    {isEn
                      ? "Start AI Extraction & Synthesis"
                      : "بدء سحب وتحليل المحاضرة بالذكاء الاصطناعي"}
                  </span>
                </div>
                <span className="inline-flex items-center text-xs sm:text-sm font-semibold opacity-95 bg-black/35 border border-white/10 px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
                  {isEn ? `(${estimatedCredits} Credits ⚡)` : `(مطلوب: ${estimatedCredits} كريدت ⚡)`}
                </span>
              </div>
            )}
          </Button>
        </form>
      )}

      {/* Stepper Progress Card while processing */}
      {isProcessing && (
        <div className="glass-card border border-red-500/30 rounded-3xl p-6 sm:p-8 bg-[#0b0e1b]/95 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
              <span>{isEn ? "Autonomous Clinical Analysis Engine Active" : "محرك التحليل الطبي الذاتي نشط"}</span>
            </h3>
            <span className="text-xs font-mono text-red-400 font-bold">
              {Math.min(100, Math.round(((processStep + 1) / 4) * 100))}%
            </span>
          </div>

          <div className="space-y-3">
            {stepLabels.map((label, idx) => {
              const isPast = idx < processStep;
              const isCurrent = idx === processStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors duration-300 ${
                    isPast
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : isCurrent
                      ? "bg-red-500/15 border-red-500/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      : "bg-white/[0.01] border-white/5 text-slate-500"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                      isPast
                        ? "bg-emerald-500 text-black"
                        : isCurrent
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Result Workspace */}
      {result && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="glass-card border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 bg-[#0d1020]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResult(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title={isEn ? "New Video" : "فيديو جديد"}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <h2 className="font-extrabold text-sm sm:text-base text-white truncate max-w-md">
                {result.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeTab === "notes"
                      ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isEn ? "Notes" : "المذكرة"}</span>
                </button>
                <button
                  onClick={() => setActiveTab("quiz")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeTab === "quiz"
                      ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>{isEn ? `Quiz (${result.quiz?.length || 0})` : `الكويز (${result.quiz?.length || 0})`}</span>
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    activeTab === "chat"
                      ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isEn ? "AI Chat & Refine" : "الشات والتعديل"}</span>
                </button>
              </div>

              {/* Save & Print Actions */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveToCourses}
                disabled={savingCourse || !!savedCourseId}
                className="text-xs font-bold gap-1.5 border-white/10 bg-white/5 hover:bg-white/10"
              >
                {savingCourse ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedCourseId ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
                <span>{savedCourseId ? (isEn ? "Saved as Course" : "تم الحفظ ككورس") : (isEn ? "Save to Courses" : "حفظ في كورساتي")}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveToQuizzes}
                disabled={savingQuiz || !!savedQuizId || !result.quiz?.length}
                className="text-xs font-bold gap-1.5 border-white/10 bg-white/5 hover:bg-white/10"
              >
                {savingQuiz ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedQuizId ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Brain className="w-3.5 h-3.5" />
                )}
                <span>{savedQuizId ? (isEn ? "Saved as Quiz" : "تم حفظ الكويز") : (isEn ? "Save to Quizzes" : "حفظ في الكويزات")}</span>
              </Button>

              <Button
                size="sm"
                onClick={handlePrintMedicalGuide}
                className="text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isEn ? "Print PDF" : "طباعة PDF"}</span>
              </Button>
            </div>
          </div>

          {/* TAB 1: Medical Study Reference with Bi-Directional Isolation */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              {result.markdown ? (
                <>
                  {/* Document Control Toolbar */}
                  <div className="glass-card border border-white/10 rounded-2xl p-3 sm:p-4 bg-[#0a0d1b] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">{isEn ? "Document Theme:" : "مظهر المذكرة:"}</span>
                      {/* Theme Toggle Pills */}
                      <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setDocTheme("dark")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            docTheme === "dark"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Moon className="w-3.5 h-3.5" />
                          <span>{isEn ? "Dark Mode" : "الوضع الداكن"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocTheme("light")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            docTheme === "light"
                              ? "bg-amber-400 text-black shadow-md shadow-amber-400/30 font-black"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          <Sun className="w-3.5 h-3.5" />
                          <span>{isEn ? "Medical White Paper 📄" : "الورق الطبي الأبيض 📄"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handlePrintMedicalGuide}
                        className="text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                        title={isEn ? "Print notes only in A4 format" : "طباعة المذكرة الطبية فقط بتنسيق A4 كامل بدون هوامش مفقودة"}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isEn ? "Print Notes (PDF)" : "طباعة المذكرة (PDF)"}</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setIsChatDrawerOpen(true)}
                        className="text-xs font-bold gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isEn ? "AI Co-Pilot Refiner" : "مساعد التعديل الذكي"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Printable Medical Reference Document */}
                  <div
                    id="printable-medical-guide"
                    className={`rounded-3xl transition-colors duration-300 p-4 sm:p-8 ${
                      docTheme === "light"
                        ? "bg-white text-slate-900 border border-slate-300 shadow-2xl medical-doc-light"
                        : "bg-[#060813] text-slate-100 border border-white/10 shadow-2xl medical-doc-dark"
                    }`}
                  >
                    <BidiMarkdownViewer markdown={result.markdown} theme={docTheme} isEn={isEn} />
                  </div>

                  {/* Docked Quick AI Co-Pilot Refiner Bar */}
                  <div className="glass-card border border-red-500/30 rounded-2xl p-4 bg-[#0a0d1d]/95 backdrop-blur-md shadow-2xl space-y-3 sticky bottom-4 z-20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-red-400 animate-pulse" />
                        <span className="text-xs font-extrabold text-white">{isEn ? "Live Clinical AI Co-Pilot:" : "المساعد السريري المباشر للتعديل (AI Co-Pilot):"}</span>
                        <span className="text-[11px] text-slate-400 hidden md:inline">
                          {isEn ? "Request any edit or addition and notes will update live" : "اطلب أي تعديل أو إضافة في المذكرة وسيتم تحديثها فوراً"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChatDrawerOpen(true)}
                        className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{isEn ? "Open Side Chat" : "فتح الشات الجانبي"}</span>
                      </button>
                    </div>

                    {/* Quick Action Prompt Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {[
                        {
                          label: isEn ? "📊 Add Comparison Table" : "📊 إضافة جدول مقارنة سريري",
                          prompt: isEn ? "Add a comprehensive, precise clinical comparison table between conditions and differentials mentioned in the lecture" : "أضف جدول مقارنة شامل ودقيق بين الحالات والتشخيصات المذكورة في المحاضرة"
                        },
                        {
                          label: isEn ? "💉 Emergency Dosages" : "💉 حساب وتلخيص جرعات الطوارئ",
                          prompt: isEn ? "Add a dedicated section detailing emergency dosages and resuscitation calculations for critical cases mentioned" : "أضف قسماً خاصاً بحساب وتفصيل جرعات أدوية الطوارئ والإنعاش للحالات الحرجة المذكورة"
                        },
                        {
                          label: isEn ? "⚠️ Exam Pitfalls" : "⚠️ فخاخ الامتحان والأخطاء القاتلة",
                          prompt: isEn ? "Add a prominent section highlighting Exam Pitfalls and common fatal emergency mistakes" : "أضف قسماً بارزاً يوضح فخاخ الامتحان (Exam Pitfalls) والأخطاء القاتلة الشائعة في الطوارئ"
                        },
                        {
                          label: isEn ? "🧠 Simplify & Deepen Concepts" : "🧠 تبسيط وتعميق الشرح بالعربي",
                          prompt: isEn ? "Simplify the clinical explanation and clarify underlying pathophysiology for easier retention" : "قم بتبسيط الشرح الإكلينيكي بالعربي وتوضيح الربط الفيزيولوجي أكثر لسهولة الحفظ"
                        },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isModifying}
                          onClick={async () => {
                            setChatMessages((prev) => [...prev, { sender: "user", text: chip.prompt }]);
                            setIsModifying(true);
                            try {
                              const updated = await modifyYouTubeLecture({
                                currentMarkdown: result.markdown,
                                promptInstruction: chip.prompt,
                              });
                              setResult((prev) => ({ ...prev, markdown: updated }));
                              setChatMessages((prev) => [
                                ...prev,
                                { sender: "ai", text: isEn ? `Edit applied successfully, Doctor! (${chip.label}) ✅` : `تم تطبيق التعديل بنجاح يا دكتور! (${chip.label}) ✅` },
                              ]);
                              toast.success(isEn ? "Notes updated successfully! ✨" : "تم تحديث المذكرة بنجاح! ✨");
                            } catch (e) {
                              toast.error(e.message || (isEn ? "Modification failed" : "فشل التعديل"));
                            } finally {
                              setIsModifying(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 border border-white/10 text-slate-300 hover:text-white transition-colors text-[11px] font-medium disabled:opacity-50 cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Inline Prompt Input */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!chatInput.trim() || isModifying) return;
                        const prompt = chatInput.trim();
                        setChatInput("");
                        setChatMessages((prev) => [...prev, { sender: "user", text: prompt }]);
                        setIsModifying(true);
                        try {
                          const updated = await modifyYouTubeLecture({
                            currentMarkdown: result.markdown,
                            promptInstruction: prompt,
                          });
                          setResult((prev) => ({ ...prev, markdown: updated }));
                          setChatMessages((prev) => [
                            ...prev,
                            { sender: "ai", text: isEn ? `Your request has been applied, Doctor! Updated notes: "${prompt.slice(0, 45)}..." ✅` : `تم تطبيق طلبك بنجاح يا دكتور! تم تحديث المذكرة بالكامل: "${prompt.slice(0, 45)}..." ✅` },
                          ]);
                          toast.success(isEn ? "Notes updated successfully! ✨" : "تم تحديث المذكرة بنجاح! ✨");
                        } catch (err) {
                          toast.error(err.message || (isEn ? "Modification failed" : "فشل التعديل"));
                        } finally {
                          setIsModifying(false);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={isEn ? "Enter your prompt for AI (e.g. Add comparison table, calculate dosage...)" : "اكتب طلبك للذكاء الاصطناعي (مثال: أضف جدول مقارنة لكذا، احسب جرعة كذا، عدل كذا...)"}
                        className="bg-white/[0.04] border-white/15 text-white text-xs py-4 flex-1 focus-visible:ring-primary/50"
                        disabled={isModifying}
                      />
                      <Button
                        type="submit"
                        disabled={isModifying || !chatInput.trim()}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 text-xs font-bold gap-1.5 shrink-0"
                      >
                        {isModifying ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{isEn ? "Apply Edit" : "تطبيق التعديل"}</span>
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="glass-card border border-white/10 rounded-3xl p-12 text-center bg-[#090d1a] space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Brain className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {isEn ? "Quiz Only Generated (Quiz Mode) 🧠" : "تم توليد بنك الأسئلة فقط (وضع كويز فقط) 🧠"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {isEn
                      ? "You selected Quiz Only mode. The question bank is ready in the next tab."
                      : "لقد اخترت وضع توليد الكويز فقط بدون تلخيص. بنك الأسئلة جاهز بالكامل في التبويب التالي."}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("quiz")}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    <span>{isEn ? `Go to Question Bank (${result.quiz?.length || 0} Qs)` : `الانتقال لبنك الأسئلة (${result.quiz?.length || 0} سؤال)`}</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Interactive Quiz View */}
          {activeTab === "quiz" && (
            <div className="space-y-6">
              {(!result.quiz || result.quiz.length === 0) ? (
                <div className="glass-card border border-white/10 rounded-3xl p-12 text-center bg-[#090d1a] space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {isEn ? "Notes Only Generated (Notes Mode) 📑" : "تم توليد المذكرة فقط (وضع ملخص فقط) 📑"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    {isEn
                      ? "You selected Notes Only mode to optimize focus on clinical reference."
                      : "لقد اخترت وضع توليد المذكرة والتلخيص فقط بدون بنك أسئلة، وذلك لتوفير الموارد والتركيز على المرجع السريري."}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("notes")}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{isEn ? "View Clinical Notes" : "عرض المذكرة والمرجع السريري"}</span>
                  </Button>
                </div>
              ) : (
                <>
                  {showQuizResults && (
                    <div className="glass-card border border-emerald-500/30 rounded-3xl p-6 bg-emerald-950/20 text-center">
                      <h3 className="text-xl font-black text-emerald-400 mb-1">
                        {isEn
                          ? `Your Score: ${calculateScore().score} / ${calculateScore().total} (${calculateScore().pct}%)`
                          : `نتيجتك: ${calculateScore().score} من ${calculateScore().total} (${calculateScore().pct}%)`}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {calculateScore().pct >= 80
                          ? (isEn ? "Excellent clinical performance, Doctor! Complete mastery of the topic 🎯" : "أداء سريري ممتاز جداً يا دكتور! استيعاب كامل للحالة الحرجة 🎯")
                          : (isEn ? "Good review! Focus on exam pitfalls and fatal traps 🩺" : "مراجعة جيدة، ركز على التحذيرات القاتلة وفخاخ الامتحان 🩺")}
                      </p>
                    </div>
                  )}

              <div className="space-y-4">
                {(result.quiz || []).map((q, qIndex) => {
                  const userAns = selectedAnswers[qIndex];
                  const correctAnsLetter = String(q.correctAnswer || "A").trim().toUpperCase();

                  return (
                    <div
                      key={qIndex}
                      className="glass-card border border-white/10 rounded-2xl p-6 bg-[#090d1a] space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {qIndex + 1}
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-white leading-relaxed">
                          {sanitizeMedicalLatex(q.questionText)}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 pt-2">
                        {(q.options || []).map((opt, optIndex) => {
                          const optionLetter = ["A", "B", "C", "D", "E"][optIndex];
                          const isSelected = userAns === optionLetter;
                          const isCorrect = optionLetter === correctAnsLetter;

                          let btnStyle = "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] text-slate-300";
                          if (showQuizResults) {
                            if (isCorrect) {
                              btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                            } else if (isSelected && !isCorrect) {
                              btnStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                            }
                          } else if (isSelected) {
                            btnStyle = "bg-red-500/20 border-red-500 text-red-300 font-bold";
                          }

                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => {
                                if (!showQuizResults) {
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [qIndex]: optionLetter,
                                  }));
                                }
                              }}
                              className={`p-3.5 rounded-xl border text-start text-xs sm:text-sm transition-colors flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{sanitizeMedicalLatex(opt)}</span>
                              {showQuizResults && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {showQuizResults && q.explanation && (
                        <div className="mt-3 p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-200 leading-relaxed">
                          <strong className="block mb-1 text-cyan-300 font-bold">
                            {isEn ? "💡 Clinical Explanation:" : "💡 التفسير السريري:"}
                          </strong>
                          {sanitizeMedicalLatex(q.explanation)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  onClick={() => setShowQuizResults((prev) => !prev)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6"
                >
                  {showQuizResults
                    ? (isEn ? "Hide Answers & Retry" : "إخفاء الإجابات وإعادة المحاولة")
                    : (isEn ? "Grade Quiz & Show Explanations" : "تصحيح الكويز وعرض الإجابات والتفسير")}
                </Button>
              </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: AI Chat Refiner Drawer */}
          {activeTab === "chat" && (
            <div className="glass-card border border-white/10 rounded-3xl p-6 bg-[#0a0d1b] space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-400" />
                  <span>{isEn ? "Live Clinical AI Refiner" : "مساعد التعديل السريري الحي (Live AI Refiner)"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn
                    ? "Ask AI to edit any part of the notes, add comparison tables, or explain topics in greater depth — updates live."
                    : "اطلب من الذكاء الاصطناعي تعديل أي جزء في المذكرة، إضافة جدول مقارنة، أو شرح جزئية بتفصيل أكثر، وهيحدث المذكرة لايف."}
                </p>
              </div>

              {/* Messages Container */}
              <div className="space-y-4 max-h-[460px] overflow-y-auto p-2">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-red-600 text-white rounded-bl-none shadow-md shadow-red-600/20"
                          : "bg-white/[0.05] border border-white/10 text-slate-200 rounded-br-none"
                      }`}
                    >
                      {sanitizeMedicalLatex(msg.text)}
                    </div>
                  </div>
                ))}
                {isModifying && (
                  <div className="flex justify-start">
                    <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      <span>{isEn ? "Modifying notes & restructuring content..." : "جاري تعديل المذكرة وإعادة صياغة الهيكل..."}</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendModification} className="flex gap-2">
                <Input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g., Add comparison table for shock stages, or calculate adrenaline dosage..."
                      : "مثال: أضف جدول مقارنة لعلامات الصدمة، أو احسب جرعة الأدرينالين..."
                  }
                  className="bg-white/[0.03] border-white/10 text-white text-xs sm:text-sm py-5"
                  disabled={isModifying}
                />
                <Button
                  type="submit"
                  disabled={isModifying || !chatInput.trim()}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Full AI Refiner Drawer */}
      {isChatDrawerOpen && result && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            dir={dir}
            className={`w-full sm:max-w-md md:max-w-lg bg-[#0a0d1b] ${
              isEn ? "border-l" : "border-r sm:border-l"
            } border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300`}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isEn ? "Live Clinical AI Refiner 🩺⚡" : "شات التعديل السريري الحي 🩺⚡"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn ? "Edit notes, add comparison tables & calculations" : "تعديل المذكرة وإضافة جداول وحسابات"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-red-600 text-white rounded-bl-none shadow-md shadow-red-600/20"
                        : "bg-white/[0.05] border border-white/10 text-slate-200 rounded-br-none"
                    }`}
                  >
                    {sanitizeMedicalLatex(msg.text)}
                  </div>
                </div>
              ))}
              {isModifying && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                    <span>{isEn ? "Modifying & restructuring content..." : "جاري التعديل وإعادة الهيكلة..."}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Quick Chips */}
            <div className="p-3 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-1.5">
              {[
                {
                  label: isEn ? "📊 Clinical Comparison" : "📊 مقارنة سريرية",
                  prompt: isEn ? "Add a precise clinical comparison table between the mentioned conditions" : "أضف جدول مقارنة سريري دقيق بين الحالات المذكورة",
                },
                {
                  label: isEn ? "💉 Emergency Dosages" : "💉 جرعات الطوارئ",
                  prompt: isEn ? "Add a dedicated section detailing emergency dosages and resuscitation calculations" : "أضف قسم حساب وتفصيل جرعات أدوية الطوارئ والإنعاش",
                },
                {
                  label: isEn ? "⚠️ Exam Pitfalls" : "⚠️ فخاخ الامتحان",
                  prompt: isEn ? "Add a prominent section highlighting Exam Pitfalls and common fatal emergency traps" : "أضف قسماً بارزاً يوضح فخاخ الامتحان والأخطاء القاتلة",
                },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isModifying}
                  onClick={async () => {
                    setChatMessages((prev) => [...prev, { sender: "user", text: chip.prompt }]);
                    setIsModifying(true);
                    try {
                      const updated = await modifyYouTubeLecture({
                        currentMarkdown: result.markdown,
                        promptInstruction: chip.prompt,
                      });
                      setResult((prev) => ({ ...prev, markdown: updated }));
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          sender: "ai",
                          text: isEn
                            ? `Edit applied successfully, Doctor! (${chip.label}) ✅`
                            : `تم تطبيق التعديل بنجاح يا دكتور! (${chip.label}) ✅`,
                        },
                      ]);
                      toast.success(isEn ? "Notes updated successfully! ✨" : "تم تحديث المذكرة بنجاح! ✨");
                    } catch (e) {
                      toast.error(e.message || (isEn ? "Modification failed" : "فشل التعديل"));
                    } finally {
                      setIsModifying(false);
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Drawer Footer Input */}
            <form onSubmit={handleSendModification} className="p-4 border-t border-white/10 bg-[#070914] flex gap-2">
              <Input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  isEn
                    ? "Type your request (e.g. Add comparison table, adjust...)"
                    : "اكتب طلبك (مثال: أضف جدول مقارنة، عدل كذا...)"
                }
                className="bg-white/[0.03] border-white/10 text-white text-xs py-4 flex-1"
                disabled={isModifying}
              />
              <Button
                type="submit"
                disabled={isModifying || !chatInput.trim()}
                className="bg-red-600 hover:bg-red-500 text-white px-4 text-xs font-bold"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}
  </div>
);
}
