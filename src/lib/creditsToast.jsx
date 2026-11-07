import { toast } from "sonner";
import { Bot } from "lucide-react";
import React from "react";

/**
 * Turns a terse charge failure into an actionable guide. The recurring
 * confusion: students sign in BOTH with Google and Telegram, ending up with
 * two accounts — the 15 welcome credits sit on the Telegram one while the
 * Google one shows 0, and "رصيدك غير كافي" leaves them angry and lost.
 */
export function showChargeError(err, { isEn = false } = {}) {
  const raw = String(err?.response?.data?.message || err?.message || err || "");
  const isCreditErr =
    raw.includes("كريدت") || raw.includes("رصيد") || /insufficient\s+credits?/i.test(raw);
  if (!isCreditErr) {
    toast.error(raw || (isEn ? "Operation failed" : "تعذر تنفيذ العملية"));
    return;
  }
  toast.error(raw, {
    description: isEn
      ? "Signed in with Telegram before? Your other account may be holding your credits — link it to merge everything."
      : "دخلت قبل كده بالتيليجرام؟ غالبًا رصيدك مختبي في الحساب التاني — اربطهم و كل رصيدك هيتحوّل ليك 💫",
    duration: 12000,
    icon: React.createElement(Bot, { className: "w-4 h-4 text-[#19f08c]" }),
    action: {
      label: isEn ? "Link accounts" : "ربط الحسابات",
      onClick: () => {
        window.location.assign("/settings");
      },
    },
  });
}
