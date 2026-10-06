import React from "react";
import { Link } from "react-router-dom";
import { BrainCircuit, ChevronLeft, Flame, Sparkles, Target } from "lucide-react";

export default function SmartMissionPanel({ courses }) {
  const totalChapters = courses.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
  const newest = courses[0];
  const mission = courses.length
    ? `راجع ${newest?.title || "آخر كورس"} وابدأ بكويز سريع قبل ما تكمل.`
    : "ابدأ بأول ملف، وBlack Fighters هيحوّله لخطة مذاكرة كاملة.";

  const cards = [
    { icon: Target, label: "مهمة اليوم", value: mission, tone: "text-primary" },
    { icon: BrainCircuit, label: "ذكاء النظام", value: `${courses.length} كورس • ${totalChapters} فصل جاهزين للمراجعة`, tone: "text-accent" },
    { icon: Flame, label: "وضع الأنمي", value: "Neon focus mode شغال — ذاكر كأنك داخل معركة.", tone: "text-[hsl(var(--neon-green))]" },
  ];

  return (
    <section className="anime-panel relative overflow-hidden glass-card rounded-3xl border border-primary/25 p-5 md:p-6 mb-6 neon-glow-cyan">
      <div className="absolute -left-16 -top-16 w-44 h-44 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="lg:w-64 shrink-0">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold text-primary mb-2">
            <Sparkles className="w-4 h-4" /> مساعد Black Fighters
          </div>
          <h2 className="text-xl font-black">لوحة المهام الذكية</h2>
          <p className="text-sm text-muted-foreground mt-1">اقتراحات فورية عشان تعرف تبدأ منين.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3 flex-1">
          {cards.map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="rounded-2xl border border-border bg-background/35 p-4">
              <Icon className={`w-5 h-5 ${tone} mb-3`} />
              <p className="text-xs text-muted-foreground font-bold mb-1">{label}</p>
              <p className="text-sm font-bold leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
        <Link to={courses.length ? "/review" : "/create"} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-5 py-3 text-sm font-black hover:bg-primary/90 transition-colors">
          ابدأ المهمة <ChevronLeft className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
