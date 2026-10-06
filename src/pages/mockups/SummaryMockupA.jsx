import React from "react";
import { Layers, FileText, Zap } from "lucide-react";

export default function SummaryMockupA() {
  return (
    <div className="min-h-screen bg-[#07080c] text-slate-200 p-6 md:p-12 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 border-b border-cyan-500/20 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold mb-4">
            <Zap className="w-3.5 h-3.5" />
            Dark Neon Scholar (Mockup A)
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Pharmacology: Autonomic Nervous System</h1>
          <p className="text-slate-400">علم الأدوية: الجهاز العصبي اللاإرادي (ملخص شامل)</p>
        </header>

        <div className="space-y-8">
          {/* Section */}
          <section className="relative p-6 rounded-2xl bg-[#0d1117] border border-cyan-500/10 shadow-[0_0_20px_rgba(0,245,255,0.02)]">
            <div className="absolute top-0 right-0 w-1 h-full bg-cyan-500 rounded-r-2xl"></div>
            <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              1. Cholinergic Agonists (محفزات الكولين)
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-4">
              <p>
                <strong className="text-white">التعريف:</strong> هي الأدوية التي تحاكي عمل الـ <span className="text-emerald-400 font-mono bg-emerald-400/10 px-1 rounded">Acetylcholine</span> في الجسم.
              </p>
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/30">
                <strong className="text-cyan-300 block mb-2">💡 نقطة هامة للامتحان:</strong>
                يُمنع استخدام الـ Pilocarpine لمرضى الربو لأنه يسبب تضيق القصبات الهوائية (Bronchoconstriction).
              </div>
            </div>
          </section>

          <section className="relative p-6 rounded-2xl bg-[#0d1117] border border-violet-500/10 shadow-[0_0_20px_rgba(191,95,255,0.02)]">
            <div className="absolute top-0 right-0 w-1 h-full bg-violet-500 rounded-r-2xl"></div>
            <h2 className="text-xl font-bold text-violet-400 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              2. Anticholinergic Drugs (مضادات الكولين)
            </h2>
            <div className="text-slate-300 leading-relaxed space-y-4">
              <p>
                تعمل هذه الأدوية على إغلاق مستقبلات المسكارين. الدواء الأشهر هو <span className="text-amber-400 font-mono bg-amber-400/10 px-1 rounded">Atropine</span>.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>يستخدم في علاج بطء ضربات القلب (Bradycardia).</li>
                <li>يسبب جفاف الفم وتوسع حدقة العين (Mydriasis).</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
