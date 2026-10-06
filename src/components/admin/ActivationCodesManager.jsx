import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomSheetSelect from "@/components/ui/BottomSheetSelect";
import { Ticket, Loader2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PLANS } from "@/lib/plans";

const DURATIONS = [
  { value: "1", label: "يوم واحد" },
  { value: "2", label: "يومين" },
  { value: "7", label: "أسبوع" },
  { value: "30", label: "شهر" },
  { value: "90", label: "٣ شهور" },
  { value: "180", label: "٦ شهور" },
  { value: "365", label: "سنة" },
];

export default function ActivationCodesManager() {
  const [planKey, setPlanKey] = useState(PLANS[0].key);
  const [duration, setDuration] = useState("30");
  const [count, setCount] = useState(1);
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: codes = [], refetch, isFetching } = useQuery({
    queryKey: ["activationCodes"],
    queryFn: () => base44.entities.ActivationCode.list("-created_date", 200),
  });

  const generate = async () => {
    setGenerating(true);
    try {
      const plan = PLANS.find((p) => p.key === planKey);
      const res = await base44.functions.invoke("generateActivationCodes", {
        plan_key: planKey,
        plan_name: plan?.name || "",
        duration_days: Number(duration),
        count: Number(count),
        note,
      });
      if (res?.data?.success) {
        toast.success(`تم إنشاء ${res.data.codes.length} كود ✅`);
        setNote("");
        refetch();
      } else {
        toast.error(res?.data?.error || "حصل خطأ");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "حصل خطأ");
    } finally {
      setGenerating(false);
    }
  };

  const copy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود ✅");
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* نموذج الإنشاء */}
      <div className="glass-card rounded-3xl p-6 border border-[hsl(152,100%,50%)]/30">
        <h2 className="font-extrabold text-lg mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-[hsl(152,100%,50%)]" /> إنشاء أكواد تفعيل
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">الخطة</label>
            <BottomSheetSelect
              title="الخطة"
              value={planKey}
              onChange={setPlanKey}
              options={PLANS.map((p) => ({ value: p.key, label: `${p.name} (${p.monthly} ج)` }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">المدة</label>
            <BottomSheetSelect title="المدة" value={duration} onChange={setDuration} options={DURATIONS} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">عدد الأكواد (1–100)</label>
            <Input type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)} className="h-10" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ملاحظة (اختياري)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: حملة رمضان" className="h-10" />
          </div>

          <Button onClick={generate} disabled={generating} className="w-full gap-2 font-bold">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
            إنشاء الأكواد
          </Button>
        </div>
      </div>

      {/* قائمة الأكواد */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">{codes.length} كود</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </div>

        <div className="space-y-2 max-h-[34rem] overflow-y-auto scrollbar-none">
          {codes.map((c) => (
            <div key={c.id} className="glass-card rounded-2xl p-3 border border-border flex items-center justify-between gap-3">
              <div className="min-w-0">
                <button
                  onClick={() => copy(c.code)}
                  className="flex items-center gap-1.5 font-mono font-bold text-sm hover:text-primary transition-colors"
                  dir="ltr"
                >
                  <Copy className="w-3.5 h-3.5 shrink-0" /> {c.code}
                </button>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {c.plan_name || "خطة"} · {c.duration_days} يوم{c.note ? ` · ${c.note}` : ""}
                </p>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                  c.status === "active"
                    ? "bg-[hsl(152,100%,50%)]/15 text-[hsl(152,100%,50%)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {c.status === "active" ? "متاح" : c.status === "used" ? "مستخدم" : "موقوف"}
              </span>
            </div>
          ))}
          {!codes.length && !isFetching && (
            <div className="glass-card rounded-2xl p-6 border border-border text-center text-muted-foreground">
              لا توجد أكواد بعد
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
