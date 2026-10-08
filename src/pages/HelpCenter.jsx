import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Sparkles,
  ShieldCheck,
  Send,
  Brain,
  Layers,
  CreditCard,
  History,
  ArrowLeft,
  Keyboard,
  CheckCircle2,
} from 'lucide-react';
import { useLocale } from '@/lib/LocaleContext';
import { normalizeArabicForSearch } from '@/lib/summaryV5/arabicNormalize';
import { PageHeader, LVCard, LVBadge } from '@/components/ui/linevault';

const HELP_SECTIONS = [
  {
    id: 'quickstart',
    number: '01',
    icon: Sparkles,
    titleAr: 'البداية في دقيقتين (Quickstart)',
    titleEn: '2-Minute Quickstart',
    summaryAr: 'من رفع ملف PDF المحاضرة (حتى 500 صفحة) إلى ملخص مشروح من الأساس مع جلسة تثبيت ذكية.',
    summaryEn: 'From uploading a 500-page lecture PDF to a foundational summary and FSRS retention sprint.',
    items: [
      {
        qAr: 'كيف أبدأ أول محاضرة على المنصة؟',
        qEn: 'How do I start my first lecture?',
        aAr: 'افتح «أنشئ تلخيص»، ارفع ملف المحاضرة أو الصق النص، اختر قالب «شرح من الأساس (Foundational Bilingual)» ومستوى العمق (شامل / متوازن / سريع). سيظهر لك تقدير الصفحات والوقت قبل البدء ثم يُبنى الملخص فوراً.',
        aEn: 'Open "Create Summary", upload your PDF or paste text, select "Foundational Bilingual" and your Depth Mode (Deep / Balanced / Fast). You get an instant pre-start estimate before generation begins.',
      },
      {
        qAr: 'ما هي مهام النهاردة في لوحة التحكم؟',
        qEn: 'What are Today’s Tasks on the Dashboard?',
        aAr: 'في لوحة التحكم الرئيسية، نعرض لك أهم مهامك اليومية بناءً على كورساتك وبطاقات FSRS المستحقة لمنع التشتت.',
        aEn: 'On the main Dashboard, you get focused daily tasks based on your real courses and due FSRS review cards.',
      },
    ],
  },
  {
    id: 'foundational-summary',
    number: '02',
    icon: BookOpen,
    titleAr: 'الملخصات و«شرح من الأساس»',
    titleEn: 'Foundational Bilingual Summaries',
    summaryAr: 'كل مفهوم يبدأ بـ «قبل ما تقرا» بالعربي الواضح مع إبقاء المصطلح الإنجليزي والأرقام الطبية في مكانها.',
    summaryEn: 'Every concept begins with prerequisite intuition in clear Arabic while preserving English medical terms and exact numbers.',
    items: [
      {
        qAr: 'ما الفرق بين أوضاع العمق الثلاثة (شامل / متوازن / سريع)؟',
        qEn: 'What is the difference between the 3 Depth Modes?',
        aAr: '• شامل (Deep — 100%): يغطي كل فقرة وجدول وجرعة مع صندوق تمهيدي للمفاهيم الصعبة.\n• متوازن (Balanced — 85%): يركز على لب المحاضرة ومواضع الأسئلة.\n• مراجعة سريعة (Fast — 45%): ورقة ليلة الامتحان المركزة.',
        aEn: '• Deep (100%): Full coverage of every paragraph, dosage, and prerequisite box.\n• Balanced (85%): Core high-yield explanations.\n• Fast (45%): Exam-eve high-speed cram sheet.',
      },
      {
        qAr: 'كيف أبدّل بين القراءة العادية والمظلمة؟',
        qEn: 'How do I switch between Dark and Light reading modes?',
        aAr: 'من أعلى قارئ الملخص يمكنك التبديل بضغطة واحدة بين الوضع المظلم المريح للعين والوضع الفاتح للطباعة.',
        aEn: 'Use the reader toolbar to toggle cleanly between Dark mode and Light mode.',
      },
    ],
  },
  {
    id: 'declassify-quizzes',
    number: '03',
    icon: Layers,
    titleAr: 'الاستدعاء النشط والكويزات',
    titleEn: 'Active Recall & Quizzes',
    summaryAr: 'بدلاً من القراءة السلبية، يمكنك إخفاء المصطلحات والأرقام الحرجة لاختبار تذكرك قبل كشفها.',
    summaryEn: 'Instead of passive reading, critical terms and dosages can be hidden to test active recall.',
    items: [
      {
        qAr: 'كيف يعمل وضع إخفاء الإجابات (الاستدعاء النشط)؟',
        qEn: 'How does Active Recall mode work?',
        aAr: 'فعّل زر «إخفاء الإجابات» أعلى قارئ الملخص؛ ستُخفى المصطلحات والأرقام الحرجة لتختبر نفسك، واضغط عليها أو اضغط Space للكشف.',
        aEn: 'Toggle "Hide Answers" in the reader toolbar. Key answers are hidden until you click or press Space to reveal them.',
      },
    ],
  },
  {
    id: 'fsrs-leech',
    number: '04',
    icon: Brain,
    titleAr: 'المراجعة المتباعدة FSRS v4.5 ونقاط التعثر (Leech)',
    titleEn: 'FSRS v4.5 Spaced Repetition & Leech Detection',
    summaryAr: 'جدولة رياضية دقيقة للذاكرة طويلة المدى مع كشف تلقائي للمفاهيم التي تتعثر فيها 4 مرات أو أكثر.',
    summaryEn: 'Mathematical memory scheduling (Stability, Difficulty, Retrievability) with automatic Leech detection.',
    items: [
      {
        qAr: 'كيف تعمل تقييمات FSRS الأربعة (1 / 2 / 3 / 4)؟',
        qEn: 'How do the 4 FSRS ratings work?',
        aAr: '• 1 نسيتها (Again): يعيد البطاقة فوراً ويفحص هل تحتاج شرحاً أبسط.\n• 2 صعبة (Hard): فاصل زمني قصير.\n• 3 جيدة (Good): الفاصل المثالي لثبات 90%.\n• 4 سهلة (Easy): قفزة زمنية طويلة.',
        aEn: '1 = Again (lapse reset), 2 = Hard, 3 = Good (90% target retention), 4 = Easy (expanded stability interval).',
      },
      {
        qAr: 'ماذا يحدث عندما تصبح البطاقة «نقطة تعثر» (Leech)؟',
        qEn: 'What happens when a card becomes a Leech?',
        aAr: 'عند نسيان بطاقة 4 مرات (lapses >= 4)، ينبّهك النظام ويقترح إعادة قراءة الفقرة التمهيدية بتشبيه أبسط.',
        aEn: 'When a card reaches 4+ lapses, the system flags it as a Leech and offers a simplified prerequisite explanation.',
      },
    ],
  },
  {
    id: 'telegram-miniapp',
    number: '05',
    icon: Send,
    titleAr: 'البوت وتطبيق تيليجرام المصغر (/tg)',
    titleEn: 'Telegram Bot & Mini App (/tg)',
    summaryAr: 'افتح مذكراتك وبطاقاتك من داخل تيليجرام مباشرة مع تقسيم تلقائي للملفات الكبيرة.',
    summaryEn: 'Access your summaries, active recall sprints, and PDF exports directly inside Telegram.',
    items: [
      {
        qAr: 'ماذا لو كان ملف الـ PDF أكبر من حد تيليجرام للبوت (20MB)؟',
        qEn: 'What if my lecture PDF exceeds Telegram Bot API’s 20MB limit?',
        aAr: 'يكتشف البوت ذلك تلقائياً ويفتح لك زر رفع مباشر في تطبيق /tg المصغر إلى السحابة (حتى 500 صفحة).',
        aEn: 'The bot automatically provides a direct Mini App upload button supporting up to 500 pages.',
      },
    ],
  },
  {
    id: 'credits-byok',
    number: '06',
    icon: CreditCard,
    titleAr: 'رصيد الصفحات والـ BYOK (دفتر الأستاذ المزدوج)',
    titleEn: 'Page Credits, Double-Entry Ledger & BYOK',
    summaryAr: 'لا يُخصم رصيدك أبداً إذا فشل التوليد — الحجز يتم أولاً (reserve) ويُرد تلقائياً عند أي خطأ (release).',
    summaryEn: 'Credits are reserved prior to generation and automatically refunded on any upstream error.',
    items: [
      {
        qAr: 'هل أستطيع استخدام مفتاح Gemini أو OpenRouter الخاص بي؟',
        qEn: 'Can I bring my own API key (BYOK)?',
        aAr: 'نعم، من الإعدادات يمكنك تفعيل مفتاحك الشخصي مع التبديل التلقائي بين النماذج لضمان عدم توقف التلخيص.',
        aEn: 'Yes, configure your key in Settings with automatic multi-provider failover.',
      },
    ],
  },
  {
    id: 'privacy-security',
    number: '07',
    icon: ShieldCheck,
    titleAr: 'الخصوصية والأمان (منع الروابط العامة)',
    titleEn: 'Privacy & Zero Public Leaks',
    summaryAr: 'ملخصاتك خاصة بحسابك فقط؛ ألغينا نشر الملخصات على الروابط العامة نهائياً واستبدلناه بملف HTML مستقل.',
    summaryEn: 'Your lectures remain strictly private; public Telegraph publishing is permanently disabled in favor of self-contained HTML exports.',
    items: [
      {
        qAr: 'كيف أحفظ الملخص للقراءة بدون إنترنت؟',
        qEn: 'How can I save a summary for offline reading?',
        aAr: 'من شريط أدوات القارئ اضغط «HTML مستقل» لتحميل ملف واحد يعمل بدون إنترنت، أو اضغط «طباعة / PDF».',
        aEn: 'Click "Standalone HTML" in the reader toolbar to download a single-file offline reader, or click "Print / PDF".',
      },
    ],
  },
  {
    id: 'shortcuts-faq',
    number: '08',
    icon: Keyboard,
    titleAr: 'اختصارات لوحة المفاتيح والأسئلة الشائعة',
    titleEn: 'Keyboard Shortcuts & FAQ',
    summaryAr: 'تحكم كامل بلوحة المفاتيح أثناء القراءة والمراجعة السريعة.',
    summaryEn: 'Full keyboard navigation for high-speed study and review sessions.',
    items: [
      {
        qAr: 'ما هي أهم اختصارات الكيبورد في المنصة؟',
        qEn: 'What are the main keyboard shortcuts?',
        aAr: '• ⌘K أو Ctrl+K: البحث الفوري الشامل\n• Space: كشف الإجابة المخفية أو قلب بطاقة المراجعة\n• 1 / 2 / 3 / 4: تقييم بطاقة FSRS (نسيتها / صعبة / جيدة / سهلة)',
        aEn: '• Cmd/Ctrl+K: Global Search\n• Space: Reveal hidden answer or flip flashcard\n• 1 / 2 / 3 / 4: Rate FSRS card (Again / Hard / Good / Easy)',
      },
    ],
  },
  {
    id: 'changelog',
    number: '09',
    icon: History,
    titleAr: 'سجل التحديثات والمعمارية',
    titleEn: 'Platform Architecture & Changelog',
    summaryAr: 'ملخص المعمارية الحديثة: الهوية البصرية الموحدة، محرك الـ 500 صفحة، المدقق الرقمي المزدوج، وFSRS v4.5.',
    summaryEn: 'Summary of the unified platform architecture: LineVault clean UI, 500-page hierarchical pipeline, Cross-Family Verifier, and FSRS v4.5.',
    items: [
      {
        qAr: 'ما أبرز تحديثات المنصة؟',
        qEn: 'What are the latest platform updates?',
        aAr: '• هوية بصرية موحدة وهادئة في جميع الصفحات الـ 31.\n• قالب «شرح من الأساس» افتراضياً مع توحيد المصطلحات عبر الفصول.\n• مدقق أرقام وجرعات من عائلة نماذج ثانية (Cross-Family Verifier).\n• جدولة المراجعة المتباعدة FSRS v4.5 مع كشف نقاط التعثر.',
        aEn: '• Unified calm dark design across all 31 pages.\n• Foundational Bilingual default template with cross-chapter glossary locking.\n• Cross-family dosage/number verifier.\n• FSRS v4.5 spaced repetition with automatic Leech detection.',
      },
    ],
  },
];

export default function HelpCenter() {
  const { locale, dir } = useLocale();
  const isEn = locale === 'en';
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredSections = useMemo(() => {
    const normQuery = normalizeArabicForSearch(query);
    return HELP_SECTIONS.filter((sec) => {
      if (activeCategory !== 'all' && sec.id !== activeCategory) return false;
      if (!normQuery) return true;
      const haystack = normalizeArabicForSearch(
        [
          sec.titleAr,
          sec.titleEn,
          sec.summaryAr,
          sec.summaryEn,
          ...sec.items.map((i) => `${i.qAr} ${i.qEn} ${i.aAr} ${i.aEn}`),
        ].join(' ')
      );
      return haystack.includes(normQuery);
    });
  }, [query, activeCategory]);

  return (
    <div dir={dir} className="max-w-5xl mx-auto space-y-6 pb-12">
      <PageHeader
        badge="HELP CENTER · الدليل الإرشادي"
        title={isEn ? 'Knowledge & Help Center' : 'مركز المساعدة والدليل الشامل'}
        description={
          isEn
            ? 'Complete guide to Foundational Bilingual summaries, Active Recall, FSRS v4.5 scheduling, Telegram Mini App (/tg), and page credits.'
            : 'كل ما تحتاجه لإتقان المذاكرة بقالب «شرح من الأساس»، الاستدعاء النشط، خوارزمية FSRS v4.5، وتطبيق تيليجرام المصغر.'
        }
        actions={
          <Link
            to="/dashboard"
            className="h-10 px-4 rounded-xl bg-[#3DDC97] text-[#07080C] hover:bg-[#1CC978] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>{isEn ? 'Dashboard' : 'لوحة التحكم'}</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Start here — the page used to open straight into nine numbered chips
          with long Arabic labels plus nine stacked sections, so a student landing
          here had no idea what to read first. Three concrete actions answer
          "what do I do now?" before any documentation does. */}
      <LVCard className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-black text-[#F2F3F5]">
            {isEn ? 'Start here' : 'ابدأ من هنا'}
          </h2>
          <p className="mt-1 text-xs leading-6 text-[#9AA0AE]">
            {isEn
              ? 'Three steps cover 90% of what students need.'
              : 'تلات خطوات بتغطي ٩٠٪ من اللي الطلبة محتاجينه.'}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { to: '/create', step: '1', labelAr: 'ارفع المحاضرة', labelEn: 'Upload a lecture', hintAr: 'PDF أو صور → ملخص كامل', hintEn: 'PDF or images → full summary' },
            { to: '/quizzes', step: '2', labelAr: 'اعمل كويز', labelEn: 'Make a quiz', hintAr: 'أسئلة على محاضرتك', hintEn: 'Questions on your lecture' },
            { to: '/settings', step: '3', labelAr: 'اربط تيليجرام', labelEn: 'Link Telegram', hintAr: 'ذاكر من موبايلك', hintEn: 'Study from your phone' },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-3 rounded-2xl border border-[#1E222B] bg-[#07080C] px-3.5 py-3 transition-colors hover:border-[#3DDC97]/40"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3DDC97]/15 font-mono text-[12px] font-black text-[#3DDC97]">
                {action.step}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-[#F2F3F5]">
                  {isEn ? action.labelEn : action.labelAr}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-[#9AA0AE]">
                  {isEn ? action.hintEn : action.hintAr}
                </span>
              </span>
              <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-[#9AA0AE] transition-transform group-hover:-translate-x-0.5" />
            </Link>
          ))}
        </div>

        <div className="border-t border-[#1E222B] pt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA0AE]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isEn
                  ? 'Search any feature, shortcut, FSRS rule, or Telegram limit...'
                  : 'ابحث في الدليل (بيتجاهل التشكيل والهمزات: اكتب "جرعات"، "FSRS"، "تيليجرام")...'
              }
              className="h-11 w-full rounded-xl border border-[#1E222B] bg-[#07080C] pl-4 pr-10 text-sm text-[#F2F3F5] placeholder:text-[#9AA0AE] focus:border-[#3DDC97] focus:outline-none"
            />
          </div>
        </div>
      </LVCard>

      {/* Contents — a readable list instead of a chip cloud. */}
      <LVCard className="p-5">
        <h2 className="mb-3 text-sm font-black text-[#F2F3F5]">
          {isEn ? `Contents (${HELP_SECTIONS.length})` : `المحتويات (${HELP_SECTIONS.length})`}
        </h2>
        <div className="grid gap-1.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-[12.5px] font-bold transition-colors ${
              activeCategory === 'all'
                ? 'border-[#3DDC97]/50 bg-[#3DDC97]/10 text-[#3DDC97]'
                : 'border-[#1E222B] text-[#9AA0AE] hover:text-[#F2F3F5]'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            {isEn ? 'Show everything' : 'اعرض كل حاجة'}
          </button>
          {HELP_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const selected = activeCategory === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveCategory(sec.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start text-[12.5px] transition-colors ${
                  selected
                    ? 'border-[#3DDC97]/50 bg-[#3DDC97]/10 text-[#3DDC97]'
                    : 'border-[#1E222B] text-[#9AA0AE] hover:text-[#F2F3F5]'
                }`}
              >
                <span className="font-mono text-[11px] opacity-70">{sec.number}</span>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-bold">{isEn ? sec.titleEn : sec.titleAr}</span>
              </button>
            );
          })}
        </div>
      </LVCard>

      {/* Sections Grid */}
      <div className="space-y-4">
        {filteredSections.map((section) => {
          const Icon = section.icon;
          return (
            <LVCard key={section.id} id={section.id} className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1E222B]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#07080C] border border-[#1E222B] text-[#3DDC97] flex items-center justify-center font-mono font-bold text-xs">
                    {section.number}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#F2F3F5] flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#3DDC97]" />
                      <span>{isEn ? section.titleEn : section.titleAr}</span>
                    </h2>
                    <p className="text-xs text-[#9AA0AE] mt-0.5">
                      {isEn ? section.summaryEn : section.summaryAr}
                    </p>
                  </div>
                </div>
                <LVBadge variant="accent">
                  <CheckCircle2 className="w-3 h-3" />
                  موثّق
                </LVBadge>
              </div>

              <div className="space-y-3">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#07080C] border border-[#1E222B]"
                  >
                    <h3 className="font-bold text-sm text-[#F2F3F5] mb-1.5">
                      {isEn ? item.qEn : item.qAr}
                    </h3>
                    <p className="text-xs text-[#9AA0AE] whitespace-pre-line leading-relaxed">
                      {isEn ? item.aEn : item.aAr}
                    </p>
                  </div>
                ))}
              </div>
            </LVCard>
          );
        })}
      </div>
    </div>
  );
}
