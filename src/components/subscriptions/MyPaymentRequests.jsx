import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Clock, CheckCircle2, XCircle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_INFO } from "@/lib/paymentInfo";
import { useLocale } from "@/lib/LocaleContext";

const STATUS = {
  pending: { labelAr: "قيد المراجعة", labelEn: "Under Review", icon: Clock, cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  approved: { labelAr: "تم القبول", labelEn: "Approved", icon: CheckCircle2, cls: "text-[hsl(152,100%,50%)] bg-[hsl(152,100%,50%)]/10 border-[hsl(152,100%,50%)]/30" },
  rejected: { labelAr: "مرفوض", labelEn: "Rejected", icon: XCircle, cls: "text-destructive bg-destructive/10 border-destructive/30" },
};

export default function MyPaymentRequests() {
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["myPaymentRequests", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.PaymentRequest.filter({ user_id: profile.id });
        const items = Array.isArray(list) ? list : [];
        return items.sort((a, b) => {
          const tA = new Date(a.created_date || a.created_at || 0).getTime();
          const tB = new Date(b.created_date || b.created_at || 0).getTime();
          return tB - tA;
        });
      } catch (err) {
        console.warn("MyPaymentRequests query failed:", err.message);
        return [];
      }
    },
    enabled: !!profile?.id,
    refetchInterval: 15000,
  });

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(isEn ? "Code copied ✅" : "تم نسخ الكود ✅");
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (!requests.length) return null;

  return (
    <div className="max-w-xl mx-auto mt-8" dir={dir}>
      <h3 className="font-black text-lg mb-3">{isEn ? "My Requests" : "طلباتي"}</h3>
      <div className="space-y-3">
        {requests.map((r) => {
          const st = STATUS[r.status] || STATUS.pending;
          const StIcon = st.icon;
          return (
            <div key={r.id} className="glass-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-sm">
                    {r.product_type === "credits" ? `${r.credits} ${isEn ? "Credits" : "كريدت"}` : (r.plan_name || (isEn ? "Subscription" : "اشتراك"))} · {r.amount} {isEn ? "EGP" : "ج"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{PAYMENT_INFO[r.method]?.label || r.method}</p>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">{r.sender_number}</p>
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${st.cls}`}>
                  <StIcon className="w-3 h-3" /> {isEn ? st.labelEn : st.labelAr}
                </span>
              </div>

              {r.status === "approved" && r.activation_code && (
                <div className="mt-2 rounded-xl bg-[hsl(152,100%,50%)]/10 border border-[hsl(152,100%,50%)]/30 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    {isEn 
                      ? `Activation Code ${r.plan_name ? `· ${r.plan_name}` : ""} — copy and redeem below`
                      : `كود التفعيل ${r.plan_name ? `· ${r.plan_name}` : ""} — انسخه وفعّله من الأسفل`}
                  </p>
                  <button
                    onClick={() => copyCode(r.activation_code)}
                    className="flex items-center gap-2 font-mono font-black text-base text-[hsl(152,100%,50%)] hover:opacity-80"
                    dir="ltr"
                  >
                    <Copy className="w-4 h-4 shrink-0" /> {r.activation_code}
                  </button>
                </div>
              )}

              {r.status === "approved" && !r.activation_code && (
                <p className="mt-2 rounded-xl bg-[hsl(152,100%,50%)]/10 border border-[hsl(152,100%,50%)]/30 p-3 text-xs font-bold text-[hsl(152,100%,50%)]">
                  {isEn 
                    ? `Added ${r.product_type === "credits" ? "credits" : "plan & credits"} directly to your account ✅`
                    : `تمت إضافة ${r.product_type === "credits" ? "الكريدتس" : "الخطة والكريدتس"} إلى حسابك مباشرة ✅`}
                </p>
              )}

              {r.status === "rejected" && r.admin_note && (
                <p className="text-xs text-destructive mt-1">{r.admin_note}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
