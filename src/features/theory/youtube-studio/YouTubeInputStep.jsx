import React from "react";
import { Link } from "react-router-dom";
import { Clock, Layers, BookOpen, Brain, CheckCircle2, AlertCircle, Coins, Sparkles, Loader2 } from "@/components/ui/animatedIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function YouTubeInputStep({
  url,
  setUrl,
  customTitle,
  setCustomTitle,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  mode,
  setMode,
  quizCount,
  setQuizCount,
  isProcessing,
  processStep,
  stepLabels,
  error,
  userCredits,
  estimatedCredits,
  isAdmin,
  onSubmit,
  isEn,
}) {
  return (
    <form onSubmit={onSubmit} className="border border-border rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 bg-card max-w-full">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">
            {isEn ? "YouTube Lecture URL" : "رابط فيديو المحاضرة على YouTube"} <span className="text-destructive">*</span>
          </label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isEn ? "https://youtu.be/... or https://www.youtube.com/watch?v=..." : "https://youtu.be/... أو https://www.youtube.com/watch?v=..."}
            className="bg-muted border-border text-foreground font-mono text-sm py-5 focus-visible:ring-primary/50"
            dir="ltr"
            disabled={isProcessing}
          />
        </div>

        {/* Optional Time Range Slice */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{isEn ? "Select lecture time slice (Optional)" : "تحديد مقطع زمني معين من المحاضرة (اختياري)"}</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {isEn ? "e.g., 05:00 to 45:00 or in seconds (300)" : "مثال: 05:00 إلى 45:00 أو بالثواني (300)"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{isEn ? "Start Time:" : "وقت البدء (Start Time):"}</label>
              <Input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder={isEn ? "00:00 or 120" : "00:00 أو 120"}
                dir="ltr"
                className="bg-muted border-border text-foreground font-mono text-xs py-4 text-center placeholder:text-muted-foreground"
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">{isEn ? "End Time:" : "وقت الانتهاء (End Time):"}</label>
              <Input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder={isEn ? "e.g., 25:30" : "مثال: 25:30"}
                dir="ltr"
                className="bg-muted border-border text-foreground font-mono text-xs py-4 text-center placeholder:text-muted-foreground"
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {/* Output Mode Selector */}
        <div>
          <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2.5">
            {isEn ? "Required Lecture Output Mode" : "نوع المخرجات المطلوبة من المحاضرة"} <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setMode("both")}
              disabled={isProcessing}
              className={`p-4 rounded-2xl border text-start transition-colors flex flex-col justify-between gap-3 ${
                mode === "both"
                  ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                {mode === "both" && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground mb-1">
                  {isEn ? "Notes + Quiz Together ⚡" : "المذكرة + الكويز معاً ⚡"}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
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
                  ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                {mode === "summary_only" && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground mb-1">
                  {isEn ? "Clinical Notes Only 📑" : "ملخص سريري فقط 📑"}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
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
                  ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                  : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                {mode === "quiz_only" && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <div>
                <h4 className="font-black text-sm text-foreground mb-1">
                  {isEn ? "Quiz & Questions Only 🧠" : "كويز وأسئلة فقط 🧠"}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
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
            <label className="block text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">
              {isEn ? "Custom Notes Title (Optional)" : "عنوان مخصص للمذكرة (اختياري)"}
            </label>
            <Input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={isEn ? "e.g., ABCDE Critical Care Assessment & Resuscitation" : "مثال: منهجية تقييم وإنعاش الحالات الحرجة ABCDE"}
              className="bg-muted border-border text-foreground text-sm py-5"
              disabled={isProcessing}
            />
          </div>

          <div>
            {mode !== "summary_only" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                    {isEn ? "Number of Quiz MCQs — Up to 100 questions 🎯" : "عدد أسئلة الكويز (MCQs) — حتى 100 سؤال 🎯"}
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                        quizCount === num
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground"
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
                      className="w-20 h-8 bg-muted border-border text-foreground font-mono font-bold text-xs rounded-lg"
                    />
                    <span className="text-[10px] text-muted-foreground">{isEn ? "Qs" : "سؤال"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center p-3.5 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold">
          <div className="flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-amber-500 shrink-0" />
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
        className="w-full h-auto min-h-[56px] py-3.5 px-4 sm:px-6 text-sm sm:text-base font-black whitespace-normal break-words leading-relaxed bg-primary hover:opacity-95 text-primary-foreground rounded-2xl gap-2 cursor-pointer transition"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2.5 text-center flex-wrap w-full py-1">
            <Loader2 className="w-5 h-5 animate-spin shrink-0 text-primary-foreground" />
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
            <span className="inline-flex items-center text-xs sm:text-sm font-semibold opacity-95 bg-black/20 border border-white/10 px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
              {isEn ? `(${estimatedCredits} Credits ⚡)` : `(مطلوب: ${estimatedCredits} كريدت ⚡)`}
            </span>
          </div>
        )}
      </Button>
    </form>
  );
}
