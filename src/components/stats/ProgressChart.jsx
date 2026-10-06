import React from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Clock, CheckSquare } from "lucide-react";

// Build last-14-days series, filling missing days with zeros
function buildSeries(activities) {
  const map = {};
  activities.forEach((a) => { map[a.date] = a; });
  const out = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const a = map[key] || {};
    out.push({
      date: key,
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      minutes: a.minutes || 0,
      questions: a.questions_answered || 0,
    });
  }
  return out;
}

const TooltipBox = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-xl px-3 py-2 border border-border text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold">{payload[0].value} {unit}</p>
    </div>
  );
};

export default function ProgressChart({ activities }) {
  const data = buildSeries(activities);

  return (
    <div className="grid lg:grid-cols-2 gap-5 mt-8">
      {/* Study minutes */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6 border border-primary/30 neon-glow-cyan">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="font-extrabold">دقائق المذاكرة (آخر 14 يوم)</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(184 100% 50%)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="hsl(184 100% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "hsl(240 8% 62%)", fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fill: "hsl(240 8% 62%)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip content={<TooltipBox unit="دقيقة" />} cursor={{ stroke: "hsl(184 100% 50%)", strokeOpacity: 0.2 }} />
            <Area type="monotone" dataKey="minutes" stroke="hsl(184 100% 50%)" strokeWidth={2.5} fill="url(#gMin)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Questions answered */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card rounded-3xl p-6 border border-accent/30 neon-glow-purple">
        <div className="flex items-center gap-2 mb-5">
          <CheckSquare className="w-5 h-5 text-accent" />
          <h2 className="font-extrabold">أسئلة محلولة (آخر 14 يوم)</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "hsl(240 8% 62%)", fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fill: "hsl(240 8% 62%)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
            <Tooltip content={<TooltipBox unit="سؤال" />} cursor={{ fill: "hsl(270 100% 68% / 0.1)" }} />
            <Bar dataKey="questions" fill="hsl(270 100% 68%)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}