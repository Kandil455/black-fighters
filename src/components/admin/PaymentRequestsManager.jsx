import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, RefreshCw, Copy, ExternalLink, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_INFO } from "@/lib/paymentInfo";
import { db } from "@/lib/firebaseDb";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

function RequestCard({ req, onChanged }) {
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);

  const approve = async (deliveryMode) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("approvePaymentRequest", {
        request_id: req.id,
        action: "approve",
        delivery_mode: deliveryMode,
        admin_note: adminNote,
      });
      if (res?.data?.success) {
        toast.success(deliveryMode === "code" ? `تم القبول وتوليد الكود: ${res.data.code} ✅` : "تم القبول والتفعيل المباشر ✅");
        onChanged();
      } else {
        toast.error(res?.data?.error || "حصل خطأ");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "حصل خطأ");
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!confirm("هل أنت متأكد من رفض وحذف هذا الطلب نهائياً من قاعدة البيانات؟")) return;
    setBusy(true);
    try {
      await base44.functions.invoke("approvePaymentRequest", {
        request_id: req.id,
        action: "reject",
        admin_note: adminNote || "تم رفض الطلب",
      });
      try {
        await base44.entities.PaymentRequest.delete(req.id);
      } catch {}
      toast.success("تم رفض وحذف الطلب نهائياً 🗑️");
      onChanged();
    } catch (e) {
      toast.error(e.message || "حصل خطأ");
    } finally {
      setBusy(false);
    }
  };

  const deletePermanently = async () => {
    if (!confirm("هل تريد حذف هذا السجل نهائياً؟")) return;
    setBusy(true);
    try {
      await base44.entities.PaymentRequest.delete(req.id);
      toast.success("تم الحذف نهائياً 🗑️");
      onChanged();
    } catch (e) {
      toast.error(e.message || "فشل الحذف");
    } finally {
      setBusy(false);
    }
  };

  const isPending = req.status === "pending";

  return (
    <div className={`glass-card rounded-2xl p-4 border ${isPending ? "border-yellow-400/30" : req.status === "approved" ? "border-[hsl(152,100%,50%)]/30" : "border-destructive/30"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{req.user_name || req.user_email || "مستخدم"}</p>
          <p className="text-[11px] text-muted-foreground truncate">{req.user_email}</p>
        </div>
        <span className="text-lg font-black text-yellow-400 shrink-0">{req.amount} ج</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="rounded-lg bg-secondary/40 px-2.5 py-1.5">
          <span className="text-muted-foreground">الوسيلة: </span>
          <b>{PAYMENT_INFO[req.method]?.label || req.method}</b>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(req.sender_number); toast.success("تم نسخ الرقم ✅"); }}
          className="rounded-lg bg-secondary/40 px-2.5 py-1.5 flex items-center gap-1 hover:text-primary"
          dir="ltr"
        >
          <Copy className="w-3 h-3 shrink-0" /> {req.sender_number}
        </button>
      </div>

      {(req.plan_name || req.credits) && (
        <p className="text-xs font-bold text-primary mb-3">
          {req.product_type === "credits" ? `باقة رصيد: ${req.credits} كريدت` : `الخطة المطلوبة: ${req.plan_name} · ${req.duration_days === 365 ? "سنوي" : "شهري"}`}
        </p>
      )}

      {req.note && <p className="text-xs text-muted-foreground mb-2">📝 {req.note}</p>}

      {req.screenshot_url && (
        <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mb-3 group">
          <img src={req.screenshot_url} alt="إثبات التحويل" className="rounded-xl border border-border w-full max-h-44 object-cover group-hover:border-primary/40 transition-colors" />
          <span className="inline-flex items-center gap-1 text-[11px] text-primary mt-1 group-hover:underline">
            <ExternalLink className="w-3 h-3" /> فتح الصورة بالحجم الكامل
          </span>
        </a>
      )}

      {isPending ? (
        <div className="space-y-2 border-t border-border/40 pt-3">
          <Input value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="h-9" />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => approve("direct")} disabled={busy} className="gap-1.5 bg-[hsl(152,100%,50%)] text-background hover:opacity-90 font-bold">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} تفعيل مباشر
            </Button>
            <Button onClick={() => approve("code")} disabled={busy} variant="outline" className="gap-1.5 font-bold">
              <Copy className="w-4 h-4" /> إصدار كود
            </Button>
          </div>
          <div className="flex">
            <Button onClick={reject} disabled={busy} variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" /> رفض وحذف الطلب نهائياً
            </Button>
          </div>
        </div>
      ) : req.status === "approved" ? (
        <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">{req.delivery_mode === "code" ? "تمت الموافقة وإصدار كود" : "تمت الموافقة والتفعيل على الحساب مباشرة"}</p>
            {req.activation_code && <button onClick={() => { navigator.clipboard.writeText(req.activation_code); toast.success("تم النسخ ✅"); }} className="font-mono font-black text-[hsl(152,100%,50%)] flex items-center gap-1.5" dir="ltr">
              <Copy className="w-3.5 h-3.5" /> {req.activation_code}
            </button>}
          </div>
          <Button size="sm" variant="ghost" onClick={deletePermanently} disabled={busy} className="text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-t border-border/40 pt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-destructive">مرفوض{req.admin_note ? ` · ${req.admin_note}` : ""}</p>
          <Button size="sm" variant="ghost" onClick={deletePermanently} disabled={busy} className="text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PaymentRequestsManager() {
  const [filter, setFilter] = useState("pending");

  const { data: requests = [], refetch, isFetching } = useQuery({
    queryKey: ["adminPaymentRequests"],
    queryFn: async () => {
      if (db) {
        try {
          const snap = await getDocs(query(collection(db, "paymentRequests"), orderBy("created_at", "desc"), limit(300)));
          if (!snap.empty) {
            return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        } catch {
          try {
            const snap = await getDocs(collection(db, "paymentRequests"));
            if (!snap.empty) {
              const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              return docs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
            }
          } catch {}
        }
      }
      return base44.entities.PaymentRequest.list("-created_date", 200);
    },
  });

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {[
            { v: "pending", l: `قيد الانتظار (${pendingCount})` },
            { v: "approved", l: `تم القبول (${approvedCount})` },
            { v: "rejected", l: `مرفوض (${rejectedCount})` },
            { v: "all", l: `الكل (${requests.length})` },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === f.v ? "bg-primary/15 text-primary border border-primary/30" : "text-muted-foreground"}`}
            >
              {f.l}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((r) => <RequestCard key={r.id} req={r} onChanged={refetch} />)}
      </div>

      {!filtered.length && !isFetching && (
        <div className="glass-card rounded-2xl p-8 border border-border text-center text-muted-foreground flex flex-col items-center gap-2">
          <Clock className="w-8 h-8 opacity-50" />
          لا توجد طلبات {filter === "pending" ? "قيد المراجعة" : ""}
        </div>
      )}
    </div>
  );
}
