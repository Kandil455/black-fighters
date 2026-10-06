import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateDailyOrderSheet } from "@/lib/summaryV5/learnerModel";
import { canTriggerSessionStamp, consumeSessionStamp } from "@/design/atlasMotion";
import { Check, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { Button } from "@/components/ui/button";

export default function DailyOrderSheet({
  territories = [],
  reviewItems = [],
  activeDoc = null,
  examDate = null,
  onSelectOrder,
}) {
  const navigate = useNavigate();
  const [completedOrderIds, setCompletedOrderIds] = useState([]);

  const hasRealStudentData =
    (Array.isArray(territories) && territories.length > 0) ||
    (Array.isArray(reviewItems) && reviewItems.length > 0) ||
    Boolean(activeDoc);

  const sheet = useMemo(() => {
    if (!hasRealStudentData) {
      return { orders: [], totalEstimatedMinutes: 0, cramModeRecommended: false };
    }
    return generateDailyOrderSheet({
      territories,
      reviewItems,
      activeDoc,
      examDate,
    });
  }, [hasRealStudentData, territories, reviewItems, activeDoc, examDate]);

  const handleToggleComplete = (order, evt) => {
    evt.stopPropagation();
    setCompletedOrderIds((prev) => {
      const exists = prev.includes(order.id);
      const next = exists ? prev.filter((id) => id !== order.id) : [...prev, order.id];
      if (!exists && canTriggerSessionStamp()) {
        consumeSessionStamp();
      }
      return next;
    });
  };

  const handleOpenOrder = (order) => {
    if (onSelectOrder) {
      onSelectOrder(order);
      return;
    }
    if (order.actionRoute) {
      navigate(order.actionRoute);
    }
  };

  if (!hasRealStudentData || sheet.orders.length === 0) {
    return (
      <LVCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[#F2F3F5]">خطة النهارده</span>
            <LVBadge variant="default">لا توجد مهام معلّقة</LVBadge>
          </div>
          <p className="text-sm text-[#9AA0AE]">
            ارفع أول محاضرة أو أنشئ ملخصاً جديداً ليقوم محرك المراجعة الذكي (FSRS v4.5) بجدولة خطتك اليومية تلقائياً.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => navigate("/create")}>
          <span>ارفع أول محاضرة</span>
          <ArrowRight className="rtl:rotate-180" />
        </Button>
      </LVCard>
    );
  }

  return (
    <LVCard aria-label="خطة النهارده">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1E222B]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#F2F3F5]">خطة النهارده</h2>
            <LVBadge variant="accent" mono>
              {sheet.orders.length} مهام · ~{sheet.totalEstimatedMinutes} د
            </LVBadge>
          </div>
          <p className="text-xs text-[#9AA0AE] mt-1">
            مرتبة تلقائياً حسب أولوية التذكر (FSRS v4.5) ونقاط الضعف وتقدمك في المقررات
          </p>
        </div>

        {sheet.cramModeRecommended && (
          <LVBadge variant="warning">وضع ليلة الامتحان مفعّل</LVBadge>
        )}
      </div>

      <ol className="space-y-2.5">
        {sheet.orders.map((order, idx) => {
          const isDone = completedOrderIds.includes(order.id);
          const badgeVariant =
            order.priority === "critical"
              ? "danger"
              : order.priority === "high"
              ? "warning"
              : "accent";

          return (
            <li
              key={order.id}
              onClick={() => handleOpenOrder(order)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOpenOrder(order);
                }
              }}
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors duration-150 cursor-pointer",
                isDone
                  ? "border-[#1E222B] bg-white/[0.015] opacity-60"
                  : "border-[#1E222B] bg-white/[0.03] hover:border-[#262A34] hover:bg-white/[0.05]"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => handleToggleComplete(order, e)}
                  aria-label={isDone ? "إلغاء إكمال المهمة" : "تحديد المهمة كمكتملة"}
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-mono font-semibold tabular transition-colors duration-150",
                    isDone
                      ? "bg-[#3DDC97] text-[#03150c]"
                      : "bg-[#3DDC97]/10 text-[#3DDC97] border border-[#3DDC97]/30 hover:border-[#3DDC97]"
                  )}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-sm font-medium text-[#F2F3F5] truncate [unicode-bidi:plaintext]",
                        isDone && "line-through text-[#9AA0AE]"
                      )}
                    >
                      {order.titleAr}
                    </span>
                  </div>
                  <p className="text-xs text-[#9AA0AE] mt-0.5 truncate">
                    {order.subtitleAr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <LVBadge variant={badgeVariant} className="hidden sm:inline-flex">
                  {order.badgeText}
                </LVBadge>
                <span className="inline-flex items-center gap-1 text-xs font-mono tabular text-[#9AA0AE]" dir="ltr">
                  <Clock className="w-3.5 h-3.5 text-[#8A91A0]" />
                  {order.estimatedMinutes}m
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#3DDC97]/10 border border-[#3DDC97]/30 px-2.5 py-1 text-xs font-medium text-[#3DDC97]">
                  <span>ابدأ</span>
                  <ArrowRight className="size-3 rtl:rotate-180" />
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </LVCard>
  );
}
