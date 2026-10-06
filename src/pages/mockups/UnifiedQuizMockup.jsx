import React from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

export default function UnifiedQuizMockup() {
  return (
    <div className="min-h-screen bg-[#07080c] flex items-center justify-center p-4 font-sans text-white" dir="rtl">
      <div className="w-full max-w-3xl bg-[#0d1117] border border-cyan-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold">12</div>
            <div>
              <div className="text-xs text-slate-400">سؤال 12 من 50</div>
              <div className="text-sm font-bold">Pharmacology Midterm</div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-mono bg-rose-500/10 text-rose-400 px-2 py-1 rounded border border-rose-500/20">45:12</span>
          </div>
        </header>

        {/* Question Body */}
        <div className="p-8 flex-1">
          <h2 className="text-xl md:text-2xl font-bold leading-relaxed mb-8">
            أي من الأدوية التالية يعتبر الاختيار الأول لعلاج صدمة الحساسية (Anaphylactic Shock)؟
          </h2>
          
          <div className="space-y-3">
            {/* Option A (Selected & Correct for mockup purposes) */}
            <button className="w-full text-right p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 flex items-center justify-between transition-all">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">أ</span>
                <span className="text-lg">Epinephrine</span>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </button>
            
            {/* Option B */}
            <button className="w-full text-right p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-between transition-all">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold">ب</span>
                <span className="text-lg">Norepinephrine</span>
              </div>
            </button>
            
            {/* Option C */}
            <button className="w-full text-right p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-between transition-all">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold">ج</span>
                <span className="text-lg">Dopamine</span>
              </div>
            </button>
            
            {/* Option D */}
            <button className="w-full text-right p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-between transition-all">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-bold">د</span>
                <span className="text-lg">Dobutamine</span>
              </div>
            </button>
          </div>

          {/* Explanation Box */}
          <div className="mt-8 p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4" /> التفسير العلمي
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              الإبينفرين (Epinephrine) هو العلاج المنقذ للحياة في حالة صدمة الحساسية لأنه يحفز مستقبلات ألفا وبيتا، مما يؤدي إلى رفع ضغط الدم وتوسيع الشعب الهوائية بشكل فوري.
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <footer className="p-4 border-t border-white/5 flex items-center justify-between bg-black/20">
          <button className="px-6 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2">
            <ChevronRight className="w-4 h-4" /> السابق
          </button>
          <button className="px-6 py-2 rounded-lg text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-black flex items-center gap-2">
            التالي <ChevronLeft className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
}
