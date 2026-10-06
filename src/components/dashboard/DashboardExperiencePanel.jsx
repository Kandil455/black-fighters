import React from "react";
import { motion } from "framer-motion";
import { Orbit } from "lucide-react";
import SaturnCosmos3D from "@/components/dashboard/SaturnCosmos3D";
import EfficiencyRail from "@/components/dashboard/EfficiencyRail";

export default function DashboardExperiencePanel({ courses }) {
  const chapters = courses.reduce((sum, c) => sum + (c.chapters?.length || c.total_lessons || 0), 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="ios-glass-card relative mb-6 overflow-hidden rounded-3xl border border-white/15 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
    >
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      
      <div className="relative grid gap-6 lg:grid-cols-[300px_1fr_330px] lg:items-center">
        {/* Saturn 3D Cosmos */}
        <div className="flex justify-center">
          <SaturnCosmos3D power={courses.length} />
        </div>

        {/* Info & Stats */}
        <div>
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3.5 py-1 text-xs font-black text-primary shadow-sm">
            <Orbit className="h-4 w-4 animate-spin" style={{ animationDuration: '10s' }} />
            <span>مدار الإنجاز والمتابعة</span>
          </div>
          
          <h2 className="text-2xl font-black md:text-3xl font-heading text-foreground tracking-tight">
            مساحة التركيز والتحصيل الفلكي
          </h2>
          
          <p className="mt-2.5 max-w-xl text-xs sm:text-sm leading-relaxed text-muted-foreground font-medium">
            نظام متكامل يرصد زخم مذاكرتك وسرعة إنجازك في الوقت الفعلي، مع وصول فوري لكل المحاضرات والملفات بدون تشتيت.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
              <b className="text-lg font-black text-primary block">{courses.length}</b>
              <span className="text-[11px] text-muted-foreground font-bold">كورس نشط</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
              <b className="text-lg font-black text-accent block">{chapters}</b>
              <span className="text-[11px] text-muted-foreground font-bold">فصل دراسي</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur-md">
              <b className="text-lg font-black text-[hsl(152,100%,50%)] block">100%</b>
              <span className="text-[11px] text-muted-foreground font-bold">جاهزية النظام</span>
            </div>
          </div>
        </div>

        {/* Shortcuts / Quick Actions */}
        <EfficiencyRail courses={courses} />
      </div>
    </motion.section>
  );
}
