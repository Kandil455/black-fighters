import React from "react";
import {
  RotateCcw,
  BookOpen,
  Brain,
  MessageSquare,
  BookmarkPlus,
  CheckCircle2,
  Printer,
  Moon,
  Sun,
  Sparkles,
  MessageCircle,
  Send,
  Loader2,
} from "@/components/ui/animatedIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BidiMarkdownViewer from "./BidiMarkdownViewer";
import { sanitizeMedicalLatex } from "@/lib/youtubeService";

export default function YouTubeResultStep({
  result,
  onResetResult,
  activeTab,
  setActiveTab,
  docTheme,
  setDocTheme,
  savingCourse,
  savedCourseId,
  onSaveToCourses,
  savingQuiz,
  savedQuizId,
  onSaveToQuizzes,
  onPrintMedicalGuide,
  onOpenChatDrawer,
  isEn,
  selectedAnswers,
  setSelectedAnswers,
  showQuizResults,
  setShowQuizResults,
  calculateScore,
  chatMessages,
  chatInput,
  setChatInput,
  isModifying,
  onSendModification,
  onApplyPromptChip,
  chatEndRef,
}) {
  if (!result) return null;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="border border-border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={onResetResult}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            title={isEn ? "New Video" : "فيديو جديد"}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <h2 className="font-extrabold text-sm sm:text-base text-foreground truncate max-w-md">
            {result.title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-muted p-1 border border-border">
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === "notes"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isEn ? "Notes" : "المذكرة"}</span>
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === "quiz"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>{isEn ? `Quiz (${result.quiz?.length || 0})` : `الكويز (${result.quiz?.length || 0})`}</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === "chat"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
            onClick={onSaveToCourses}
            disabled={savingCourse || !!savedCourseId}
            className="text-xs font-bold gap-1.5 border-border bg-card hover:bg-muted"
          >
            {savingCourse ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedCourseId ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5" />
            )}
            <span>{savedCourseId ? (isEn ? "Saved as Course" : "تم الحفظ ككورس") : (isEn ? "Save to Courses" : "حفظ في كورساتي")}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onSaveToQuizzes}
            disabled={savingQuiz || !!savedQuizId || !result.quiz?.length}
            className="text-xs font-bold gap-1.5 border-border bg-card hover:bg-muted"
          >
            {savingQuiz ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedQuizId ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Brain className="w-3.5 h-3.5" />
            )}
            <span>{savedQuizId ? (isEn ? "Saved as Quiz" : "تم حفظ الكويز") : (isEn ? "Save to Quizzes" : "حفظ في الكويزات")}</span>
          </Button>

          <Button
            size="sm"
            onClick={onPrintMedicalGuide}
            className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isEn ? "Print PDF" : "طباعة PDF"}</span>
          </Button>
        </div>
      </div>

      {/* TAB 1: Medical Study Reference */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {result.markdown ? (
            <>
              {/* Document Control Toolbar */}
              <div className="border border-border rounded-2xl p-3 sm:p-4 bg-card flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">{isEn ? "Document Theme:" : "مظهر المذكرة:"}</span>
                  <div className="flex rounded-xl bg-muted p-1 border border-border">
                    <button
                      type="button"
                      onClick={() => setDocTheme("dark")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        docTheme === "dark"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
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
                          ? "bg-primary text-primary-foreground shadow-sm font-black"
                          : "text-muted-foreground hover:text-foreground"
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
                    onClick={onPrintMedicalGuide}
                    className="text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                    title={isEn ? "Print notes only in A4 format" : "طباعة المذكرة الطبية فقط بتنسيق A4 كامل"}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isEn ? "Print Notes (PDF)" : "طباعة المذكرة (PDF)"}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={onOpenChatDrawer}
                    className="text-xs font-bold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
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
                    ? "bg-white text-slate-900 border border-border shadow-xl medical-doc-light"
                    : "bg-surface text-foreground border border-border shadow-xl medical-doc-dark"
                }`}
              >
                <BidiMarkdownViewer markdown={result.markdown} theme={docTheme} isEn={isEn} />
              </div>

              {/* Docked Quick AI Co-Pilot Refiner Bar */}
              <div className="border border-border rounded-2xl p-4 bg-card shadow-xl space-y-3 sticky bottom-4 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xs font-extrabold text-foreground">{isEn ? "Live Clinical AI Co-Pilot:" : "المساعد السريري المباشر للتعديل (AI Co-Pilot):"}</span>
                    <span className="text-[11px] text-muted-foreground hidden md:inline">
                      {isEn ? "Request any edit or addition and notes will update live" : "اطلب أي تعديل أو إضافة في المذكرة وسيتم تحديثها فوراً"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenChatDrawer}
                    className="text-xs text-primary hover:opacity-80 font-bold flex items-center gap-1 cursor-pointer"
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
                      onClick={() => onApplyPromptChip(chip.prompt, chip.label)}
                      className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/20 hover:border-primary/40 border border-border text-muted-foreground hover:text-foreground transition-colors text-[11px] font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Inline Prompt Input */}
                <form onSubmit={onSendModification} className="flex gap-2">
                  <Input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={isEn ? "Enter your prompt for AI (e.g. Add comparison table, calculate dosage...)" : "اكتب طلبك للذكاء الاصطناعي (مثال: أضف جدول مقارنة لكذا، احسب جرعة كذا، عدل كذا...)"}
                    className="bg-muted border-border text-foreground text-xs py-4 flex-1 focus-visible:ring-primary/50"
                    disabled={isModifying}
                  />
                  <Button
                    type="submit"
                    disabled={isModifying || !chatInput.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 text-xs font-bold gap-1.5 shrink-0"
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
            <div className="border border-border rounded-3xl p-12 text-center bg-card space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                {isEn ? "Quiz Only Generated (Quiz Mode) 🧠" : "تم توليد بنك الأسئلة فقط (وضع كويز فقط) 🧠"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {isEn
                  ? "You selected Quiz Only mode. The question bank is ready in the next tab."
                  : "لقد اخترت وضع توليد الكويز فقط بدون تلخيص. بنك الأسئلة جاهز بالكامل في التبويب التالي."}
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab("quiz")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2"
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
            <div className="border border-border rounded-3xl p-12 text-center bg-card space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-foreground">
                {isEn ? "Notes Only Generated (Notes Mode) 📑" : "تم توليد المذكرة فقط (وضع ملخص فقط) 📑"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {isEn
                  ? "You selected Notes Only mode to optimize focus on clinical reference."
                  : "لقد اخترت وضع توليد المذكرة والتلخيص فقط بدون بنك أسئلة، وذلك لتوفير الموارد والتركيز على المرجع السريري."}
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab("notes")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>{isEn ? "View Clinical Notes" : "عرض المذكرة والمرجع السريري"}</span>
              </Button>
            </div>
          ) : (
            <>
              {showQuizResults && (
                <div className="border border-emerald-500/30 rounded-3xl p-6 bg-emerald-500/10 text-center">
                  <h3 className="text-xl font-black text-emerald-500 mb-1">
                    {isEn
                      ? `Your Score: ${calculateScore().score} / ${calculateScore().total} (${calculateScore().pct}%)`
                      : `نتيجتك: ${calculateScore().score} من ${calculateScore().total} (${calculateScore().pct}%)`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
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
                      className="border border-border rounded-2xl p-6 bg-card space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {qIndex + 1}
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-foreground leading-relaxed">
                          {sanitizeMedicalLatex(q.questionText)}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 pt-2">
                        {(q.options || []).map((opt, optIndex) => {
                          const optionLetter = ["A", "B", "C", "D", "E"][optIndex];
                          const isSelected = userAns === optionLetter;
                          const isCorrect = optionLetter === correctAnsLetter;

                          let btnStyle = "bg-muted/40 border-border hover:bg-muted text-muted-foreground";
                          if (showQuizResults) {
                            if (isCorrect) {
                              btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold";
                            } else if (isSelected && !isCorrect) {
                              btnStyle = "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400";
                            }
                          } else if (isSelected) {
                            btnStyle = "bg-primary/20 border-primary text-primary font-bold";
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
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {showQuizResults && q.explanation && (
                        <div className="mt-3 p-4 rounded-xl bg-muted/60 border border-border text-xs text-foreground leading-relaxed">
                          <strong className="block mb-1 text-primary font-bold">
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

      {/* TAB 3: AI Chat Refiner Drawer in Page */}
      {activeTab === "chat" && (
        <div className="border border-border rounded-3xl p-6 bg-card space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>{isEn ? "Live Clinical AI Refiner" : "مساعد التعديل السريري الحي (Live AI Refiner)"}</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
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
                      ? "bg-primary text-primary-foreground rounded-bl-none shadow-md"
                      : "bg-muted border border-border text-foreground rounded-br-none"
                  }`}
                >
                  {sanitizeMedicalLatex(msg.text)}
                </div>
              </div>
            ))}
            {isModifying && (
              <div className="flex justify-start">
                <div className="p-3.5 rounded-2xl bg-muted border border-border text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>{isEn ? "Modifying notes & restructuring content..." : "جاري تعديل المذكرة وإعادة صياغة الهيكل..."}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={onSendModification} className="flex gap-2">
            <Input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                isEn
                  ? "e.g., Add comparison table for shock stages, or calculate adrenaline dosage..."
                  : "مثال: أضف جدول مقارنة لعلامات الصدمة، أو احسب جرعة الأدرينالين..."
              }
              className="bg-muted border-border text-foreground text-xs sm:text-sm py-5"
              disabled={isModifying}
            />
            <Button
              type="submit"
              disabled={isModifying || !chatInput.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
