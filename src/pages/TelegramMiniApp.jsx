import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AtlasSummaryReader from '@/components/atlas/AtlasSummaryReader';
import DailyOrderSheet from '@/components/atlas/DailyOrderSheet';
import { scheduleFsrsReview, createReviewItem, FSRS_RATINGS } from '@/lib/summaryV5/fsrsEngine';
import { LVCard, LVBadge } from '@/components/ui/linevault';

const STARTAPP_REGEX = /^[A-Za-z0-9_-]{1,512}$/;

function parseClientStartApp(rawParam) {
  if (!rawParam || !STARTAPP_REGEX.test(rawParam)) {
    return { mode: 'reader', docId: 'atlas-cardio-07', page: 1 };
  }
  const docMatch = rawParam.match(/^doc_([A-Za-z0-9_-]+)_p_(\d+)$/);
  if (docMatch) {
    return { mode: 'reader', docId: docMatch[1], page: Number(docMatch[2]) };
  }
  const decMatch = rawParam.match(/^declassify_([A-Za-z0-9_-]+)$/);
  if (decMatch) {
    return { mode: 'declassify', docId: decMatch[1], page: 1 };
  }
  if (rawParam === 'review_due') {
    return { mode: 'review', docId: 'atlas-cardio-07', page: 1 };
  }
  if (rawParam.startsWith('quiz_')) {
    return { mode: 'quiz', docId: 'atlas-cardio-07', page: 1 };
  }
  return { mode: 'reader', docId: rawParam, page: 1 };
}

const MINI_APP_QUIZ_ITEMS = [
  {
    id: 'tgq-1',
    questionAr: 'ما هي القناة الأيونية المسؤولة عن طور الهضبة (Phase 2 Plateau) في خلايا البطين؟',
    options: ['Fast Na+ Channels', 'L-type Ca2+ Channels', 'Funny Na+ Channels (If)', 'Cl- Channels'],
    correctIndex: 1,
    explanationAr: 'قنوات الكالسيوم البطيئة L-type Ca2+ تحافظ على طور الهضبة بالتوازن مع خروج البوتاسيوم.',
  },
  {
    id: 'tgq-2',
    questionAr: 'أي عصب قحفي ينقل إشارات مستقبلات الضغط من الجيب السباتي (Carotid Sinus)؟',
    options: ['العصب المبهم (CN X)', 'العصب اللساني البلعومي (CN IX)', 'العصب الوجهي (CN VII)', 'العصب تحت اللساني (CN XII)'],
    correctIndex: 1,
    explanationAr: 'عصب هيرينغ المتفرع من العصب التاسع (CN IX) ينقل إشارات الجيب السباتي إلى نواة السبيل المفرد.',
  },
];

export default function TelegramMiniApp() {
  const [searchParams] = useSearchParams();
  const tgWebApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

  const startParamRaw =
    searchParams.get('startapp') ||
    tgWebApp?.initDataUnsafe?.start_param ||
    searchParams.get('mode') ||
    '';

  const parsedStart = useMemo(() => parseClientStartApp(startParamRaw), [startParamRaw]);
  const [activeTab, setActiveTab] = useState(parsedStart.mode || 'reader');
  const [cloudPosition, setCloudPosition] = useState(`ص ${parsedStart.page || 1}`);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [srsCard, setSrsCard] = useState(() =>
    createReviewItem({
      id: 'tg_srs_1',
      docId: parsedStart.docId,
      chapterIndex: 1,
      plateNumber: 7,
      promptAr: 'ما هي جرعة التحميل الوريدية القياسية لعقار Amiodarone في حالات اضطراب النظم البطيني؟',
      answerTerm: '150–300 mg IV bolus',
      contextSentence: 'تُعطى جرعة 150–300 mg وريدياً مع مراقبة التخطيط القلبي وضغط الدم.',
      sourcePages: [13],
    })
  );
  const [srsRevealed, setSrsRevealed] = useState(false);

  useEffect(() => {
    if (!tgWebApp) return;
    try {
      tgWebApp.ready?.();
      tgWebApp.expand?.();
      tgWebApp.CloudStorage?.getItem?.(`pos_${parsedStart.docId}`, (err, val) => {
        if (!err && val) setCloudPosition(val);
      });
    } catch {
      // Safe fallback outside Telegram webview
    }
  }, [tgWebApp, parsedStart.docId]);

  const triggerHaptic = (type = 'light') => {
    try {
      tgWebApp?.HapticFeedback?.impactOccurred?.(type);
    } catch {
      // Ignore outside Telegram
    }
  };

  const handleSaveCloudProgress = (label) => {
    setCloudPosition(label);
    triggerHaptic('light');
    try {
      tgWebApp?.CloudStorage?.setItem?.(`pos_${parsedStart.docId}`, label);
    } catch {
      // Ignore
    }
  };

  const handleGradeSrs = (rating) => {
    triggerHaptic('medium');
    const next = scheduleFsrsReview(srsCard, rating);
    setSrsCard(next);
    setSrsRevealed(false);
  };

  return (
    <main dir="rtl" className="min-h-dvh bg-[#07090D] text-[#F2F4F7] p-4 max-w-3xl mx-auto space-y-4">
      {/* Compact Telegram Mini App Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1C222B]">
        <div>
          <div className="text-[11px] font-mono text-[#8B94A3]">
            TELEGRAM MINI APP · /tg · SYNCED ({cloudPosition})
          </div>
          <strong className="text-base font-bold text-[#F2F4F7]">
            BLACK FIGHTERS — القارئ السحابي المصغر
          </strong>
        </div>

        <button
          type="button"
          onClick={() => handleSaveCloudProgress('ص 13')}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[#22E58B]/40 bg-[#22E58B]/10 text-[#22E58B] hover:bg-[#22E58B]/20 transition-colors"
        >
          حفظ الموضع سحابياً
        </button>
      </header>

      {/* 4 Focused Mini App Modes */}
      <nav aria-label="أوضاع تطبيق تليجرام المصغر" className="grid grid-cols-4 gap-2">
        {[
          { id: 'reader', label: 'القارئ' },
          { id: 'declassify', label: 'استدعاء نشط' },
          { id: 'review', label: 'المراجعة' },
          { id: 'quiz', label: 'الاختبار' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab(tab.id);
            }}
            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
              activeTab === tab.id
                ? 'bg-[#22E58B] text-[#07090D] border-[#22E58B]'
                : 'bg-[#0E1117] text-[#8B94A3] border-[#1C222B] hover:text-[#F2F4F7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'reader' && (
        <AtlasSummaryReader initialTheme="night" initialDeclassifyMode={false} compact />
      )}

      {activeTab === 'declassify' && (
        <AtlasSummaryReader initialTheme="night" initialDeclassifyMode compact />
      )}

      {activeTab === 'review' && (
        <div className="space-y-4">
          <LVCard className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#1C222B]">
              <div>
                <div className="text-[11px] font-mono text-[#8B94A3]">
                  FSRS v4.5 ACTIVE RECALL
                </div>
                <h2 className="text-base font-bold text-[#F2F4F7]">
                  بطاقة استدعاء نشط متزامنة مع البوت
                </h2>
              </div>
              <LVBadge variant="accent">
                الفاصل: {srsCard.intervalDays} يوم
              </LVBadge>
            </div>

            <p className="text-sm font-semibold text-[#F2F4F7] leading-relaxed">
              {srsCard.promptAr}
            </p>

            <div>
              <button
                type="button"
                aria-expanded={srsRevealed}
                onClick={() => {
                  triggerHaptic('light');
                  setSrsRevealed((v) => !v);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-mono font-semibold border transition-colors ${
                  srsRevealed
                    ? 'bg-[#22E58B]/10 border-[#22E58B]/40 text-[#22E58B]'
                    : 'bg-[#131820] border-[#28313E] text-transparent select-none hover:border-[#22E58B]/40'
                }`}
              >
                {srsCard.answerTerm}
              </button>
            </div>

            {srsRevealed && (
              <div className="p-4 rounded-xl bg-[#07090D] border border-[#1C222B] space-y-3">
                <p className="text-xs text-[#8B94A3] leading-relaxed">
                  {srsCard.contextSentence}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { r: FSRS_RATINGS.AGAIN, label: '1 · نسيت' },
                    { r: FSRS_RATINGS.HARD, label: '2 · صعب' },
                    { r: FSRS_RATINGS.GOOD, label: '3 · جيد' },
                    { r: FSRS_RATINGS.EASY, label: '4 · سهل' },
                  ].map((b) => (
                    <button
                      key={b.r}
                      type="button"
                      onClick={() => handleGradeSrs(b.r)}
                      className="py-2 px-2 rounded-lg border border-[#1C222B] bg-[#0E1117] text-[#F2F4F7] hover:border-[#22E58B]/40 hover:text-[#22E58B] text-xs font-mono transition-colors"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </LVCard>

          <DailyOrderSheet />
        </div>
      )}

      {activeTab === 'quiz' && (
        <LVCard className="p-5 space-y-4">
          <div className="pb-3 border-b border-[#1C222B]">
            <div className="text-[11px] font-mono text-[#8B94A3]">QUICK VERIFICATION QUIZ</div>
            <h2 className="text-base font-bold text-[#F2F4F7]">
              اختبار التثبيت السريع داخل تليجرام
            </h2>
          </div>

          <div className="space-y-4">
            {MINI_APP_QUIZ_ITEMS.map((q, qIdx) => {
              const chosen = quizAnswers[q.id];
              const isAnswered = chosen !== undefined;
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-[#07090D] border border-[#1C222B] space-y-3"
                >
                  <p className="text-sm font-bold text-[#F2F4F7]">
                    {qIdx + 1}. {q.questionAr}
                  </p>
                  <div className="grid gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctIndex;
                      const isSelected = chosen === oIdx;
                      let btnClasses = 'bg-[#0E1117] border-[#1C222B] text-[#F2F4F7] hover:border-[#28313E]';
                      if (isAnswered) {
                        if (isCorrect) {
                          btnClasses = 'bg-[#22E58B]/15 border-[#22E58B]/50 text-[#22E58B]';
                        } else if (isSelected) {
                          btnClasses = 'bg-[#F0545B]/15 border-[#F0545B]/50 text-[#F0545B]';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            triggerHaptic(isCorrect ? 'light' : 'heavy');
                            setQuizAnswers((prev) => ({ ...prev, [q.id]: oIdx }));
                          }}
                          className={`text-right px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${btnClasses}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {isAnswered && (
                    <p className="text-xs text-[#8B94A3] pt-1">
                      ✓ {q.explanationAr}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </LVCard>
      )}
    </main>
  );
}
