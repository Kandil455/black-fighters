import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Sliders, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

export function SwitchShowcase() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [s1, setS1] = useState(true);
  const [s2, setS2] = useState(true);
  const [s3, setS3] = useState(true);

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-7 border border-primary/25 space-y-6 shadow-xl select-none" dir={dir}>
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-black text-base sm:text-lg font-heading">
            <Sliders className="w-5 h-5 text-primary" />
            <span>{isEn ? "Switch Studio (Showcase)" : "معرض أزرار التبديل (Switch Studio)"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEn 
              ? "All switch controls across the platform are precision-aligned with smooth physics for both LTR and RTL layouts."
              : "تم إصلاح أبعاد ومحاذاة جميع الأزرار عبر المنصة لمنع خروج الدائرة عن المسار في اللغات العربية (RTL)."}
          </p>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Pixel Perfect</span>
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Style 1: iOS Neon Glass (Default) */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-primary/40 transition-colors flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">1. iOS 18 Neon Glass</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-cyan-300 font-mono font-bold">
                {isEn ? "Default" : "الافتراضي"}
              </span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              {isEn 
                ? "Clean ergonomic Apple design with adaptive theme neon glow and anchored physics."
                : "تصميم أبل العصري المريح للعين مع وهج النيون المتوافق مع ثيم الصفحة وتثبيت الإحداثيات لمنع خروج الدائرة تماماً."}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs font-mono text-white/70">
              {s1 ? (isEn ? "Active (ON)" : "تفعيل (ON)") : (isEn ? "Disabled (OFF)" : "تعطيل (OFF)")}
            </span>
            <Switch variant="default" checked={s1} onCheckedChange={setS1} />
          </div>
        </div>

        {/* Style 2: Cyberpunk Fighter */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-cyan-500/20 hover:border-cyan-500/40 transition-colors flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-300">2. Cyberpunk Fighter</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">Black Fighters Elite</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              {isEn 
                ? "Futuristic design with carbon accents, kinetic gradient, and glowing internal energy indicators."
                : "تصميم مستقبلي بحواف كربونية وتدرج نيون حركي مع أيقونة طاقة داخلية (⚡/○) تضيء عند التفعيل."}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs font-mono text-cyan-300/80">
              {s2 ? (isEn ? "Max Power" : "طاقة قصوى") : (isEn ? "Idle" : "وضع الخمول")}
            </span>
            <Switch variant="cyberpunk" checked={s2} onCheckedChange={setS2} />
          </div>
        </div>

        {/* Style 3: Transform-only Motion Switch */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-amber-500/20 hover:border-amber-500/40 transition-colors flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300">3. Motion (CSS)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                {isEn ? "Alpha's Switch 🥋" : "زر Alpha 🥋"}
              </span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              {isEn
                ? "Compositor-only transform transition: no animation JSON to download, no per-frame repaint."
                : "حركة CSS على الـtransform فقط: مفيش ملف أنيميشن يتحمّل، ومفيش إعادة رسم كل فريم."}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs font-mono text-amber-300/80">
              {s3 ? (isEn ? "Active" : "نشط") : (isEn ? "Standby" : "متوقف")}
            </span>
            <Switch variant="default" checked={s3} onCheckedChange={setS3} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SwitchShowcase;
