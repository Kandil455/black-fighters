import React from 'react';
import { Check } from '@/components/ui/animatedIcons';

const STEPS_AR = ['رفع الملف', 'تلخيص الذكاء الاصطناعي', 'مراجعة وحفظ'];
const STEPS_EN = ['Upload File', 'AI Summarization', 'Review & Save'];

export default function CreateCourseIntro({ isEn, step }) {
  const steps = isEn ? STEPS_EN : STEPS_AR;
  return (
    <div className="space-y-4">
      <div className="bf-hd">
        <span className="mono">
          {isEn ? "UPLOAD LECTURE" : "رفع محاضرة"}
        </span>
        <h1 className="serif">
          {isEn ? "Upload your lecture, choose " : "ارفع المحاضرة، واختار "}
          <em style={{ color: "var(--sig)" }}>
            {isEn ? "what you need." : "اللي محتاجه."}
          </em>
        </h1>
        <p style={{ color: "var(--mute)", fontSize: "0.92rem" }}>
          {isEn
            ? "PDF, presentation slides or documents. Select actions and preview estimated credits before starting."
            : "PDF أو سلايدات أو صور ومستندات. اختار العمليات وشوف التكلفة قبل ما تبدأ."}
        </p>
      </div>

      <div className="card" style={{ padding: "12px 16px", gap: 8 }}>
        <div className="flex items-center gap-2">
          {steps.map((label, index) => (
            <React.Fragment key={label}>
              <div
                className="flex items-center gap-2 text-xs font-semibold"
                style={{
                  color: index <= step ? "var(--ink)" : "var(--mute)",
                }}
              >
                <div
                  className="mono flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                  style={{
                    background: index < step ? "var(--sig)" : index === step ? "var(--paper)" : "transparent",
                    color: index < step ? "var(--sigink)" : "inherit",
                    borderColor: index <= step ? "var(--sig)" : "var(--line)",
                  }}
                >
                  {index < step ? <Check className="h-3 w-3 stroke-[3]" /> : index + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className="h-0.5 flex-1 rounded-full"
                  style={{
                    background: index < step ? "var(--sig)" : "var(--line)",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
