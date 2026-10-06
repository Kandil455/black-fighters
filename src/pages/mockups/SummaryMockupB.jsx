import React from "react";
import { BookMarked, ArrowLeft } from "lucide-react";

export default function SummaryMockupB() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 p-6 md:p-12 font-serif" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-16 rounded-sm shadow-xl border border-slate-200">
        <header className="mb-12 text-center">
          <div className="text-xs font-sans tracking-widest text-slate-400 uppercase mb-4">Premium Paper (Mockup B)</div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 font-sans">علم الأدوية: الجهاز العصبي</h1>
          <div className="w-16 h-1 bg-slate-900 mx-auto"></div>
        </header>

        <article className="prose prose-slate prose-lg max-w-none font-sans">
          <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-100 pb-2 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-slate-400" />
            1. منبهات الكولين (Cholinergic Agonists)
          </h2>
          <p className="text-slate-600 leading-loose">
            تعتبر هذه الأدوية حجر الزاوية في محاكاة الناقل العصبي <strong>Acetylcholine</strong>. تنقسم إلى نوعين أساسيين: تعمل مباشرة على المستقبلات، أو تمنع تكسير الناقل العصبي.
          </p>
          
          <blockquote className="border-r-4 border-slate-800 pr-4 my-6 italic text-slate-700 bg-slate-50 py-3 rounded-l-lg">
            "يُعد دواء البيلوكاربين (Pilocarpine) الدواء المفضل لعلاج الجلوكوما المفتوحة، لكنه يحمل خطر تضيق القصبات الهوائية."
          </blockquote>

          <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mt-12 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-slate-400" />
            2. مضادات الكولين (Anticholinergics)
          </h2>
          <p className="text-slate-600 leading-loose">
            عائلة من الأدوية التي ترتبط بمستقبلات المسكارين وتمنع الـ Acetylcholine من الارتباط بها. الأتروبين (<strong>Atropine</strong>) هو النموذج الأبرز لهذه المجموعة.
          </p>
          <ul className="space-y-3 mt-4">
            <li className="flex gap-2 items-start"><ArrowLeft className="w-5 h-5 text-slate-400 shrink-0 mt-1" /> يعاكس هبوط القلب.</li>
            <li className="flex gap-2 items-start"><ArrowLeft className="w-5 h-5 text-slate-400 shrink-0 mt-1" /> يسبب جفاف الإفرازات (Xerostomia).</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
