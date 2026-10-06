import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Table2, Highlighter, Layers, Award, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { computeSummaryStats } from "@/lib/summaryStats";

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 border border-border/50 flex items-center gap-3"
    >
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
      </div>
    </motion.div>
  );
}

export default function SummaryStatsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["summary-stats"],
    queryFn: computeSummaryStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  if (!data || data.filesProcessed === 0) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center border border-border">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground text-sm">لسه مفيش تلخيصات — ابدأ بأول ملف وهتظهر إحصائياتك هنا</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={FileText} value={data.filesProcessed} label="ملف تمت معالجته" color="bg-primary/15 text-primary" />
        <StatCard icon={Layers} value={data.chapterCount} label="قسم مُلخَّص" color="bg-accent/15 text-accent" />
        <StatCard icon={Table2} value={data.tables} label="جدول مُستخرَج" color="bg-[hsl(184,100%,50%)]/15 text-[hsl(184,100%,50%)]" />
        <StatCard icon={Highlighter} value={data.highlights} label="معلومة مُلوَّنة" color="bg-yellow-400/15 text-yellow-400" />
      </div>

      {/* Quality + table rate */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass-card rounded-2xl p-5 border border-[hsl(152,100%,50%)]/30">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-[hsl(152,100%,50%)]" />
            <span className="font-bold text-sm">نسبة التميز في التلخيص</span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-black text-[hsl(152,100%,50%)]">{data.qualityScore}%</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-l from-[hsl(152,100%,50%)] to-primary transition-colors" style={{ width: `${data.qualityScore}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">مبنية على استخراج الجداول وكثافة المعلومات المهمة</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">مؤشرات الاستخراج</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">أقسام بها جداول</span>
                <span className="font-bold text-[hsl(184,100%,50%)]">{data.tableRate}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[hsl(184,100%,50%)]" style={{ width: `${data.tableRate}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground text-xs">متوسط المعلومات المهمة لكل قسم</span>
              <span className="font-black text-yellow-400">{data.highlightDensity}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent files */}
      {data.recent.length > 0 && (
        <div>
          <p className="text-sm font-bold mb-2 text-muted-foreground">آخر التلخيصات</p>
          <div className="space-y-2">
            {data.recent.map((r) => (
              <div key={r.id} className="glass-card rounded-xl p-3 border border-border/50 flex items-center justify-between gap-3">
                <span className="font-semibold text-sm truncate flex-1" dir="auto">{r.title}</span>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="flex items-center gap-1 text-accent"><Layers className="w-3 h-3" /> {r.chapterCount}</span>
                  <span className="flex items-center gap-1 text-[hsl(184,100%,50%)]"><Table2 className="w-3 h-3" /> {r.tables}</span>
                  <span className="flex items-center gap-1 text-yellow-400"><Highlighter className="w-3 h-3" /> {r.highlights}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}