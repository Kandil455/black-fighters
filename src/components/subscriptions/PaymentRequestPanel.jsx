import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_INFO } from "@/lib/paymentInfo";
import { planPrice } from "@/lib/plans";
import { optimizeImageToDataUrl } from "@/lib/storage";
import { Copy, Check, Loader2, Send, Upload, CheckCircle2, Wallet, ShieldCheck, Zap, Headphones } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function PaymentRequestPanel({ product, productType = "subscription", billing }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [method, setMethod] = useState("vodafone_cash");
  const [senderNumber, setSenderNumber] = useState("");
  const [note, setNote] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const copyTimeoutRef = useRef(null);

  // Automatically reset copy state whenever payment method changes
  useEffect(() => {
    setCopied(false);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  }, [method]);

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const info = PAYMENT_INFO[method];
  const amount = productType === "credits" ? product.price : planPrice(product, billing);

  const copyNumber = () => {
    navigator.clipboard.writeText(info.number);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    setCopied(true);
    toast.success(isEn ? "Number copied ✅" : "تم نسخ الرقم ✅");
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Compress and optimize locally into crisp high-res base64 (< 50KB)
      // This prevents premature uploads or spamming Telegram with naked documents
      const dataUrl = await optimizeImageToDataUrl(file, 960, 0.82);
      setScreenshot(dataUrl);
      toast.success(isEn ? "Receipt attached ✅" : "تم إرفاق صورة التحويل بنجاح ✅");
    } catch {
      toast.error(isEn ? "Upload failed" : "فشل تجهيز الصورة");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const cleanedNumber = senderNumber.trim().replace(/\D/g, "");
    if (!cleanedNumber) {
      return toast.error(isEn ? "Enter sender phone number" : "اكتب رقم التليفون اللي حوّلت منه");
    }
    // Strict Egyptian Mobile Number Validation: 11 digits starting with 01
    if (!/^01\d{9}$/.test(cleanedNumber)) {
      return toast.error(
        isEn 
          ? "Phone number must be exactly 11 digits starting with 01 (e.g. 01012345678)" 
          : "رقم التليفون لازم يكون 11 رقم ويبدأ بـ 01 (مثال: 01012345678)"
      );
    }
    if (!screenshot) {
      return toast.error(isEn ? "Transfer receipt screenshot is required 📸" : "لازم ترفع صورة التحويل (إجباري) 📸");
    }

    setSubmitting(true);
    try {
      await base44.functions.invoke("submitPayment", {
        productType,
        productKey: product.key,
        billing,
        method,
        senderNumber: cleanedNumber,
        screenshotUrl: screenshot,
        note: note.trim(),
        idempotencyKey: idempotencyKey.current,
      });
      setDone(true);
      toast.success(isEn ? "Payment request submitted ✅ Verification in progress" : "تم إرسال طلبك ✅ هيتم المراجعة فوراً");
    } catch (e) {
      toast.error(e.message || (isEn ? "An error occurred" : "حصل خطأ"));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="surface-card rounded-3xl p-8 border border-[hsl(152,100%,50%)]/30 text-center max-w-xl mx-auto" dir={dir}>
        <CheckCircle2 className="w-14 h-14 text-[hsl(152,100%,50%)] mx-auto mb-4" />
        <h3 className="text-xl font-black mb-2">{isEn ? "Payment Request Submitted 🎉" : "تم إرسال طلبك 🎉"}</h3>
        <p className="text-muted-foreground text-sm">
          {isEn 
            ? "We will verify your transfer and your activation code or balance will appear in 'My Requests'."
            : "هنراجع التحويل، وأول ما يتأكّد هيظهرلك كود التفعيل في صفحة طلباتي."}
        </p>
        <Button variant="outline" className="mt-5" onClick={() => { setDone(false); setSenderNumber(""); setNote(""); setScreenshot(null); idempotencyKey.current = crypto.randomUUID(); }}>
          {isEn ? "Submit Another Request" : "إرسال طلب آخر"}
        </Button>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-3xl p-6 border border-primary/25 max-w-xl mx-auto" dir={dir}>
      <h3 className="text-lg font-black mb-1 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" /> {isEn ? "Complete Payment & Activate" : "ادفع وفعّل اشتراكك"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {isEn 
          ? "Transfer the amount to the number below, then submit proof of transfer to receive activation."
          : "حوّل المبلغ على الرقم التالي، وبعدها املأ البيانات وهنطلّعلك كود التفعيل بعد المراجعة."}
      </p>

      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{isEn ? "Selected Item" : "الخطة المختارة"}</p>
          <p className="font-black">
            {product.name}
            {productType === "subscription" 
              ? ` · ${billing === "yearly" ? (isEn ? "Yearly" : "سنوي") : (isEn ? "Monthly" : "شهري")}` 
              : ` · ${product.credits} ${isEn ? "Credits" : "كريدت"}`}
          </p>
        </div>
        <p className="text-xl font-black text-primary">
          {amount.toLocaleString(isEn ? "en-US" : "ar-EG")} {isEn ? "EGP" : "ج"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { icon: ShieldCheck, titleAr: "دفع آمن", titleEn: "Secure Pay", color: "text-[hsl(152,100%,50%)]" },
          { icon: Zap, titleAr: "تفعيل سريع", titleEn: "Fast Setup", color: "text-primary" },
          { icon: Headphones, titleAr: "دعم مباشر (واتساب)", titleEn: "WhatsApp Support", color: "text-accent", href: "https://wa.me/201009275685?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%85%D8%B3%D8%A7%D8%B9%D8%AF%D8%A9%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D9%81%D9%8A%20Black%20Fighters" },
        ].map((item) => {
          const Tag = item.href ? "a" : "div";
          const linkProps = item.href ? { href: item.href, target: "_blank", rel: "noopener noreferrer" } : {};
          return (
            <Tag key={item.titleAr} {...linkProps} className={`rounded-2xl border border-border bg-secondary/25 p-2 text-center transition-colors ${item.href ? "hover:border-accent hover:bg-accent/10 cursor-pointer" : ""}`}>
              <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
              <p className="text-[11px] font-black">{isEn ? item.titleEn : item.titleAr}</p>
            </Tag>
          );
        })}
      </div>

      {/* Payment method selector */}
      <div className="flex gap-2 mb-4">
        {Object.entries(PAYMENT_INFO).map(([key, m]) => (
          <button
            key={key}
            onClick={() => {
              if (key !== method) {
                if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                setCopied(false);
                setMethod(key);
              }
            }}
            className={`flex-1 h-11 rounded-xl text-sm font-bold border transition-colors ${
              method === key ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Recipient number */}
      <button
        key={method}
        onClick={copyNumber}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-4 py-3 mb-5 transition-all cursor-pointer ${
          copied 
            ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
            : "bg-secondary/40 border-border hover:border-primary/40"
        }`}
      >
        <div className="text-start">
          <p className="text-[11px] text-muted-foreground">
            {isEn ? `Transfer to ${info.label}` : `حوّل على ${info.label}`}
          </p>
          <p className="font-mono font-black text-base" dir="ltr">{info.number}</p>
        </div>
        <div className={`p-1.5 rounded-lg transition-all shrink-0 ${
          copied ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"
        }`}>
          {copied ? (
            <Check className="w-4 h-4 stroke-[3] text-emerald-400 animate-in zoom-in-75 duration-200" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </div>
      </button>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            {isEn ? "Sender Phone Number" : "الرقم اللي حوّلت منه"}
          </label>
          <Input 
            value={senderNumber} 
            onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, "").slice(0, 11))} 
            placeholder="01xxxxxxxxx" 
            maxLength={11}
            type="tel"
            dir="ltr" 
            className="h-10 font-mono tracking-wider text-base" 
          />
          {senderNumber && senderNumber.length > 0 && senderNumber.length < 11 && (
            <p className="text-[11px] text-amber-400 mt-1 font-mono">
              {isEn ? `⚠️ ${11 - senderNumber.length} digits remaining (must be 11 digits starting with 01)` : `⚠️ متبقي ${11 - senderNumber.length} أرقام (يجب أن يكون 11 رقماً ويبدأ بـ 01)`}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            {isEn ? "Transfer Receipt " : "صورة التحويل "}
            <span className="text-destructive">({isEn ? "Required" : "إجباري"})</span>
          </label>
          <label className={`flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 cursor-pointer transition-colors ${screenshot ? "border-[hsl(152,100%,50%)]/50 bg-[hsl(152,100%,50%)]/5" : "border-border hover:border-primary/40"}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : screenshot ? <CheckCircle2 className="w-4 h-4 text-[hsl(152,100%,50%)]" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">
              {screenshot 
                ? (isEn ? "Receipt attached ✅" : "تم رفع الصورة ✅") 
                : (isEn ? "Upload receipt screenshot (required)" : "ارفع سكرين شوت التحويل (مطلوب)")}
            </span>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
          {screenshot && <img src={screenshot} alt="Receipt" className="mt-2 rounded-xl border border-border max-h-40 w-auto" />}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
            {isEn ? "Note (Optional)" : "ملاحظة (اختياري)"}
          </label>
          <Textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder={isEn ? "Any additional details..." : "أي تفاصيل إضافية..."} 
            className="min-h-[60px]" 
          />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full gap-2 font-bold h-11">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isEn ? "Submit Payment Request" : "إرسال طلب الدفع"}
        </Button>
      </div>
    </div>
  );
}
