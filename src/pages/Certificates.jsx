import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Download, Loader2, ShieldCheck, Sparkles, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, LVCard, LVBadge } from "@/components/ui/linevault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Courses } from "@/lib/firestore";
import { issueCertificate, listCertificates, certificateVerifyUrl } from "@/lib/certificates";
import { downloadCertificatePdf, renderCertificatePreview } from "@/lib/certificateRender";

/**
 * Certificates — the learner requests one, the system issues it immediately.
 * No institution is named: the certificate is issued directly to the person.
 */
export default function Certificates() {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const { profile, isAuthenticated, isLoadingAuth, redirectToLogin } = useAuth();

  const [courses, setCourses] = useState([]);
  const [issued, setIssued] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const [active, setActive] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) redirectToLogin(window.location.pathname);
  }, [isAuthenticated, isLoadingAuth, redirectToLogin]);

  useEffect(() => {
    if (!profile) return;
    setRecipientName((current) => current || profile.full_name || profile.display_name || "");
  }, [profile]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, courseList] = await Promise.all([
        listCertificates().catch(() => []),
        Courses.list().catch(() => []),
      ]);
      setIssued(mine);
      setCourses(courseList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
  }, [isAuthenticated, load]);

  const previewData = useMemo(() => {
    if (!active) return null;
    return {
      recipientName: active.recipientName,
      title: active.title,
      code: active.code,
      issuedAt: active.issuedAt,
      lang: isEn ? "en" : "ar",
      verifyUrl: certificateVerifyUrl(active.code),
    };
  }, [active, isEn]);

  // Re-render the preview whenever the certificate or language changes.
  useEffect(() => {
    let cancelled = false;
    if (!previewData) {
      setPreview("");
      return () => {};
    }
    renderCertificatePreview(previewData)
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setPreview("");
      });
    return () => {
      cancelled = true;
    };
  }, [previewData]);

  const onIssue = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error(isEn ? "Enter what the certificate is for" : "اكتب الشهادة عن إيه");
      return;
    }
    setBusy(true);
    try {
      const certificate = await issueCertificate({
        title: cleanTitle,
        recipientName: recipientName.trim(),
      });
      if (!certificate) throw new Error(isEn ? "Could not issue the certificate" : "تعذر إصدار الشهادة");
      setIssued((current) => [certificate, ...current]);
      setActive(certificate);
      setTitle("");
      toast.success(isEn ? "Certificate issued" : "تم إصدار الشهادة");
    } catch (error) {
      toast.error(error?.message || (isEn ? "Could not issue the certificate" : "تعذر إصدار الشهادة"));
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async (certificate) => {
    setBusy(true);
    try {
      await downloadCertificatePdf({
        recipientName: certificate.recipientName,
        title: certificate.title,
        code: certificate.code,
        issuedAt: certificate.issuedAt,
        lang: isEn ? "en" : "ar",
        verifyUrl: certificateVerifyUrl(certificate.code),
      });
      toast.success(isEn ? "Downloaded" : "تم التحميل");
    } catch (error) {
      toast.error(error?.message || (isEn ? "Download failed" : "تعذر التحميل"));
    } finally {
      setBusy(false);
    }
  };

  const copyVerify = async (certificate) => {
    try {
      await navigator.clipboard.writeText(certificateVerifyUrl(certificate.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(isEn ? "Could not copy" : "تعذر النسخ");
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6" dir={isEn ? "ltr" : "rtl"}>
      <PageHeader
        eyebrow={isEn ? "CERTIFICATES" : "الشهادات والتراخيص"}
        title={isEn ? "Your certificates, issued on request" : "شهاداتك — تُصدر فورًا بطلبك"}
        subtitle={
          isEn
            ? "The system issues the certificate directly to you. No institution is named, and each one carries a public verification code."
            : "النظام يصدر الشهادة لك مباشرةً، بدون ذكر أي مؤسسة، وكل شهادة لها كود تحقق عام."
        }
      />

      <LVCard className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-primary" />
          {isEn ? "Request a certificate" : "اطلب شهادة جديدة"}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
            {isEn ? "Certificate for" : "الشهادة عن"}
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={isEn ? "e.g. Emergency Medicine — Module 4" : "مثال: طب الطوارئ — الوحدة الرابعة"}
              maxLength={160}
            />
          </label>
          <label className="space-y-1.5 text-xs font-bold text-muted-foreground">
            {isEn ? "Name on the certificate" : "الاسم على الشهادة"}
            <Input
              value={recipientName}
              onChange={(event) => setRecipientName(event.target.value)}
              placeholder={isEn ? "Your full name" : "اسمك بالكامل"}
              maxLength={80}
            />
          </label>
        </div>

        {courses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {courses.slice(0, 8).map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => setTitle(course.title || course.name || "")}
                className="rounded-none border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {course.title || course.name}
              </button>
            ))}
          </div>
        )}

        <Button onClick={onIssue} disabled={busy} className="rounded-none">
          {busy ? <Loader2 className="me-2 size-4 animate-spin" /> : <Award className="me-2 size-4" />}
          {isEn ? "Issue certificate" : "إصدار الشهادة"}
        </Button>
      </LVCard>

      {active && (
        <LVCard className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="size-4 text-emerald-400" />
                {isEn ? "Preview" : "معاينة"}
                <LVBadge>{active.code}</LVBadge>
              </div>
              <p className="text-xs text-muted-foreground">{active.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => onDownload(active)} disabled={busy} variant="outline" className="rounded-none">
                <Download className="me-2 size-4" />
                {isEn ? "Download PDF" : "تحميل PDF"}
              </Button>
              <Button onClick={() => copyVerify(active)} variant="ghost" className="rounded-none">
                {copied ? <Check className="me-2 size-4" /> : <Copy className="me-2 size-4" />}
                {isEn ? "Copy verify link" : "نسخ رابط التحقق"}
              </Button>
              <Link
                to={`/verify/${active.code}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" />
                {isEn ? "Open" : "فتح"}
              </Link>
            </div>
          </div>
          {preview ? (
            <img
              src={preview}
              alt={isEn ? "Certificate preview" : "معاينة الشهادة"}
              className="w-full rounded-none border border-border"
            />
          ) : (
            <div className="flex h-56 items-center justify-center border border-border text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
        </LVCard>
      )}

      <LVCard className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Award className="size-4 text-primary" />
          {isEn ? "Issued certificates" : "الشهادات الصادرة"}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {isEn ? "Loading…" : "جاري التحميل…"}
          </div>
        ) : issued.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {isEn ? "No certificates yet — request your first above." : "لسه مفيش شهادات — اطلب أول واحدة من فوق."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {issued.map((certificate) => (
              <li key={certificate.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{certificate.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{certificate.code}</span>
                    {certificate.issuedAt ? ` · ${new Date(certificate.issuedAt).toLocaleDateString(isEn ? "en-GB" : "ar-EG")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="rounded-none" onClick={() => setActive(certificate)}>
                    {isEn ? "Preview" : "معاينة"}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => onDownload(certificate)} disabled={busy}>
                    <Download className="me-1.5 size-3.5" />
                    PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </LVCard>
    </div>
  );
}
