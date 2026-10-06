import React from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Clock } from "lucide-react";

function buildSubjectHours(results = []) {
  const map = {};
  results.forEach((result) => {
    const subject = result.subject || "غير مصنف";
    map[subject] = (map[subject] || 0) + ((result.time_seconds || 0) / 3600);
  });
  return Object.entries(map)
    .map(([subject, hours]) => ({ subject, hours: Number(hours.toFixed(2)) }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);
}

const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-3 py-2 border border-primary/30 text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-primary">{payload[0].value} ساعة</p>
    </div>
  );
};

export default function SubjectHoursChart({ results }) {
  const data = buildSubjectHours(results);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6 border border-primary/30 neon-glow-cyan">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-5 h-5 text-primary" />
        <h2 className="font-extrabold">الساعات حسب المادة</h2>
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 12, left: 40, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(240 8% 62%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="subject" tick={{ fill: "hsl(240 8% 72%)", fontSize: 12 }} axisLine={false} tickLine={false} width={82} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "hsl(184 100% 50% / 0.08)" }} />
            <Bar dataKey="hours" fill="hsl(184 100% 50%)" radius={[0, 10, 10, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex items-center justify-center text-center text-sm text-muted-foreground">
          ابدأ كويزاتك عشان نحسب وقتك لكل مادة بدقة.
        </div>
      )}
    </motion.div>
  );
}