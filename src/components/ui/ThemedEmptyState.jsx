import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { motionTokens } from "@/lib/motionTokens";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

export function ThemedEmptyState({
  icon: Icon,
  title = "لا توجد عناصر بعد",
  description = "ابدأ بإنشاء محتواك الأول واستمتع بتجربة التعلم الذكية.",
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  className,
}) {
  const { dir } = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTokens.slow}
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-md shadow-xl my-4",
        className
      )}
      dir={dir}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-5 text-primary shadow-[0_0_30px_rgba(0,245,255,0.15)]">
          <Icon className="w-8 h-8" />
        </div>
      )}

      <h3 className="text-base sm:text-lg font-black text-white mb-2 font-heading tracking-tight">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-white/60 max-w-md leading-relaxed mb-6 font-sans">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          type="button"
          onClick={onAction}
          className="h-11 px-6 rounded-2xl font-bold text-xs gap-2 bg-gradient-to-r from-cyan-400 to-primary text-black hover:opacity-95 shadow-lg"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          <span>{actionLabel}</span>
        </Button>
      )}
    </motion.div>
  );
}

export default ThemedEmptyState;
