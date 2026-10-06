import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Loader2, TrendingUp, Coins, Crown, Trophy, BookOpen } from "lucide-react";

const CY = "hsl(184 100% 50%)";
const PU = "hsl(270 100% 68%)";
const GR = "hsl(152 100% 50%)";
const GO = "#facc15";

const tooltipStyle = {
  background: "hsl(240 18% 8%)", border: "1px solid hsl(240 15% 20%)",
  borderRadius: 12, fontSize: 12, color: "#fff",
};

// آخر 14 يوم
const last14 = () => {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};
const shortDay = (iso) => iso.slice(5);

function Panel({ title, icon: Icon, color, children }) {
  return (
    <div className="glass-card rounded-3xl p-5 border border-border/50">
      <h3 className="font-black text-sm mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color }} /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: async () => {
      const [users, courses, txns] = await Promise.all([
        base44.entities.User.list("-created_date", 2000),
        base44.entities.Course.filter({}, "-created_date", 2000),
        base44.entities.CreditTransaction.filter({}, "-created_date", 2000).catch(() => []),
      ]);

      const days = last14();

      // نمو المستخدمين (تراكمي) + جدد يومياً
      const newByDay = Object.fromEntries(days.map(d => [d, 0]));
      users.forEach(u => { const d = (u.created_date || "").slice(0, 10); if (d in newByDay) newByDay[d]++; });
      let cumulativeBefore = users.filter(u => {
        const d = (u.created_date || "").slice(0, 10);
        return d && d < days[0];
      }).length;
      const growth = days.map(d => { cumulativeBefore += newByDay[d]; return { day: shortDay(d), جدد: newByDay[d], إجمالي: cumulativeBefore }; });

      // كورسات يومياً
      const courseByDay = Object.fromEntries(days.map(d => [d, 0]));
      courses.forEach(c => { const d = (c.created_date || "").slice(0, 10); if (d in courseByDay) courseByDay[d]++; });
      const coursesChart = days.map(d => ({ day: shortDay(d), كورسات: courseByDay[d] }));

      // الكريدتس المصروفة يومياً (spend سالب)
      const spentByDay = Object.fromEntries(days.map(d => [d, 0]));
      let totalSpent = 0, totalPurchased = 0;
      txns.forEach(tx => {
        const d = (tx.created_date || "").slice(0, 10);
        if (tx.transaction_type === "spend" || tx.amount < 0) {
          const amt = Math.abs(tx.amount || 0);
          totalSpent += amt;
          if (d in spentByDay) spentByDay[d] += amt;
        } else if (tx.amount > 0) {
          totalPurchased += tx.amount || 0;
        }
      });
      const creditsChart = days.map(d => ({ day: shortDay(d), مصروف: spentByDay[d] }));

      // أكثر المستخدمين نشاطاً (حسب XP)
      const topUsers = [...users]
        .sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0))
        .slice(0, 8)
        .map(u => ({ name: (u.full_name || u.email || "؟").slice(0, 14), xp: u.total_xp || 0 }));

      // توزيع الخطط
      const premium = users.filter(u => u.subscription_plan === "premium").length;
      const plans = [
        { name: "Free", value: users.length - premium, color: CY },
        { name: "Premium", value: premium, color: GO },
      ];

      return { growth, coursesChart, creditsChart, topUsers, plans, totalSpent, totalPurchased, totalCredits: users.reduce((s, u) => s + (u.credits || 0), 0) };
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* بطاقات الكريدتس */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-yellow-400/20">
          <Coins className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-black text-yellow-400">{data.totalCredits.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">إجمالي الرصيد المتداول</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-destructive/20">
          <TrendingUp className="w-5 h-5 text-destructive mb-2" />
          <p className="text-2xl font-black text-destructive">{data.totalSpent.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">كريدتس مصروفة (إجمالي)</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-[hsl(152,100%,50%)]/20">
          <Coins className="w-5 h-5 text-[hsl(152,100%,50%)] mb-2" />
          <p className="text-2xl font-black text-[hsl(152,100%,50%)]">{data.totalPurchased.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">كريدتس مكتسبة (إجمالي)</p>
        </div>
      </div>

      {/* نمو المستخدمين */}
      <Panel title="نمو المستخدمين (آخر 14 يوم)" icon={TrendingUp} color={CY}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.growth}>
            <defs>
              <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CY} stopOpacity={0.4} />
                <stop offset="100%" stopColor={CY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} reversed />
            <YAxis tick={{ fontSize: 10, fill: "#888" }} width={30} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="إجمالي" stroke={CY} strokeWidth={2} fill="url(#gTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* أكثر المستخدمين نشاطاً */}
        <Panel title="أكثر المستخدمين نشاطاً (XP)" icon={Trophy} color={GO}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topUsers} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#aaa" }} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="xp" fill={GO} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* توزيع الخطط */}
        <Panel title="توزيع الاشتراكات" icon={Crown} color={PU}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.plans} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                {data.plans.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {data.plans.map(p => (
              <span key={p.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-full" style={{ background: p.color }} /> {p.name}: <b>{p.value}</b>
              </span>
            ))}
          </div>
        </Panel>

        {/* الكورسات يومياً */}
        <Panel title="الكورسات المُنشأة يومياً" icon={BookOpen} color={GR}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.coursesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} reversed />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} width={30} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="كورسات" fill={GR} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* الكريدتس المصروفة يومياً */}
        <Panel title="الكريدتس المصروفة يومياً" icon={Coins} color={GO}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.creditsChart}>
              <defs>
                <linearGradient id="gSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GO} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={GO} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 16%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#888" }} reversed />
              <YAxis tick={{ fontSize: 10, fill: "#888" }} width={30} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="مصروف" stroke={GO} strokeWidth={2} fill="url(#gSpent)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}