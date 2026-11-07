import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Loader2, ShieldX, Search } from "lucide-react";
import { PageHeader, LVCard } from "@/components/ui/linevault";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/LocaleContext";
import { verifyCertificate } from "@/lib/certificates";

/**
 * Public certificate verification. Anyone holding a code can check it — no account
 * needed — because the point of a certificate is that a third party can confirm it.
 */
export default function VerifyCertificate() {
  const { code: routeCode } = useParams();
  const { locale } = useLocale();
  const isEn = locale === "en";

  const [code, setCode] = useState(routeCode || "");
  const [state, setState] = useState({ loading: Boolean(routeCode), valid: null, certificate: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    if (!routeCode) return () => {};
    setState({ loading: true, valid: null, certificate: null, error: "" });
    verifyCertificate(routeCode)
      .then((result) => {
        if (!cancelled) setState({ loading: false, valid: result.valid, certificate: result.certificate, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, valid: null, certificate: null, error: error?.message || "ERROR" });
      });
    return () => {
      cancelled = true;
    };
  }, [routeCode]);

  const onSubmit = async (event) => {
    event.preventDefault();
    const next = code.trim().toUpperCase();
    if (!next) return;
    setState({ loading: true, valid: null, certificate: null, error: "" });
    try {
      const result = await verifyCertificate(next);
      setState({ loading: false, valid: result.valid, certificate: result.certificate, error: "" });
    } catch (error) {
      setState({ loading: false, valid: null, certificate: null, error: error?.message || "ERROR" });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10" dir={isEn ? "ltr" : "rtl"}>
      <PageHeader
        eyebrow={isEn ? "VERIFY" : "التحقق"}
        title={isEn ? "Verify a certificate" : "تحقّق من شهادة"}
        subtitle={
          isEn
            ? "Enter the code printed on the certificate to confirm it was issued by the system."
            : "اكتب الكود المطبوع على الشهادة للتأكد إنها صادرة من النظام."
        }
      />

      <LVCard className="space-y-4 p-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="BF-XXXX-XXXX"
            className="font-mono tracking-wider"
            maxLength={32}
          />
          <Button type="submit" className="rounded-none" disabled={state.loading}>
            {state.loading ? <Loader2 className="me-2 size-4 animate-spin" /> : <Search className="me-2 size-4" />}
            {isEn ? "Verify" : "تحقّق"}
          </Button>
        </form>

        {state.valid === true && state.certificate && (
          <div className="space-y-2 border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <BadgeCheck className="size-5" />
              {isEn ? "Valid certificate" : "شهادة صحيحة"}
            </div>
            <dl className="grid gap-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{isEn ? "Name" : "الاسم"}:</dt>
                <dd className="font-bold">{state.certificate.recipientName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{isEn ? "For" : "عن"}:</dt>
                <dd>{state.certificate.title}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{isEn ? "Issued" : "تاريخ الإصدار"}:</dt>
                <dd>
                  {state.certificate.issuedAt
                    ? new Date(state.certificate.issuedAt).toLocaleDateString(isEn ? "en-GB" : "ar-EG")
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{isEn ? "Code" : "الكود"}:</dt>
                <dd className="font-mono">{state.certificate.code}</dd>
              </div>
            </dl>
          </div>
        )}

        {state.valid === false && (
          <div className="flex items-center gap-2 border border-destructive/40 bg-destructive/[0.06] p-4 text-sm font-bold text-destructive">
            <ShieldX className="size-5" />
            {isEn ? "No certificate matches this code." : "مفيش شهادة بالكود ده."}
          </div>
        )}

        {state.error && (
          <div className="border border-border p-4 text-sm text-muted-foreground">
            {isEn ? "Could not check right now. Try again." : "تعذر التحقق دلوقتي. حاول تاني."}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {isEn ? "Have an account? " : "عندك حساب؟ "}
          <Link to="/certificates" className="font-bold text-primary hover:underline">
            {isEn ? "Get your own certificate" : "اطلب شهادتك"}
          </Link>
        </p>
      </LVCard>
    </div>
  );
}
