import React from "react";
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Bot,
  BookOpen,
  X,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const AI_SERVICES = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: "https://chatgpt.com",
    badge: "OpenAI",
    color: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/30",
    accent: "#10a37f",
  },
  {
    id: "claude",
    name: "Claude",
    url: "https://claude.ai",
    badge: "Anthropic",
    color: "from-amber-500/20 to-orange-500/10",
    border: "border-amber-500/30",
    accent: "#d97706",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    url: "https://gemini.google.com",
    badge: "Google",
    color: "from-sky-500/20 to-blue-500/10",
    border: "border-sky-500/30",
    accent: "#38bdf8",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: "https://chat.deepseek.com",
    badge: "DeepSeek",
    color: "from-indigo-500/20 to-purple-500/10",
    border: "border-indigo-500/30",
    accent: "#6366f1",
  },
];

export function buildAiPromptWithTranscript(docModel, transcriptText) {
  const title = docModel?.meta?.title || "محاضرة جامعية";
  const subject = docModel?.meta?.subject || "عام";
  const lecturer = docModel?.meta?.lecturer || "الدكتور";

  return `══════════════════════════════════════════════════════════════════════════════
برومبت المذاكرة الأكاديمية الشاملة وصناعة ملخص Post-Mortem ⚡
══════════════════════════════════════════════════════════════════════════════
أنا طالب جامعي، وأرفقت لك الآن (أو سأرفق لك) ملف سلايدز / كتاب المحاضرة بصيغة PDF.
وفي الأسفل، أضع لك التفريغ الصوتي الحرفي الكامل لكلام الدكتور وشرحه المسجل في المحاضرة.

المطلوب منك كمعلم وأستاذ أكاديمي خبير:
1. ادمج محتوى ملف الـ PDF المرفق مع كلام الدكتور المسجل في التفريغ دون حذف أي معلومة.
2. نسّق لي مذكرة المذاكرة الأقوى بنمط Post-Mortem الأكاديمي المعتمد:
   • العناوين الرئيسية والفرعية والمصطلحات الطبية والعلمية والجرعات بالإنجليزية مع تمييزها الواضح.
   • شرح عربي وافٍ ومبسط أسفل كل نقطة، مع دمج كل كلمة وكل مثال قاله الدكتور في التسجيل.
   • صندوق مميز منقط بعنوان «قال الدكتور:» لأي نصائح امتحانية، أو تنبيهات قالها أثناء الشرح («دي هتيجي في الامتحان»، «ركزوا على دي»).
   • جداول مقارنة للمفاهيم المتشابهة لتسهيل الفهم والتمييز ليلة الامتحان.
   • قسم تجميعة الامتحان (High-Yield Pearls): تجميعة سريعة لأهم الأرقام، التشخيصات، والأدوية.
3. بنك أسئلة تدريبية: 5 إلى 10 أسئلة MCQ وحالات تطبيقية مع الإجابة النموذجية وتفسير سبب صحة أو خطأ كل اختيار.

معلومات المحاضرة:
- عنوان المحاضرة: ${title}
- المادة: ${subject}
- المحاضر: ${lecturer}

──────────────────────────────────────────────────────────────────────────────
نص التفريغ الصوتي الحرفي للشرح:
──────────────────────────────────────────────────────────────────────────────
${transcriptText}
══════════════════════════════════════════════════════════════════════════════`;
}

export default function AiStudyGuideModal({
  open,
  onClose,
  docModel,
  copied,
  onCopy,
  onConvertToCourse,
  converting = false,
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#070a12] border border-indigo-500/40 p-0 text-[#f5f7fa] rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.25)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] bg-gradient-to-r from-indigo-950/60 via-purple-950/30 to-[#070a12]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                دليل المذاكرة بالتفريغ مع الذكاء الاصطناعي ⚡
              </h2>
              <p className="text-xs text-[#9aa4b2]">
                كيف تدمج التفريغ الصوتي مع سلايدز المحاضرة لصناعة مذكرة Post-Mortem خارقة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg grid place-items-center text-[#9aa4b2] hover:text-white bg-white/[0.04] border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Main Action Banner */}
          <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-300">
                  جاهز في ثانية واحدة
                </span>
                <span className="text-xs text-white font-bold">
                  {docModel?.meta?.title || "المحاضرة الحالية"}
                </span>
              </div>
              <p className="text-xs text-[#9aa4b2] mt-1.5 leading-relaxed">
                اضغط على الزر لنسخ نص التفريغ كاملاً مدمجاً مع برومبت المذاكرة الأكاديمي المجهّز مسبقاً.
              </p>
            </div>

            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs sm:text-sm font-black shadow-lg cursor-pointer transition-transform hover:scale-[1.02] whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>تم النسخ بنجاح! جاهز للصق 📋</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ التفريغ + برومبت الـ AI</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Clear Step-by-Step Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#9aa4b2]">
              خطوات صناعة المذكرة مع الـ AI (4 خطوات بسيطة)
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Step 1 */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black">
                    1
                  </span>
                  <h4 className="text-sm font-bold text-white">انسخ التفريغ والبرومبت</h4>
                </div>
                <p className="text-xs text-[#9aa4b2] leading-relaxed">
                  اضغط زر «نسخ التفريغ + برومبت الـ AI» بالأعلى لوضع التفريغ وبرومبت التلخيص في الحافظة فوراً.
                </p>
              </div>

              {/* Step 2 */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-sky-500/20 text-sky-400 text-xs font-black">
                    2
                  </span>
                  <h4 className="text-sm font-bold text-white">افتح أي شات AI</h4>
                </div>
                <p className="text-xs text-[#9aa4b2] leading-relaxed">
                  افتح النموذج المفضل لديك (ChatGPT, Claude, Gemini, DeepSeek) أو استخدم الذكاء الداخلي.
                </p>
              </div>

              {/* Step 3 */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black">
                    3
                  </span>
                  <h4 className="text-sm font-bold text-white">أرفق ملف سلايدز المحاضرة (PDF)</h4>
                </div>
                <p className="text-xs text-[#9aa4b2] leading-relaxed">
                  ارفع ملف الـ PDF الخاص بمجلد أو سلايدز الدكتور داخل شات الـ AI مع النص المنسوخ.
                </p>
              </div>

              {/* Step 4 */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">
                    4
                  </span>
                  <h4 className="text-sm font-bold text-white">استلم مذكرتك الشاملة</h4>
                </div>
                <p className="text-xs text-[#9aa4b2] leading-relaxed">
                  سيقوم الـ AI بدمج كلام الدكتور في الشرح مع صور وسلايدز الملف وصناعة أقوى ملخص مذاكرة.
                </p>
              </div>
            </div>
          </div>

          {/* Quick AI Launch Links */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#9aa4b2]">
              روابط سريعة لفتح نماذج الذكاء الاصطناعي (بنقرة واحدة)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {AI_SERVICES.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border ${s.border} bg-white/[0.03] hover:bg-white/[0.08] transition-colors group text-center cursor-pointer`}
                >
                  <span className="text-xs font-bold text-white group-hover:text-[#19f08c] flex items-center gap-1">
                    <span>{s.name}</span>
                    <ExternalLink className="w-3 h-3 text-[#9aa4b2] group-hover:text-[#19f08c]" />
                  </span>
                  <span className="text-[10px] text-[#9aa4b2] mt-0.5">{s.badge}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Internal One-Click Conversion Option */}
          {onConvertToCourse ? (
            <div className="rounded-2xl border border-[#19f08c]/30 bg-[#19f08c]/[0.05] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-black text-[#19f08c]">
                  <Sparkles className="w-4 h-4" />
                  <span>أو ذاكر مباشرة داخل Black Fighters دون الحاجة لمواقع خارجية</span>
                </div>
                <p className="text-[11px] text-[#9aa4b2] mt-1">
                  حول هذا التفريغ إلى مقرر دراسي رسمي في حسابك مع ملخص Post-Mortem وكويزات وبطاقات FSRS تلقائياً.
                </p>
              </div>
              <button
                type="button"
                onClick={onConvertToCourse}
                disabled={converting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#19f08c] hover:bg-[#3bf59d] text-[#03150c] text-xs font-black transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <BookOpen className="w-4 h-4 fill-current" />
                <span>{converting ? "جاري إنشاء المقرر..." : "تحويل إلى مقرر وملخص الآن"}</span>
              </button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
