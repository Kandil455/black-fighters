import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  FileCode,
  FileText,
  HelpCircle,
  Eye,
  Search,
  Lock,
  ArrowRight,
  BookOpen,
  Download,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasEmergencyAccess } from "@/lib/emergencyAccess";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function EmergencyHub() {
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const navigate = useNavigate();

  const isAllowed = hasEmergencyAccess(profile);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingHtml, setViewingHtml] = useState(null);

  const fetchEmergencyContent = async () => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await invokeSecureFunction("emergency-content", { action: "list" });
      if (res?.data?.items) {
        setItems(res.data.items);
      }
    } catch (err) {
      toast.error(err.message || "تعذر جلب محتوى الطوارئ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyContent();
  }, [isAllowed]);

  const handleOpenHtml = async (item) => {
    if (item.fileUrl) {
      setViewingHtml({ title: item.title, url: item.fileUrl });
      return;
    }
    if (item.htmlContent) {
      setViewingHtml({ title: item.title, html: item.htmlContent });
    } else {
      try {
        const res = await invokeSecureFunction("emergency-content", {
          action: "get",
          contentId: item.id,
        });
        if (res?.data?.content?.fileUrl) {
          setViewingHtml({ title: item.title, url: res.data.content.fileUrl });
        } else if (res?.data?.content?.htmlContent) {
          setViewingHtml({ title: item.title, html: res.data.content.htmlContent });
        } else {
          toast.info("لا يتوفر محتوى أو ملف HTML لهذا العنصر");
        }
      } catch (err) {
        toast.error("تعذر فتح ملف الـ HTML");
      }
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab !== "all") {
      result = result.filter((i) => i.contentType === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.tags && i.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return result;
  }, [items, activeTab, searchQuery]);

  // ── Gated Paywall View for Unsubscribed Users ──
  if (!isAllowed) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full p-8 rounded-3xl glass-card border border-rose-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-2 shadow-inner">
            <ShieldAlert className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>محتوى حصري ومغلق</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">راوند الطوارئ (Emergency Round) 🚨</h1>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
              هذا القسم مخصص حصرياً للمشتركين في باقة راوند الطوارئ المستقلة لطلاب جامعة شرق بورسعيد الأهلية والامتحانات الحرجة.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            {[
              { title: "ملفات HTML تفاعلية 📄", desc: "شروحات مركزة وملازم مصممة للعرض السريع على الموبايل والكمبيوتر" },
              { title: "ملازم PDF كاملة 📥", desc: "سلايدات وبنوك أسئلة منتقاة لليالي الامتحان بضغطة زر واحدة" },
              { title: "كويزات طوارئ Alpha ⚡", desc: "امتحانات تفاعلية مع تصحيح ذكي لشرح كل إجابة بدقة جراحية" },
              { title: "بوت التيليجرام VIP 🤖", desc: "حل الكويزات واستلام التنبيهات المباشرة على بوت @black_fighters_bot" },
            ].map((b, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card/60 border border-border/50 space-y-1">
                <div className="text-xs font-bold text-foreground">{b.title}</div>
                <div className="text-[11px] text-muted-foreground leading-normal">{b.desc}</div>
              </div>
            ))}
          </div>

          {/* Pricing Box & CTA */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-black border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-right">
              <div className="text-xs text-rose-300 font-bold">قيمة الاشتراك</div>
              <div className="text-2xl font-black text-foreground">
                99 <span className="text-xs font-normal text-muted-foreground">جنيه مصري / شهر</span>
              </div>
            </div>

            <Link
              to="/subscriptions"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-colors"
            >
              <span>اشترك في راوند الطوارئ الآن</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground">
            ملاحظة: باقة راوند الطوارئ مستقلة وخاصة بالمحتوى الأكاديمي المرفوع للطوارئ.
          </p>
        </div>
      </div>
    );
  }

  // ── Authorized Subscriber View ──
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8" dir={dir}>
      {/* Hero Header */}
      <div className="relative p-8 rounded-3xl bg-gradient-to-br from-rose-950/40 via-card to-background border border-rose-500/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>قسم راوند الطوارئ الأكاديمي 🚨</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              مكتبة ملازم وكويزات الطوارئ ⚡
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              محتوى ليلة الامتحان الحصري لطلاب جامعة شرق بورسعيد الأهلية والامتحانات الحرجة — ملفات HTML تفاعلية، ملازم PDF، وبنوك كويزات بإشراف القائد Alpha.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              href="https://t.me/black_fighters_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>فتح بوت التيليجرام</span>
            </a>
            <button
              onClick={fetchEmergencyContent}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-border/60 bg-card/60 hover:bg-card text-muted-foreground transition-colors"
              title="تحديث المحتوى"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "كافة المحتويات", icon: BookOpen },
            { key: "html", label: "ملفات HTML 📄", icon: FileCode },
            { key: "pdf", label: "ملازم PDF 📥", icon: FileText },
            { key: "quiz", label: "كويزات الطوارئ ⚡", icon: HelpCircle },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-colors ${
                activeTab === tab.key
                  ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث في محتوى الطوارئ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-2xl bg-card border border-border/60 text-xs focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm font-bold">جاري تحميل ملفات وكويزات الطوارئ...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/20 space-y-3">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <p className="text-base font-bold text-foreground">لا يوجد محتوى متاح حالياً في هذا التصنيف</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            يتم تحديث ورفع ملازم وكويزات الطوارئ بصورة مستمرة قبل الامتحانات بواسطة القائد Alpha.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-card/50 hover:bg-card/80 border border-border/60 hover:border-rose-500/40 flex flex-col justify-between space-y-4 shadow-lg transition-colors group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {item.contentType === "html" && (
                      <span className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <FileCode className="w-5 h-5" />
                      </span>
                    )}
                    {item.contentType === "pdf" && (
                      <span className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <FileText className="w-5 h-5" />
                      </span>
                    )}
                    {item.contentType === "quiz" && (
                      <span className="p-2.5 rounded-2xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <HelpCircle className="w-5 h-5" />
                      </span>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {item.contentType === "html"
                          ? "ملف HTML تفاعلي"
                          : item.contentType === "pdf"
                          ? "ملزمة PDF"
                          : "كويز طوارئ ⚡"}
                      </span>
                      <h3 className="font-bold text-base leading-tight group-hover:text-rose-400 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}

                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-secondary/50 text-[10px] font-bold text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                {item.contentType === "html" && (
                  <div className="flex-1 flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenHtml(item)}
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>عرض على المنصة</span>
                    </button>
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        download={item.fileName || `${item.title}.html`}
                        className="py-2.5 px-3 rounded-2xl bg-secondary/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        title="تحميل الملف"
                      >
                        <Download className="w-4 h-4" />
                        <span>تحميل</span>
                      </a>
                    )}
                  </div>
                )}

                {item.contentType === "pdf" && item.fileUrl && (
                  <div className="flex-1 flex items-center gap-1.5">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 px-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>عرض الـ PDF</span>
                    </a>
                    <a
                      href={item.fileUrl}
                      download={item.fileName || `${item.title}.pdf`}
                      className="py-2.5 px-3 rounded-2xl bg-secondary/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      title="تحميل الـ PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل</span>
                    </a>
                  </div>
                )}

                {item.contentType === "quiz" && (
                  <Link
                    to={item.quizId ? `/q/${item.quizId}` : "/quizzes"}
                    className="flex-1 py-2.5 px-4 rounded-2xl bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    <span>بدء الكويز الآن</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HTML Viewer Modal */}
      {viewingHtml && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3 px-2">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileCode className="w-5 h-5 text-orange-400" />
              <span>{viewingHtml.title}</span>
            </h3>
            <button
              onClick={() => setViewingHtml(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-foreground transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-white text-black rounded-2xl overflow-hidden shadow-2xl p-4">
            <iframe
              title="Emergency HTML Document"
              sandbox="allow-same-origin allow-scripts"
              src={viewingHtml.url || undefined}
              srcDoc={viewingHtml.html || undefined}
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
