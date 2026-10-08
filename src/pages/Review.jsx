import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";
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
      <div dir={dir} className="max-w-xl mx-auto glass rounded-3xl p-12 text-center border border-[#3DDC97]/30">
        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <SuccessIcon className="w-16 h-16" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gradient">
          {isEn ? `You reviewed ${finished} cards successfully!` : `راجعت ${finished} بطاقة بنجاح!`}
        </h2>
        <p className="text-white/60 mb-6 text-sm">
          {isEn 
            ? "Cards will return on spaced repetition intervals based on your mastery level."
            : "البطاقات هترجعلك في مواعيد التكرار المتباعد حسب مستوى إتقانك"}
        </p>
        <Button onClick={() => { setFinished(null); setDemoSprint(null); queryClient.invalidateQueries({ queryKey: ["review-due"] }); }} className="btn-primary-glow font-bold rounded-full px-6">
          {isEn ? "Done" : "تمام"}
        </Button>
      </div>
    );
  }

  const activeCards = due?.length ? due : demoSprint;

  if (!activeCards?.length) {
    return (
      <div dir={dir} className="max-w-xl mx-auto space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[#3DDC97] border border-[#3DDC97]/30 font-mono mb-3">
            <span className="pulse-dot w-1.5 h-1.5" />
            <span>SPACED REPETITION ENGINE · FSRS v4.5</span>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-1">
            {isEn ? "Smart Spaced Review" : "المراجعة والتثبيت الذكي"}
          </h1>
          <p className="text-sm text-white/60">
            {isEn 
              ? "Spaced repetition system to lock complex concepts and high-yield facts into long-term memory."
              : "نظام تكرار متباعد لتثبيت المفاهيم العلمية والمعلومات المعقدة في الذاكرة طويلة المدى"}
          </p>
        </div>

        <div className="glass rounded-3xl p-12 text-center border border-white/10 space-y-5">
          <CalendarCheck className="w-12 h-12 text-[#3DDC97] mx-auto mb-2 opacity-90" />
          <h3 className="text-lg font-bold mb-2 text-white">
            {isEn ? "No cards due for review today" : "لا توجد بطاقات للمراجعة حالياً"}
          </h3>
          <p className="text-white/60 text-xs max-w-md mx-auto leading-relaxed">
            {isEn 
              ? "Convert cards from any lecture or practice active recall directly with Atlas V5 Declassify bars."
              : "حوّل بطاقات أي مذكرة للمراجعة الذكية (FSRS v4.5)، أو ابدأ جلسة استدعاء نشط فورية عبر شرائط فك التعتيم في الأطلس V5."}
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium text-[#3DDC97] border border-[#3DDC97]/30 font-mono">
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