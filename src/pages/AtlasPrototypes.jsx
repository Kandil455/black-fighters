import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AtlasSummaryReader from '@/components/atlas/AtlasSummaryReader';
import TerritoryMap from '@/components/atlas/TerritoryMap';
import DailyOrderSheet from '@/components/atlas/DailyOrderSheet';
import { estimateDocumentJob } from '@/lib/summaryV5/hierarchicalPipeline';
import { calculateDocumentCreditCost } from '@/lib/summaryV5/creditLedger';
import { PageHeader, LVCard, LVBadge } from '@/components/ui/linevault';

export default function AtlasPrototypes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'command';
  const [estimatorPages, setEstimatorPages] = useState(420);
  const [estimatorOcrRatio, setEstimatorOcrRatio] = useState(15);

  const jobEstimate = useMemo(() => {
    const ocrPages = Math.round((estimatorPages * estimatorOcrRatio) / 100);
    const est = estimateDocumentJob({
      totalPages: estimatorPages,
      ocrPagesCount: ocrPages,
    });
    const creditCost = calculateDocumentCreditCost({
      totalPages: estimatorPages,
      ocrPages,
    });
    return { ...est, creditCost };
  }, [estimatorPages, estimatorOcrRatio]);

  return (
    <main dir="rtl" className="max-w-6xl mx-auto space-y-6 pb-12">
      <PageHeader
        badge="محرك الكتب والمراجع · DEV DIAGNOSTICS"
        title="معمل محرك التلخيص والمراجعة المتباعدة"
        description="أدوات فحص محرك الكتب الكبيرة (1–1000 صفحة)، خريطة التقدم، ووضع الاستدعاء النشط."
        actions={
          <Link
            to="/tg"
            className="h-10 px-4 rounded-xl bg-[#3DDC97] text-[#07080C] hover:bg-[#1CC978] text-xs font-semibold inline-flex items-center transition-colors"
          >
            فتح تطبيق تليجرام (/tg)
          </Link>
        }
      />

      {/* Navigation Tabs */}
      <nav aria-label="أقسام المعمل" className="flex flex-wrap gap-2">
        {[
          { id: 'command', label: 'مهام اليوم وخريطة المواد' },
          { id: 'plate', label: 'قارئ الملخصات' },
          { id: 'declassify', label: 'وضع الاستدعاء النشط' },
          { id: 'engine', label: 'مُقدّر الكتب الضخمة (1–1000 صفحة)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={activeTab === tab.id ? 'true' : undefined}
            onClick={() => setSearchParams({ tab: tab.id })}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              activeTab === tab.id
                ? 'bg-[#3DDC97] text-[#07080C] border-[#3DDC97]'
                : 'bg-[#0E1117] text-[#9AA0AE] border-[#1E222B] hover:text-[#F2F3F5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'command' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-5">
            <DailyOrderSheet />
          </div>
          <div className="xl:col-span-7">
            <TerritoryMap />
          </div>
        </div>
      )}

      {activeTab === 'plate' && (
        <AtlasSummaryReader initialTheme="night" initialDeclassifyMode={false} />
      )}

      {activeTab === 'declassify' && (
        <AtlasSummaryReader initialTheme="night" initialDeclassifyMode />
      )}

      {activeTab === 'engine' && (
        <LVCard className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1E222B]">
            <div>
              <div className="text-[11px] font-mono text-[#9AA0AE]">
                HIERARCHICAL BIG-DOCUMENT ENGINE · 1 TO 1000 PAGES
              </div>
              <h2 className="text-lg font-bold text-[#F2F3F5] mt-1">
                مُقدّر التكلفة والزمن المسبق للكتب والمراجع الضخمة
              </h2>
            </div>
            <LVBadge variant="accent">MAP-REDUCE + VERIFIER</LVBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block space-y-2">
              <div className="text-sm font-semibold text-[#F2F3F5]">
                إجمالي صفحات الكتاب: <span className="font-mono text-[#3DDC97]">{estimatorPages} صفحة</span>
              </div>
              <input
                type="range"
                min={1}
                max={1000}
                value={estimatorPages}
                onChange={(e) => setEstimatorPages(Number(e.target.value))}
                className="w-full accent-[#3DDC97]"
              />
            </label>

            <label className="block space-y-2">
              <div className="text-sm font-semibold text-[#F2F3F5]">
                نسبة الصفحات الممسوحة ضوئياً (OCR/Vision):{' '}
                <span className="font-mono text-[#3DDC97]">{estimatorOcrRatio}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={estimatorOcrRatio}
                onChange={(e) => setEstimatorOcrRatio(Number(e.target.value))}
                className="w-full accent-[#3DDC97]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-[#07080C] border border-[#1E222B]">
            <div>
              <div className="text-xs text-[#9AA0AE] mb-1">
                عدد الفصول المقسمة (25–40 ص)
              </div>
              <strong className="text-lg font-mono text-[#F2F3F5]">
                {jobEstimate.estimatedParts} فصل مستقل
              </strong>
            </div>
            <div>
              <div className="text-xs text-[#9AA0AE] mb-1">
                الرصيد المطلوب (Page Credits)
              </div>
              <strong className="text-lg font-mono text-[#3DDC97]">
                {jobEstimate.creditCost.totalCreditsRequired} نقطة صفحة
              </strong>
            </div>
            <div>
              <div className="text-xs text-[#9AA0AE] mb-1">
                الزمن التقديري للمعالجة المتوازية
              </div>
              <strong className="text-lg font-mono text-[#F2F3F5]">
                ~{Math.ceil(jobEstimate.estimatedDurationSeconds / 60)} دقيقة
              </strong>
            </div>
            <div>
              <div className="text-xs text-[#9AA0AE] mb-1">
                صيغة التصدير التلقائية
              </div>
              <strong className="text-sm font-mono text-[#F2F3F5]">
                {estimatorPages <= 60 ? 'ملف HTML واحد (<= 400KB)' : 'حزمة ZIP متعددة الفصول + PDF'}
              </strong>
            </div>
          </div>
        </LVCard>
      )}
    </main>
  );
}
