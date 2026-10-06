import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Plus,
  Trash2,
  FileCode,
  FileText,
  HelpCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Upload,
  RefreshCw,
  ExternalLink,
  Loader2,
  Check
} from "lucide-react";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { uploadDirectToTelegram } from "@/lib/directUpload";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function EmergencyContentManager() {
  const { locale } = useLocale();
  const isEn = locale === "en";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("html"); // "html" | "pdf" | "quiz"
  const [htmlContent, setHtmlContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [quizId, setQuizId] = useState("");
  const [university, setUniversity] = useState("epnu");
  const [tagsInput, setTagsInput] = useState("epnu, طوارئ");
  const [isActive, setIsActive] = useState(true);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const fetchItems = async () => {
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
    fetchItems();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (contentType === "html") {
      setIsUploadingFile(true);
      try {
        const text = await file.text();
        if (text.length < 300000) {
          setHtmlContent(text);
        } else {
          setHtmlContent(`<!-- Large HTML Document (${(file.size / (1024 * 1024)).toFixed(2)} MB) - Loaded via Cloud Streaming URL -->`);
        }
        setFileName(file.name);
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

        // Always upload HTML to Telegram Storage Cloud for permanent direct URL & fast streaming
        const uploadRes = await uploadDirectToTelegram(file);
        if (uploadRes?.url) {
          setFileUrl(uploadRes.url);
          toast.success("تم رفع ملف الـ HTML بنجاح إلى السحابة الدائمة! 🚀");
        } else {
          toast.success("تم استيراد كود الـ HTML بنجاح! 🚀");
        }
      } catch (err) {
        console.warn("HTML upload notice:", err);
        try {
          const fallbackText = await file.text();
          setHtmlContent(fallbackText);
          setFileName(file.name);
          if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
          toast.success("تم استيراد كود الـ HTML محلياً! 🚀");
        } catch {
          toast.error("تعذر قراءة ملف الـ HTML");
        }
      } finally {
        setIsUploadingFile(false);
      }
    } else if (contentType === "pdf") {
      // Upload PDF directly to Telegram Storage Cloud (bypasses Vercel 4.5MB payload limit completely)
      setIsUploadingFile(true);
      try {
        const uploadRes = await uploadDirectToTelegram(file);
        if (uploadRes?.url) {
          setFileUrl(uploadRes.url);
          setFileName(file.name);
          if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
          toast.success("تم رفع ملف الـ PDF بنجاح إلى السحابة الدائمة! 🚀");
        } else {
          throw new Error("فشل الرفع");
        }
      } catch (err) {
        toast.error(err.message || "فشل رفع ملف الـ PDF");
      } finally {
        setIsUploadingFile(false);
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("يرجى كتابة عنوان للمحتوى");
      return;
    }

    if (contentType === "html" && !htmlContent.trim() && !fileUrl.trim()) {
      toast.error("يرجى كتابة أو رفع محتوى الـ HTML");
      return;
    }

    if (contentType === "pdf" && !fileUrl.trim()) {
      toast.error("يرجى رفع ملف PDF أو إدخال رابطه");
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        action: "create",
        title: title.trim(),
        description: description.trim(),
        contentType,
        htmlContent: contentType === "html" ? htmlContent : "",
        fileUrl: fileUrl ? fileUrl.trim() : "",
        fileName,
        quizId: contentType === "quiz" ? quizId.trim() : "",
        university: university.trim(),
        tags,
        isActive,
      };

      const res = await invokeSecureFunction("emergency-content", payload);
      if (res?.data?.ok) {
        toast.success("تم نشر محتوى الطوارئ بنجاح! 🚀");
        setShowModal(false);
        // Reset form
        setTitle("");
        setDescription("");
        setHtmlContent("");
        setFileUrl("");
        setFileName("");
        setQuizId("");
        fetchItems();
      } else {
        throw new Error(res?.data?.message || "فشل الحفظ");
      }
    } catch (err) {
      toast.error(err.message || "حصل خطأ أثناء حفظ المحتوى");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const res = await invokeSecureFunction("emergency-content", {
        action: "toggle",
        contentId: id,
        isActive: !currentStatus,
      });
      if (res?.data?.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isActive: !currentStatus } : item))
        );
        toast.success(!currentStatus ? "تم تفعيل المحتوى" : "تم تعطيل المحتوى");
      }
    } catch (err) {
      toast.error(err.message || "فشل تغيير الحالة");
    }
  };

  const handleDelete = async (id, itemTitle) => {
    if (!confirm(`هل أنت متأكد من حذف "${itemTitle}" نهائياً؟`)) return;
    try {
      const res = await invokeSecureFunction("emergency-content", {
        action: "delete",
        contentId: id,
      });
      if (res?.data?.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("تم حذف المحتوى");
      }
    } catch (err) {
      toast.error(err.message || "فشل الحذف");
    }
  };

  const handleOpenPreview = async (item) => {
    if (item.fileUrl) {
      setPreviewHtml({ title: item.title, url: item.fileUrl });
      return;
    }
    if (item.htmlContent) {
      setPreviewHtml({ title: item.title, html: item.htmlContent });
    } else {
      try {
        const res = await invokeSecureFunction("emergency-content", {
          action: "get",
          contentId: item.id,
        });
        if (res?.data?.content?.fileUrl) {
          setPreviewHtml({ title: item.title, url: res.data.content.fileUrl });
        } else if (res?.data?.content?.htmlContent) {
          setPreviewHtml({ title: item.title, html: res.data.content.htmlContent });
        } else {
          toast.info("لا يوجد كود أو ملف HTML للعرض");
        }
      } catch (err) {
        toast.error("تعذر تحميل المعاينة");
      }
    }
  };

  const filteredItems = useMemo(() => {
    if (filterType === "all") return items;
    return items.filter((it) => it.contentType === filterType);
  }, [items, filterType]);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-rose-950/30 via-background to-black border border-rose-500/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <span>إدارة محتوى راوند الطوارئ 🚨</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold">
                Alpha Command
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              ارفع ملفات HTML وملازم PDF وكويزات الطوارئ الخاصة بجامعة شرق بورسعيد الأهلية والامتحانات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>رفع محتوى طوارئ جديد</span>
          </button>
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "الكل", count: items.length },
          { key: "html", label: "ملفات HTML 📄", count: items.filter((i) => i.contentType === "html").length },
          { key: "pdf", label: "ملازم PDF 📥", count: items.filter((i) => i.contentType === "pdf").length },
          { key: "quiz", label: "كويزات الطوارئ ⚡", count: items.filter((i) => i.contentType === "quiz").length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              filterType === tab.key
                ? "bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm"
                : "bg-card/40 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Items List */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
          <p className="text-sm">جاري تحميل محتوى راوند الطوارئ...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border/60 bg-card/20 space-y-3">
          <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-bold text-muted-foreground">لا يوجد محتوى مرفوع حتى الآن في هذا القسم</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-bold transition-colors"
          >
            ابدأ برفع أول محتوى طوارئ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between transition-colors ${
                item.isActive
                  ? "bg-card/50 border-border/60 hover:border-rose-500/40"
                  : "bg-muted/10 border-border/30 opacity-60"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.contentType === "html" && (
                      <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <FileCode className="w-4 h-4" />
                      </span>
                    )}
                    {item.contentType === "pdf" && (
                      <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <FileText className="w-4 h-4" />
                      </span>
                    )}
                    {item.contentType === "quiz" && (
                      <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        <HelpCircle className="w-4 h-4" />
                      </span>
                    )}
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {item.contentType.toUpperCase()}
                      </span>
                      <h3 className="font-bold text-sm leading-tight line-clamp-1">{item.title}</h3>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(item.id, item.isActive)}
                    title={item.isActive ? "تعطيل" : "تفعيل"}
                    className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-secondary/40 text-[10px] font-medium text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {item.contentType === "html" && (
                    <button
                      onClick={() => handleOpenPreview(item)}
                      className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>معاينة HTML</span>
                    </button>
                  )}
                  {item.contentType === "pdf" && item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح الـ PDF</span>
                    </a>
                  )}
                  {item.contentType === "quiz" && (
                    <a
                      href={item.quizId ? `/q/${item.quizId}` : "/quizzes"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>بدء الكويز</span>
                    </a>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-black text-lg">رفع محتوى طوارئ جديد 🚨</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Content Type Selector */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  طريقة العرض ونوع المحتوى
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "html", label: "عرض HTML فقط 📄", icon: FileCode, desc: "شروحات تفاعلية أو صفحات ويب" },
                    { key: "pdf", label: "ملف PDF 📥", icon: FileText, desc: "ملازم وسلايدات قابلة للتحميل" },
                    { key: "quiz", label: "كويز طوارئ ⚡", icon: HelpCircle, desc: "بنك أسئلة وامتحانات" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setContentType(t.key)}
                      className={`p-3 rounded-2xl border text-right transition-colors ${
                        contentType === t.key
                          ? "bg-rose-500/15 border-rose-500 text-rose-400"
                          : "bg-muted/10 border-border/40 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <t.icon className="w-4 h-4 mb-1" />
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className="text-[10px] opacity-70 line-clamp-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">عنوان المحتوى *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ليلة امتحان الفارماكولوجي - الدفعة الثانية"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/60 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">وصف أو تعليمات (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="توجيهات للطلاب حول هذا الملف أو أهم النقاط..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-background border border-border/60 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Type-Specific Fields */}
              {contentType === "html" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground">كود الـ HTML أو الملف</label>
                    <label className="cursor-pointer text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1">
                      {isUploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isUploadingFile ? "جاري الرفع..." : "استيراد ملف .html"}</span>
                      <input
                        type="file"
                        accept=".html,.htm"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploadingFile}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={8}
                    required
                    placeholder="<div>ضع كود الـ HTML هنا أو قم برفع ملف HTML جاهز...</div>"
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full p-4 rounded-xl bg-black/60 border border-border/60 font-mono text-xs text-emerald-400 focus:border-rose-500 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              )}

              {contentType === "pdf" && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground block">ملف الـ PDF</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 bg-rose-500/5 transition-colors">
                      {isUploadingFile ? (
                        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري رفع الـ PDF إلى السحابة الدائمة...</span>
                        </div>
                      ) : fileName ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <Check className="w-4 h-4" />
                          <span>تم تحديد: {fileName}</span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <Upload className="w-6 h-6 text-rose-400 mx-auto" />
                          <div className="text-xs font-bold text-rose-400">اضغط لاختيار ملف PDF ورفعه</div>
                          <div className="text-[10px] text-muted-foreground">حتى 40 ميجابايت على سحابة المنصة الدائمة</div>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={isUploadingFile}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-1">أو ضع رابط PDF مباشر:</span>
                    <input
                      type="url"
                      placeholder="https://.../lecture.pdf"
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-background border border-border/60 text-xs focus:border-rose-500 focus:outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {contentType === "quiz" && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">معرّف الكويز (Quiz ID)</label>
                  <input
                    type="text"
                    placeholder="مثال: q_1738493021 أو اتركها لربط رابط كويز"
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/60 text-xs focus:border-rose-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    يمكنك أخذ معرّف أي كويز قمت بإنشائه من صفحة الكويزات أو تركه فارغاً.
                  </p>
                </div>
              )}

              {/* Tags & University */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">الجامعة / الكلية</label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="epnu"
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border/60 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">الوسوم (مفصولة بفاصلة)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="epnu, طوارئ, باطنة"
                    className="w-full px-4 py-2 rounded-xl bg-background border border-border/60 text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-border accent-rose-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-foreground cursor-pointer">
                  نشر المحتوى وجعله متاحاً للمشتركين فوراً
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted/20 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingFile}
                  className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري النشر...</span>
                    </>
                  ) : (
                    <span>نشر المحتوى الآن ⚡</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HTML Live Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <FileCode className="w-4 h-4 text-orange-400" />
              <span>معاينة: {previewHtml.title}</span>
            </h3>
            <button
              onClick={() => setPreviewHtml(null)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-foreground transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 bg-white text-black rounded-2xl overflow-hidden shadow-2xl p-4">
            <iframe
              title="HTML Preview"
              sandbox="allow-same-origin allow-scripts"
              src={previewHtml.url || undefined}
              srcDoc={previewHtml.html || undefined}
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
