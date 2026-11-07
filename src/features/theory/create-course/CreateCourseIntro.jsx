import React from 'react';
import { Check } from 'lucide-react';
import { SummaryNoteIcon } from "@/components/ui/icons";
import CreditCostBadge from '@/components/CreditCostBadge';
import { calculateSummaryCost } from '@/lib/economyCatalog';

const STEPS_AR = ['رفع الملف', 'تلخيص الـ AI', 'مراجعة وحفظ'];
const STEPS_EN = ['Upload File', 'AI Summary', 'Review & Save'];

export default function CreateCourseIntro({ isEn, step, pendingTextLength = 0 }) {
  const steps = isEn ? STEPS_EN : STEPS_AR;
  return (
    <>
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 px-3 py-1 font-mono text-[10px] font-black tracking-widest text-cyan-400 ios-glass-pill">
          <span className="pulse-dot h-1.5 w-1.5" />
          <span>AI SUMMARIZER ENGINE</span>
        </div>
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 shadow-lg shadow-cyan-500/10">
            <SummaryNoteIcon size={26} />
          </div>
          <h1 className="studio-headline-gradient heading-display text-3xl font-black text-foreground sm:text-4xl">
            {isEn ? 'Create Summary' : 'أنشئ تلخيص المحاضرات والمذكرات'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {isEn ? 'Upload your lecture file or paste notes, and AI will summarize it with high precision.' : 'ارفع ملف المحاضرة أو الصق النص، والذكاء الاصطناعي هيلخّصه فوراً بدقة عالية'}
          </p>
          <CreditCostBadge cost={pendingTextLength ? calculateSummaryCost(pendingTextLength) : 2} label={isEn ? 'Cost by size' : 'التكلفة حسب الحجم'} variant="pill" />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
        {steps.map((label, index) => (
          <React.Fragment key={label}>
            <div className={`flex items-center gap-2 text-xs font-bold sm:text-sm ${index <= step ? 'text-cyan-400' : 'text-muted-foreground'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-xl border font-mono text-xs transition-colors duration-300 ${index < step ? 'border-cyan-400 bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,245,255,0.4)]' : index === step ? 'border-cyan-400 bg-cyan-500/15 text-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.3)]' : 'border-white/10 bg-white/[0.02]'}`}>
                {index < step ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : index + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {index < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${index < step ? 'bg-gradient-to-r from-cyan-500 to-violet-500' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
