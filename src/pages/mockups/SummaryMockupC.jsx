import React from "react";
import { Eye, Target } from "lucide-react";

export default function SummaryMockupC() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 flex justify-center items-start pt-12" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8 opacity-50">
          <span className="text-xs font-mono tracking-widest text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded">ADAPTIVE FOCUS (Mockup C)</span>
          <Eye className="w-4 h-4" />
        </div>

        {/* Focused Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl transition-all hover:border-emerald-500/30">
          <div className="flex items-center gap-3 text-emerald-400 mb-6">
            <Target className="w-6 h-6" />
            <h2 className="text-2xl font-bold text-white">النقاط المحورية: Cholinergic Drugs</h2>
          </div>
          
          <div className="space-y-6 text-lg leading-relaxed text-slate-300">
            <p>
              الأدوية المحفزة تعمل مباشرة (Direct) أو غير مباشرة (Indirect) بوقف إنزيم الـ AChE.
            </p>
            <div className="bg-emerald-950/30 border-l-4 border-emerald-500 p-4 rounded-r-xl">
              <strong className="text-emerald-300 block mb-1">تطبيق سريري (Clinical Application):</strong>
              <span className="text-white">Neostigmine</span> يستخدم لعلاج الوهن العضلي الوبيل (Myasthenia Gravis) لأنه لا يعبر حاجز الدم في الدماغ (BBB).
            </div>
          </div>
        </div>

        {/* Blurred upcoming card */}
        <div className="mt-6 bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 opacity-40 blur-[2px] transition-all hover:blur-none hover:opacity-100 cursor-pointer">
          <h2 className="text-xl font-bold text-slate-400 mb-4">القسم القادم: Anticholinergics</h2>
          <p>اضغط للتركيز على هذا القسم...</p>
        </div>
      </div>
    </div>
  );
}
