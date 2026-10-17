import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "@/components/ui/animatedIcons";
import ReviewSession from "@/components/review/ReviewSession";
import { FlameIcon, SuccessIcon } from "@/components/ui/icons";
import { useLocale } from "@/lib/LocaleContext";

export default function Review() {
  const queryClient = useQueryClient();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [finished, setFinished] = useState(null);
  const [demoSprint, setDemoSprint] = useState(null);

  const { data: due, isLoading } = useQuery({
    queryKey: ["review-due"],
    queryFn: async () => {
      const all = await base44.entities.ReviewCard.list("-created_date", 500);
      const t = new Date().toISOString().split("T")[0];
      return all.filter((c) => !c.due_date || c.due_date <= t);
    },
  });

  if (isLoading) {
    return <div className="max-w-xl mx-auto"><Skeleton className="h-80 rounded-3xl" /></div>;
  }

  if (finished !== null) {
    return (
      <div dir={dir} className="max-w-xl mx-auto card text-center p-8" style={{ gap: 14 }}>
        <div className="w-16 h-16 mx-auto flex items-center justify-center">
          <SuccessIcon className="w-12 h-12" />
        </div>
        <h2 className="serif" style={{ fontSize: "1.8rem" }}>
          {isEn ? `You reviewed ${finished} cards successfully!` : `راجعت ${finished} بطاقة بنجاح!`}
        </h2>
        <p style={{ color: "var(--mute)", fontSize: "0.9rem" }}>
          {isEn 
            ? "Cards will return on spaced repetition intervals based on your mastery level."
            : "البطاقات هترجعلك في مواعيد التكرار المتباعد حسب مستوى إتقانك."}
        </p>
        <div style={{ marginTop: 8 }}>
          <Button onClick={() => { setFinished(null); setDemoSprint(null); queryClient.invalidateQueries({ queryKey: ["review-due"] }); }} className="btn sm">
            {isEn ? "Done" : "تمام"}
          </Button>
        </div>
      </div>
    );
  }

  const activeCards = due?.length ? due : demoSprint;

  if (!activeCards?.length) {
    return (
      <div dir={dir} className="max-w-xl mx-auto space-y-6">
        <div className="bf-hd">
          <span className="mono">SPACED REPETITION · FSRS v4.5</span>
          <h1 className="serif">
            {isEn ? "Smart Spaced " : "المراجعة والتثبيت "}
            <em style={{ color: "var(--sig)" }}>{isEn ? "Review." : "الذكي."}</em>
          </h1>
          <p style={{ color: "var(--mute)", fontSize: "0.92rem" }}>
            {isEn 
              ? "Spaced repetition system to lock complex concepts into long-term memory."
              : "نظام تكرار متباعد لتثبيت المفاهيم العلمية والمعلومات في الذاكرة طويلة المدى."}
          </p>
        </div>

        <div className="card text-center p-8" style={{ gap: 14 }}>
          <CalendarCheck className="w-12 h-12 text-[var(--sig)] mx-auto opacity-90" />
          <h3 className="serif" style={{ fontSize: "1.3rem" }}>
            {isEn ? "No cards due for review today" : "لا توجد بطاقات للمراجعة حالياً"}
          </h3>
          <p style={{ color: "var(--mute)", fontSize: "0.85rem", maxWidth: 460, margin: "0 auto" }}>
            {isEn 
              ? "Convert cards from any lecture or start a quick practice session."
              : "حوّل بطاقات أي مذكرة للمراجعة الذكية، أو ابدأ تدريباً سريعاً من النماذج التجريبية."}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              onClick={() =>
                setDemoSprint([
                  {
                    id: "atlas_demo_1",
                    course_title: "أطلس الفسيولوجيا · Plate 07",
                    front: "ما هي القناة الأيونية المسؤولة عن استمرار طور الهضبة (Phase 2 Plateau) في البطين؟",
                    back: "قنوات الكالسيوم البطيئة L-type Ca2+ بالتوازن مع خروج البوتاسيوم (IKs/IKr).",
                    box: 2,
                  },
                  {
                    id: "atlas_demo_2",
                    course_title: "الفارماكولوجيا · Plate 07",
                    front: "ما هي جرعة التحميل الوريدية القياسية لعقار Amiodarone؟",
                    back: "150–300 mg IV bolus (مدققة عبر Cross-Family Verifier من ص 13).",
                    box: 3,
                  },
                  {
                    id: "atlas_demo_3",
                    course_title: "التشريح العصبي · Plate 09",
                    front: "أي عصب قحفي ينقل إشارات مستقبلات الضغط من الجيب السباتي (Carotid Sinus)؟",
                    back: "العصب اللساني البلعومي التاسع (CN IX — عصب هيرينغ) إلى نواة السبيل المفرد (NTS).",
                    box: 1,
                  },
                ])
              }
              className="btn-primary-glow font-bold rounded-full px-6"
            >
              {isEn ? "⚡ Start Atlas FSRS Sprint (3 Cards)" : "⚡ ابدأ جلسة تثبيت الأطلس FSRS (3 بطاقات)"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-primary border-primary/30 font-mono">
          <FlameIcon className="w-4 h-4 inline" />
          <span>DAILY FLASHCARD SPRINT · FSRS v4.5</span>
        </div>
        <h1 className="text-3xl font-bold text-gradient">
          {isEn ? "Daily Review Sprint" : "جلسة المراجعة اليومية"}
        </h1>
        <p className="text-white/60 text-sm">
          {isEn 
            ? `You have ${activeCards.length} ${activeCards.length === 1 ? "card" : "cards"} due for review today`
            : `عندك ${activeCards.length} بطاقة تحتاج مراجعة وتثبيت اليوم`}
        </p>
      </div>
      <ReviewSession cards={activeCards} onDone={(n) => { setDemoSprint(null); setFinished(n); }} />
    </div>
  );
}