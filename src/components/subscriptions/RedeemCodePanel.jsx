import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Ticket, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";
import { useAuth } from "@/lib/AuthContext";

export default function RedeemCodePanel() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const redeem = async () => {
    const c = code.trim();
    if (!c || loading) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("redeemActivationCode", { code: c });
      const data = res?.data;
      if (data?.success) {
        setDone(data);
        toast.success(
          data.product_type === "subscription"
            ? (isEn ? "Subscription activated successfully 🎉" : "تم تفعيل اشتراكك بنجاح 🎉")
            : (isEn ? `+${data.credits} credits added 🎉` : `أُضيف ${data.credits} كريدت 🎉`)
        );
        refreshProfile?.().catch(() => {}); // sync balance/plan across the app
        setCode("");
      } else {
        toast.error(data?.error || (isEn ? "Invalid activation code" : "الكود غير صحيح"));
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || (isEn ? "An error occurred, try again" : "حصل خطأ، جرّب تاني"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 border border-[hsl(152,100%,50%)]/30 neon-glow-green" dir={dir}>
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="w-6 h-6 text-[hsl(152,100%,50%)]" />
        <h3 className="text-xl font-black">{isEn ? "Have an Activation Code?" : "عندك كود تفعيل؟"}</h3>
      </div>

      {done ? (
        <div className="flex items-center gap-3 bg-secondary/40 rounded-2xl p-4 border border-border">
          <CheckCircle2 className="w-8 h-8 text-[hsl(152,100%,50%)] shrink-0" />
          <div>
            <p className="font-bold">
              {done.product_type === "subscription"
                ? (isEn ? `${done.plan_name || "Premium"} subscription active!` : `اشتراك ${done.plan_name || "Premium"} مفعّل!`)
                : (isEn ? `Code redeemed — +${done.credits} credits added!` : `تم تفعيل الكود — أُضيف ${done.credits} كريدت!`)}
            </p>
            <p className="text-sm text-muted-foreground">
              {done.product_type === "subscription" && done.expires_at
                ? (isEn
                  ? `Expires on ${new Date(done.expires_at).toLocaleDateString("en-US")}`
                  : `ينتهي في ${new Date(done.expires_at).toLocaleDateString("ar-EG")}`)
                : (isEn ? `New balance: ${done.balance} credits` : `رصيدك الجديد: ${done.balance} كريدت`)}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && redeem()}
            placeholder="BF-XXXX-XXXX"
            className="flex-1 h-12 rounded-xl bg-background border border-input px-4 font-mono tracking-wider uppercase focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            onClick={redeem}
            disabled={loading || !code.trim()}
            className="h-12 px-6 rounded-xl bg-[hsl(152,100%,50%)] text-background font-black flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEn ? "Redeem" : "تفعيل")}
          </button>
        </div>
      )}
    </div>
  );
}
