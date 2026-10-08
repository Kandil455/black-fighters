import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Check, Trash2, Loader2, BookOpen, Users,
  Crown, Key, Search, ChevronDown, ChevronUp, Lock, Unlock,
  BarChart3, RefreshCw, Calendar, Zap, Wand2, Coins, Copy, Ticket, Wallet,
  Filter, Flag, ShieldAlert, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS } from "@/lib/models";
import { testAiKey } from "@/lib/ai";
import ProviderModelPicker from "@/components/settings/ProviderModelPicker";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import ActivationCodesManager from "@/components/admin/ActivationCodesManager";
import PaymentRequestsManager from "@/components/admin/PaymentRequestsManager";
import EmergencyContentManager from "@/components/admin/EmergencyContentManager";
import { AdminFunnelView, AdminFlaggedQuestionsView } from "@/components/admin/AdminFunnelAndQuality";
import BottomSheetSelect from "@/components/ui/BottomSheetSelect";
import { LineChart, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebaseDb";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const COLORS = {
  gold: "border-yellow-400/40 text-yellow-400",
  purple: "border-purple-400/40 text-purple-400",
  green: "border-[hsl(152,100%,50%)]/40 text-[hsl(152,100%,50%)]",
  blue: "border-primary/40 text-primary",
  red: "border-destructive/40 text-destructive",
};

/**
 * Admin navigation, grouped.
 *
 * It used to be nine equal buttons in one flat wrapping row, so "delete an
 * activation code" and "review flagged questions" looked like the same kind of
 * action as "browse analytics". Grouping them by intent — what happened /
 * who / content & keys — makes the panel scannable, and the groups scroll
 * horizontally on narrow screens instead of reflowing into four ragged rows.
 */
const ADMIN_GROUPS = [
  {
    id: "monitor",
    labelAr: "المتابعة",
    labelEn: "Monitor",
    tabs: [
      { id: "overview", labelAr: "نظرة عامة", labelEn: "Overview", icon: BarChart3 },
      { id: "analytics", labelAr: "إحصائيات ورسوم", labelEn: "Analytics", icon: LineChart },
      { id: "funnel", labelAr: "مسار التحويل", labelEn: "Funnel", icon: Filter },
    ],
  },
  {
    id: "people",
    labelAr: "الناس والفلوس",
    labelEn: "People & money",
    tabs: [
      { id: "users", labelAr: "المستخدمين", labelEn: "Users", icon: Users },
      { id: "payments", labelAr: "طلبات الدفع", labelEn: "Payments", icon: Wallet, badgeKey: "pendingPayments" },
      { id: "codes", labelAr: "أكواد التفعيل", labelEn: "Codes", icon: Ticket },
    ],
  },
  {
    id: "content",
    labelAr: "المحتوى والجودة",
    labelEn: "Content & quality",
    tabs: [
      { id: "flags", labelAr: "بلاغات الأسئلة", labelEn: "Question flags", icon: Flag, badgeKey: "flags" },
      { id: "emergency", labelAr: "محتوى الطوارئ", labelEn: "Emergency", icon: ShieldAlert },
      { id: "keys", labelAr: "مفاتيح الـ AI", labelEn: "AI keys", icon: Key },
    ],
  },
];

function Tab({ label, active, onClick, icon: Icon, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors ${
        active ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="min-w-4 rounded-full bg-orange-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FeatureSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 p-3 bg-background/30">
      <span className="text-xs font-bold">{label}</span>
      <Switch checked={!!checked} onCheckedChange={onChange} />
    </div>
  );
}

function UserRow({ user: u, onUpdate, pendingPayment, onApprovePayment }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: u.full_name || "",
    credits: u.credits ?? 0,
    daily_file_limit: u.daily_file_limit ?? (u.subscription_plan === "premium" ? 0 : 2),
    quiz_daily_limit: u.quiz_daily_limit ?? (u.subscription_plan === "premium" ? 0 : 2),
    subscription_plan: u.subscription_plan || "free",
    subscription_label: u.subscription_label || (u.subscription_plan === "premium" ? "Premium" : "Free"),
    subscription_color: u.subscription_color || (u.subscription_plan === "premium" ? "gold" : "blue"),
    avatar_url: u.avatar_url || "",
    profile_emoji: u.profile_emoji || (u.subscription_plan === "premium" ? "👑" : "🎓"),
    profile_animation: u.profile_animation || "none",
    theme_effect: u.theme_effect || "default",
    feature_ai_chat: u.feature_ai_chat ?? u.subscription_plan === "premium",
    feature_pdf_tools: u.feature_pdf_tools ?? true,
    feature_quizzes: u.feature_quizzes ?? true,
    feature_flashcards: u.feature_flashcards ?? true,
    feature_animated_emoji: u.feature_animated_emoji ?? u.subscription_plan === "premium",
  });

  const isPremium = u.subscription_plan === "premium";
  const isAdminUser = u.role === "admin";
  const isLocked = u.is_locked;
  const colorClass = COLORS[u.subscription_color || form.subscription_color] || COLORS.blue;
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.User.update(u.id, {
        ...form,
        credits: Number(form.credits),
        daily_file_limit: Number(form.daily_file_limit),
        quiz_daily_limit: Number(form.quiz_daily_limit),
        avatar_url: form.avatar_url?.trim() || null,
      });
      toast.success("تم حفظ تعديلات المستخدم ✅");
      onUpdate();
    } catch (e) {
      toast.error(e.message || "حصل خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const quickUpdate = async (updates, ok) => {
    try {
      await base44.entities.User.update(u.id, updates);
      toast.success(ok || "تم ✅");
      onUpdate();
    } catch (e) {
      toast.error(e.message || "حصل خطأ");
    }
  };

  const togglePremium = () => quickUpdate({
    subscription_plan: isPremium ? "free" : "premium",
    subscription_status: isPremium ? "inactive" : "active",
    is_pro: !isPremium,
    subscription_plan_key: isPremium ? "free" : "pro",
    subscription_label: isPremium ? "Free" : (form.subscription_label || "Premium"),
    subscription_color: isPremium ? "blue" : (form.subscription_color || "gold"),
    daily_file_limit: isPremium ? 2 : 0,
    quiz_daily_limit: isPremium ? 2 : 0,
    feature_ai_chat: !isPremium,
    feature_animated_emoji: !isPremium,
  }, isPremium ? "تم إرجاعه لـ Free" : "تمت ترقيته لـ Premium 👑");

  const upgradeToPlan = (planKey) => {
    const plansMap = {
      starter: { label: "Starter", color: "blue", credits: 500, tokens: 500_000 },
      pro: { label: "Pro", color: "purple", credits: 1500, tokens: 1_500_000 },
      supreme: { label: "Supreme", color: "gold", credits: 3000, tokens: 3_000_000 },
    };
    const p = plansMap[planKey] || plansMap.pro;
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    quickUpdate({
      subscription_plan: "premium",
      subscription_status: "active",
      subscription_plan_key: planKey,
      is_pro: true,
      subscription_label: p.label,
      subscription_color: p.color,
      subscription_expires_at: expiresAt,
      credits: (Number(form.credits) || 0) + p.credits,
      token_balance: (Number(u.token_balance) || 0) + p.tokens,
      daily_file_limit: 0,
      quiz_daily_limit: 0,
      feature_ai_chat: true,
      feature_pdf_tools: true,
      feature_quizzes: true,
      feature_flashcards: true,
      feature_animated_emoji: true,
    }, `تمت الترقية لباقة ${p.label} (+${p.credits} كريدت و +${(p.tokens/1000).toFixed(0)}K توكن) 👑`);
  };

  const addCredits = async (amount) => {
    const newTotal = (form.credits || 0) + amount;
    set("credits", newTotal);
    try {
      await base44.entities.User.update(u.id, { credits: newTotal });
      toast.success(`تم إضافة ${amount} كريدت ✅`);
      onUpdate();
    } catch (e) {
      set("credits", form.credits - amount);
      toast.error(e.message || "حصل خطأ");
    }
  };

  return (
    <div className={`glass-card rounded-2xl border transition-colors ${isLocked ? "border-destructive/30 bg-destructive/5" : isPremium ? "border-yellow-400/30" : "border-border/40"}`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden border ${isAdminUser ? "bg-accent/20 border-accent/30" : isPremium ? "bg-yellow-400/20 border-yellow-400/30" : "bg-primary/10 border-primary/20"}`}>
          {u.avatar_url ? <img src={u.avatar_url} alt={u.full_name || u.email} className="w-full h-full object-cover" /> : (u.profile_emoji || form.profile_emoji || (u.full_name || u.email || "?")[0].toUpperCase())}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm truncate">{u.full_name || "—"}</span>
            {isAdminUser && <Badge variant="outline" className="text-[10px] border-accent/40 text-accent py-0 h-4">أدمن</Badge>}
            <Badge variant="outline" className={`text-[10px] py-0 h-4 ${colorClass}`}>{u.profile_emoji || form.profile_emoji} {u.subscription_label || (isPremium ? "Premium" : "Free")}</Badge>
            {isLocked && <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive py-0 h-4">🔒 مقفول</Badge>}
            {pendingPayment && (
              <Badge variant="outline" className="text-[10px] border-orange-400/80 bg-orange-500/10 text-orange-400 py-0 h-4 font-bold animate-pulse">
                💳 طلب معلق: {pendingPayment.plan_name || `${pendingPayment.amount} ج`}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          <button
            onClick={() => { navigator.clipboard.writeText(u.id); toast.success("تم نسخ الـ ID ✅"); }}
            title="اضغط لنسخ الـ ID"
            className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70 hover:text-primary transition-colors max-w-full"
          >
            <Copy className="w-3 h-3 shrink-0" />
            <span className="truncate" dir="ltr">{u.id}</span>
          </button>
        </div>

        {/* تعديل سريع مباشر للكريديتس وحد الملفات من نفس الصف */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-yellow-400/30 bg-yellow-400/5 px-2 py-1" title="الكريديتس">
            <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <input
              type="number" min="0"
              value={form.credits}
              onChange={(e) => set("credits", e.target.value)}
              onBlur={() => quickUpdate({ credits: Number(form.credits) }, "تم تحديث الكريديتس ✅")}
              className="w-14 bg-transparent text-xs font-bold text-yellow-400 outline-none text-center"
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/5 px-2 py-1" title={Number(form.daily_file_limit) === 0 ? "حد الملفات: غير محدود (مفتوح)" : `حد الملفات: ${form.daily_file_limit} يومياً`}>
            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            <input
              type="number" min="0"
              value={form.daily_file_limit}
              onChange={(e) => set("daily_file_limit", e.target.value)}
              onBlur={() => quickUpdate({ daily_file_limit: Number(form.daily_file_limit) }, "تم تحديث حد الملفات ✅")}
              className="w-10 bg-transparent text-xs font-bold text-primary outline-none text-center"
            />
            {Number(form.daily_file_limit) === 0 && (
              <span className="text-[10px] text-primary font-bold">∞</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Zap className="w-3 h-3" />{u.total_xp || 0}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => quickUpdate({ is_locked: !isLocked }, isLocked ? "تم فتح الحساب" : "تم قفل الحساب")}
            className={`h-8 px-2 ${isLocked ? "text-[hsl(152,100%,50%)]" : "text-muted-foreground hover:text-destructive"}`}>
            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)} className="h-8 px-2 text-muted-foreground">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-4">
          {pendingPayment && (
            <div className="rounded-2xl border border-orange-400/40 bg-orange-400/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-xs font-black text-orange-300">طلب اشتراك معلق ({pendingPayment.plan_name || "خطة"}) بمبلغ {pendingPayment.amount} ج</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">الوسيلة: {pendingPayment.method} · الرقم المحول منه: <b className="font-mono text-foreground" dir="ltr">{pendingPayment.sender_number}</b></p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-[hsl(152,100%,50%)] hover:bg-[hsl(152,100%,45%)] text-slate-950 font-black gap-1.5 h-8 text-xs shadow-sm"
                    onClick={async () => {
                      try {
                        const res = await base44.functions.invoke("approvePaymentRequest", { request_id: pendingPayment.id, action: "approve", delivery_mode: "direct" });
                        if (res?.data?.success) {
                          toast.success("تم قبول الطلب وتفعيل الحساب مباشرة ✅");
                          onApprovePayment?.();
                        } else {
                          toast.error(res?.data?.error || "حصل خطأ");
                        }
                      } catch (e) {
                        toast.error(e.message || "حصل خطأ في التفعيل");
                      }
                    }}
                  >
                    <Check className="w-3.5 h-3.5" /> قبول وتفعيل مباشر
                  </Button>
                </div>
              </div>
              {pendingPayment.screenshot_url && (
                <div className="pt-2 border-t border-orange-400/20">
                  <a href={pendingPayment.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" /> عرض إيصال التحويل المرفوع 📸
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="اسم المستخدم"><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} className="h-9" /></Field>
            <Field label="الكريدتس" hint="رصيد الكريدتس">
              <div className="flex gap-1">
                <Input type="number" min="0" max="99999" value={form.credits} onChange={e => set("credits", e.target.value)} className="h-9 flex-1" />
                <Button size="sm" variant="outline" onClick={() => addCredits(50)} className="h-9 text-[10px] font-bold shrink-0">+50</Button>
                <Button size="sm" variant="outline" onClick={() => addCredits(100)} className="h-9 text-[10px] font-bold shrink-0">+100</Button>
                <Button size="sm" variant="outline" onClick={() => addCredits(500)} className="h-9 text-[10px] font-bold shrink-0">+500</Button>
              </div>
            </Field>
            <Field label="حد الملفات اليومي" hint="0 = مفتوح"><Input type="number" min="0" max="999" value={form.daily_file_limit} onChange={e => set("daily_file_limit", e.target.value)} className="h-9" /></Field>
            <Field label="حد الكويزات اليومي" hint="0 = مفتوح"><Input type="number" min="0" max="999" value={form.quiz_daily_limit} onChange={e => set("quiz_daily_limit", e.target.value)} className="h-9" /></Field>
            <Field label="اسم الاشتراك"><Input value={form.subscription_label} onChange={e => set("subscription_label", e.target.value)} placeholder="VIP / Premium / Pro" className="h-9" /></Field>
            <Field label="لون الاشتراك">
              <BottomSheetSelect
                title="لون الاشتراك"
                value={form.subscription_color}
                onChange={(v) => set("subscription_color", v)}
                options={[
                  { value: "gold", label: "ذهبي" },
                  { value: "purple", label: "بنفسجي" },
                  { value: "green", label: "أخضر" },
                  { value: "blue", label: "أزرق" },
                  { value: "red", label: "أحمر" },
                ]}
              />
            </Field>
            <Field label="إيموجي البروفايل"><Input value={form.profile_emoji} maxLength={4} onChange={e => set("profile_emoji", e.target.value)} className="h-9" /></Field>
            <Field label="أنيميشن الإيموجي">
              <BottomSheetSelect
                title="أنيميشن الإيموجي"
                value={form.profile_animation}
                onChange={(v) => set("profile_animation", v)}
                options={[
                  { value: "none", label: "بدون" },
                  { value: "pulse", label: "Pulse" },
                  { value: "bounce", label: "Bounce" },
                  { value: "glow", label: "Glow" },
                  { value: "spin", label: "Spin" },
                ]}
              />
            </Field>
            <Field label="تأثير الثيم">
              <BottomSheetSelect
                title="تأثير الثيم"
                value={form.theme_effect}
                onChange={(v) => set("theme_effect", v)}
                options={[
                  { value: "default", label: "Default" },
                  { value: "neon", label: "Neon" },
                  { value: "anime", label: "Anime" },
                  { value: "vip", label: "VIP" },
                ]}
              />
            </Field>
            <Field label="رابط صورة/شخصية" hint="اختياري"><Input value={form.avatar_url} onChange={e => set("avatar_url", e.target.value)} placeholder="https://..." className="h-9" /></Field>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <FeatureSwitch label="AI Chat" checked={form.feature_ai_chat} onChange={v => set("feature_ai_chat", v)} />
            <FeatureSwitch label="PDF Tools" checked={form.feature_pdf_tools} onChange={v => set("feature_pdf_tools", v)} />
            <FeatureSwitch label="Quizzes" checked={form.feature_quizzes} onChange={v => set("feature_quizzes", v)} />
            <FeatureSwitch label="Flashcards" checked={form.feature_flashcards} onChange={v => set("feature_flashcards", v)} />
            <FeatureSwitch label="Emoji FX" checked={form.feature_animated_emoji} onChange={v => set("feature_animated_emoji", v)} />
          </div>

          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" variant="outline" onClick={togglePremium} className={`gap-1.5 ${isPremium ? "border-destructive/40 text-destructive" : "border-yellow-400/40 text-yellow-400"}`}><Crown className="w-3.5 h-3.5" />{isPremium ? "إزالة Premium" : "ترقية Premium"}</Button>
              <Button size="sm" variant="outline" onClick={() => upgradeToPlan("starter")} className="gap-1 border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs font-bold">⚡ Starter (49ج)</Button>
              <Button size="sm" variant="outline" onClick={() => upgradeToPlan("pro")} className="gap-1 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 text-xs font-bold">⭐ Pro (89ج)</Button>
              <Button size="sm" variant="outline" onClick={() => upgradeToPlan("supreme")} className="gap-1 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/10 text-xs font-bold">👑 Supreme (149ج)</Button>
              <Button size="sm" variant="outline" onClick={() => quickUpdate({ role: isAdminUser ? "user" : "admin" }, isAdminUser ? "تمت إزالة صلاحية الأدمن" : "أصبح أدمن")} className="gap-1.5 border-accent/40 text-accent"><Shield className="w-3.5 h-3.5" />{isAdminUser ? "إزالة الأدمن" : "اجعله أدمن"}</Button>
            </div>
            <Button size="sm" onClick={save} disabled={saving} className="gap-2"><Check className="w-4 h-4" />{saving ? "جاري الحفظ..." : "حفظ كل التعديلات"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useAuth();
  const [tab, setTab] = useState("overview");
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [search, setSearch] = useState("");

  const { data: configs = [], isLoading: configsLoading } = useQuery({
    queryKey: ["adminConfigs"],
    queryFn: () => base44.entities.AdminConfig.filter({}, "-created_date", 50),
    enabled: !!isAdmin,
  });

  const { data: allUsers = [], refetch: refetchUsers, isFetching: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!isAdmin && tab === "users",
  });

  const { data: allPayments = [], refetch: refetchPayments } = useQuery({
    queryKey: ["adminAllPayments"],
    queryFn: async () => {
      try {
        const q = query(collection(db, "paymentRequests"), orderBy("created_date", "desc"), limit(300));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        return [];
      }
    },
    enabled: !!isAdmin,
  });

  const pendingPaymentsMap = useMemo(() => {
    const map = {};
    for (const p of allPayments) {
      if (p.status === "pending" && p.user_id && !map[p.user_id]) {
        map[p.user_id] = p;
      }
    }
    return map;
  }, [allPayments]);

  const pendingPaymentsCount = useMemo(() => {
    return allPayments.filter(p => p.status === "pending").length;
  }, [allPayments]);

  const { data: stats } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [courses, users, payments, transactions] = await Promise.all([
        base44.entities.Course.filter({}, "-created_date", 1000),
        base44.entities.User.list("-created_date", 1000),
        base44.entities.PaymentRequest.list("-created_date", 1000),
        base44.entities.CreditTransaction.filter({ transaction_type: "spend" }, "-created_date", 1000),
      ]);
      const today = new Date().toISOString().slice(0, 10);
      return {
        courses: courses.length,
        users: users.length,
        premium: users.filter(u => u.subscription_plan === "premium").length,
        active: users.filter(u => (u.last_active_date || "").slice(0, 10) === today).length,
        locked: users.filter(u => u.is_locked).length,
        courseSales: Math.abs(transactions.filter(t => t.course_id).reduce((sum, t) => sum + Number(t.amount || 0), 0)),
        pendingPayments: payments.filter(p => p.status === "pending").length,
        approvedPayments: payments.filter(p => p.status === "approved").length,
      };
    },
    enabled: !!isAdmin,
  });

  useEffect(() => {
    const existing = configs.find(c => c.provider === provider);
    if (existing) {
      setModel(existing.model || "");
      setApiKey(existing.api_key ? "••••••••••••••••" : "");
    } else {
      setApiKey("");
      setModel("");
    }
  }, [provider, configs]);

  if (!profile) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return <p className="text-center text-muted-foreground py-20">هذه الصفحة للمدير فقط 🔒</p>;

  const filteredUsers = allUsers.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.id?.toLowerCase().includes(search.toLowerCase()));

  const saveKey = async () => {
    const existing = configs.find(c => c.provider === provider);
    let keyToSave = apiKey.trim();
    if (keyToSave.includes("•")) {
      keyToSave = existing?.api_key || "";
    }
    if (!keyToSave) return toast.error("اكتب الـ API Key أولاً");

    setSavingKey(true);
    try {
      // Test the key before saving
      await testAiKey(provider, keyToSave);

      const data = { provider, api_key: keyToSave, model: model || PROVIDERS[provider]?.models?.[0]?.id, enabled_models: existing?.enabled_models || PROVIDERS[provider]?.models?.map(m => m.id), is_active: true };
      if (existing) await base44.entities.AdminConfig.update(existing.id, data);
      else await base44.entities.AdminConfig.create(data);
      queryClient.invalidateQueries({ queryKey: ["adminConfigs"] });
      toast.success("تم حفظ مفتاح الـ AI بنجاح وهو قيد العمل الآن ✅");
    } catch (e) {
      toast.error(e.message || "لم يتم حفظ المفتاح");
    } finally {
      setSavingKey(false);
    }
  };

  const toggleConfig = async (config) => {
    await base44.entities.AdminConfig.update(config.id, { is_active: !config.is_active });
    queryClient.invalidateQueries({ queryKey: ["adminConfigs"] });
  };

  const removeConfig = async (config) => {
    await base44.entities.AdminConfig.delete(config.id);
    queryClient.invalidateQueries({ queryKey: ["adminConfigs"] });
    toast.success("تم الحذف");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#0E1117] text-primary">
            <Shield className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-black sm:text-3xl">لوحة الأدمن</h1>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        {/* Things that need a decision, surfaced instead of buried in a tab. */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingPaymentsCount > 0 && (
            <button
              type="button"
              onClick={() => setTab("payments")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-orange-400/40 bg-orange-400/10 px-3 py-2 text-xs font-bold text-orange-300"
            >
              <Wallet className="h-3.5 w-3.5" />
              {pendingPaymentsCount} طلب دفع محتاج مراجعة
            </button>
          )}
          <Button size="sm" variant="outline" onClick={() => refetchUsers()} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${usersLoading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </header>

      <nav aria-label="أقسام لوحة الأدمن" className="mb-7 space-y-3">
        {ADMIN_GROUPS.map((group) => (
          <div key={group.id} className="space-y-1.5">
            <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">{group.labelAr}</p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
              {group.tabs.map((item) => (
                <Tab
                  key={item.id}
                  label={item.labelAr}
                  icon={item.icon}
                  active={tab === item.id}
                  onClick={() => setTab(item.id)}
                  badge={item.badgeKey === "pendingPayments" ? pendingPaymentsCount : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "المستخدمين", value: stats?.users ?? "—", icon: Users, color: "text-primary", border: "border-primary/20" },
              { label: "Premium", value: stats?.premium ?? "—", icon: Crown, color: "text-yellow-400", border: "border-yellow-400/20" },
              { label: "المقفولين", value: stats?.locked ?? "—", icon: Lock, color: "text-destructive", border: "border-destructive/20" },
              { label: "الكورسات", value: stats?.courses ?? "—", icon: BookOpen, color: "text-accent", border: "border-accent/20" },
              { label: "نشطين اليوم", value: stats?.active ?? "—", icon: Calendar, color: "text-primary", border: "border-primary/20" },
              { label: "مبيعات الكورسات", value: `${stats?.courseSales ?? "—"} كريدت`, icon: Coins, color: "text-yellow-400", border: "border-yellow-400/20" },
              { label: "دفع معلق", value: stats?.pendingPayments ?? "—", icon: Wallet, color: "text-orange-400", border: "border-orange-400/20" },
              { label: "دفع ناجح", value: stats?.approvedPayments ?? "—", icon: Check, color: "text-[hsl(152,100%,50%)]", border: "border-[hsl(152,100%,50%)]/20" },
            ].map(s => <div key={s.label} className={`glass-card rounded-2xl p-4 border ${s.border}`}><s.icon className={`w-5 h-5 mb-2 ${s.color}`} /><p className={`text-2xl font-black ${s.color}`}>{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>)}
          </div>
          {/* Was a marketing paragraph ("full control from one panel") that told an
              admin nothing they didn't already know. It now points at the things
              that actually need a human decision. */}
          <div className="rounded-3xl border border-border bg-[#0E1117] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black">
              <Wand2 className="h-4 w-4 text-primary" />
              محتاج قرار منك
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { show: pendingPaymentsCount > 0, label: `${pendingPaymentsCount} طلب دفع مستني المراجعة`, tab: "payments", icon: Wallet, tone: "text-orange-300 border-orange-400/30 bg-orange-400/[0.07]" },
                { show: (stats?.locked ?? 0) > 0, label: `${stats?.locked} حساب مقفول`, tab: "users", icon: Lock, tone: "text-red-300 border-red-400/30 bg-red-400/[0.07]" },
                { show: true, label: "راجع بلاغات الأسئلة من الطلبة", tab: "flags", icon: Flag, tone: "text-sky-300 border-sky-400/30 bg-sky-400/[0.07]" },
                { show: true, label: "أكواد التفعيل والباقات", tab: "codes", icon: Ticket, tone: "text-primary border-primary/30 bg-primary/[0.07]" },
              ]
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => setTab(item.tab)}
                      className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-start text-[13px] font-bold transition-colors hover:brightness-110 ${item.tone}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {tab === "funnel" && <AdminFunnelView />}
      {tab === "flags" && <AdminFlaggedQuestionsView />}
      {tab === "analytics" && <AdminAnalytics />}

      {tab === "payments" && <PaymentRequestsManager />}

      {tab === "codes" && <ActivationCodesManager />}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1"><Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="ابحث باسم أو إيميل..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div>
            <Button size="sm" variant="outline" onClick={() => refetchUsers()} className="gap-1.5 shrink-0"><RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`} />تحديث</Button>
          </div>

          <p className="text-xs text-muted-foreground">{filteredUsers.length} مستخدم</p>
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <UserRow
                key={u.id}
                user={u}
                pendingPayment={pendingPaymentsMap[u.id]}
                onApprovePayment={() => {
                  refetchPayments();
                  refetchUsers();
                }}
                onUpdate={() => refetchUsers()}
              />
            ))}
            {!filteredUsers.length && !usersLoading && <p className="text-center text-muted-foreground py-10">لا يوجد مستخدمين مطابقين</p>}
          </div>
        </div>
      )}

      {tab === "keys" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-3xl p-6 border border-primary/30">
            <h2 className="font-extrabold text-lg mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-primary" />إضافة / تحديث API Key</h2>
            <ProviderModelPicker provider={provider} model={model} onProviderChange={(p) => { setProvider(p); setModel(""); }} onModelChange={setModel} />
            <div className="mt-5"><label className="text-sm font-semibold mb-2 block">API Key</label><Input dir="ltr" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="AIza... / sk-or-..." /></div>
            <Button onClick={saveKey} disabled={savingKey} className="w-full mt-5 gap-2">{savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}حفظ المفتاح</Button>
          </div>
          <div className="space-y-3">
            {configs.map(c => <div key={c.id} className="glass-card rounded-2xl p-4 border border-border flex items-center justify-between gap-3"><div><p className="font-bold">{PROVIDERS[c.provider]?.name || c.provider}</p><p className="text-xs text-muted-foreground">{c.model || "Default"} — {c.is_active ? "نشط" : "متوقف"}</p></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => toggleConfig(c)}>{c.is_active ? "إيقاف" : "تشغيل"}</Button><Button size="sm" variant="ghost" onClick={() => removeConfig(c)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button></div></div>)}
            {!configs.length && !configsLoading && <div className="glass-card rounded-2xl p-6 border border-border text-center text-muted-foreground">لا توجد مفاتيح محفوظة بعد</div>}
          </div>
        </div>
      )}

      {tab === "emergency" && <EmergencyContentManager />}
    </div>
  );
}
