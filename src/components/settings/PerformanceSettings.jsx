import React from "react";
import { BatteryCharging, Boxes, Gauge, Sparkles } from "lucide-react";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { useLocale } from "@/lib/LocaleContext";

const POWER_OPTIONS = [
  { value: "auto", labelAr: "تلقائي", labelEn: "Auto", descAr: "حسب البطارية والجهاز", descEn: "Adapts to battery & device", icon: Gauge },
  { value: "full", labelAr: "كامل", labelEn: "High Perf", descAr: "كل الحركات والانتقالات", descEn: "All transitions & hovers", icon: Sparkles },
  { value: "saver", labelAr: "توفير", labelEn: "Battery Saver", descAr: "أقل بطارية وحرارة", descEn: "Minimum power & thermals", icon: BatteryCharging },
];

const HEAVY_OPTIONS = [
  { value: "auto", labelAr: "تلقائي", labelEn: "Auto", descAr: "حسب قدرات الجهاز", descEn: "By device capability", icon: Gauge },
  { value: "on", labelAr: "تشغيل", labelEn: "On", descAr: "إجبار كل مشاهد 3D", descEn: "Force all 3D scenes", icon: Boxes },
  { value: "off", labelAr: "إيقاف", labelEn: "Off", descAr: "بدون WebGL إطلاقًا", descEn: "No WebGL at all", icon: Boxes },
];

export default function PerformanceSettings() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const { mode, setMode, isPowerSaver, heavy3d, setHeavy3d, heavyEnabled, reason } = usePerformanceMode();

  return (
    <section className="glass-card rounded-3xl p-6 border border-primary/20" dir={dir}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-black text-lg">{isEn ? "Performance & Battery" : "الأداء والبطارية"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isEn ? "Current Mode: " : "الوضع الحالي: "}
            <span className="font-bold text-foreground">
              {isPowerSaver ? (isEn ? "Power Saver" : "توفير الطاقة") : (isEn ? "High Performance" : "أداء كامل")}
            </span>
            {reason ? ` · ${reason}` : ""}
          </p>
        </div>
        <BatteryCharging className="w-5 h-5 text-primary shrink-0" />
      </div>

      {/* Power mode tri-state — controls transitions/hovers/blur tiers */}
      <div className="grid grid-cols-3 gap-2">
        {POWER_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
              className={`rounded-2xl border p-3 text-center transition-colors ${mode === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              <Icon className="w-4 h-4 mx-auto mb-1.5" />
              <span className="block text-xs font-black">{isEn ? opt.labelEn : opt.labelAr}</span>
              <span className="block text-[10px] mt-0.5 opacity-80">{isEn ? opt.descEn : opt.descAr}</span>
            </button>
          );
        })}
      </div>

      {/* Heavy 3D knob — decoupled from power mode (auto never guesses from
          your OS motion preference; manual On/Off always wins). */}
      <div className="mt-5 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-black">{isEn ? "3D Scenes" : "مشاهد الـ 3D"}</h3>
            <p className="text-[11px] text-muted-foreground">
              {isEn
                ? "Saturn, orbits and WebGL visuals — independent from Battery Saver."
                : "زحل والمدارات ومشاهد WebGL — مستقلة تمامًا عن وضع توفير الطاقة."}
            </p>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${heavyEnabled ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" : "text-muted-foreground border-white/15 bg-white/5"}`}>
            {heavyEnabled ? (isEn ? "RUNNING" : "تعمل") : (isEn ? "PARKED" : "متوقفة")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {HEAVY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.value} type="button" onClick={() => setHeavy3d(opt.value)}
                className={`rounded-2xl border p-3 text-center transition-colors ${heavy3d === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                <Icon className="w-4 h-4 mx-auto mb-1.5" />
                <span className="block text-xs font-black">{isEn ? opt.labelEn : opt.labelAr}</span>
                <span className="block text-[10px] mt-0.5 opacity-80">{isEn ? opt.descEn : opt.descAr}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
