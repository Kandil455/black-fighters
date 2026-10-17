import React, {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { cva } from "class-variance-authority";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ShieldCheck,
  TrendingDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/LocaleContext";
import { BlackFightersCrest } from "@/components/ui/BlackFightersCrest";
import { BlackFightersAnimated } from "@/components/ui/BlackFightersAnimated";

/**
 * LineVault Physics Motion Dictionary (Section C.2)
 */
export const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

export const rise = (i = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
});

export function AmbientCanvas({ className, variant = "grid" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070a]",
        className
      )}
    >
      <div className="absolute inset-0 bg-radial-emerald" />
      {variant !== "minimal" && <div className="bg-grid absolute inset-0 opacity-85" />}
    </div>
  );
}

export function LVLogo({
  to,
  label = "Black Fighters",
  showSubtitle = false,
  subtitle = "V5 ATLAS × LINEVAULT",
  className,
}) {
  const inner = (
    <span className={cn("inline-flex items-center gap-2.5 select-none group", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#19f08c]/40 bg-[#19f08c]/10 shadow-[0_0_24px_-6px_rgba(25,240,140,0.45)] transition-colors duration-150 group-hover:border-[#19f08c]/70">
        <BlackFightersAnimated size={28} variant="emerald" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm sm:text-base font-bold tracking-tight text-[#f5f7fa] whitespace-nowrap">
          {label}
        </span>
        {showSubtitle && (
          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#9aa4b2] whitespace-nowrap">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function LVLangSwitch({ className }) {
  const { locale, setLocale } = useLocale();
  return (
    <div
      className={cn(
        "glass inline-flex items-center rounded-full p-0.5 text-xs font-mono",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setLocale("ar")}
        className={cn(
          "px-2.5 py-1 rounded-full font-sans font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap",
          locale === "ar"
            ? "bg-[#19f08c] text-[#03150c]"
            : "text-[#9aa4b2] hover:text-[#f5f7fa]"
        )}
      >
        عربي
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "px-2.5 py-1 rounded-full font-mono font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap",
          locale === "en"
            ? "bg-[#19f08c] text-[#03150c]"
            : "text-[#9aa4b2] hover:text-[#f5f7fa]"
        )}
      >
        EN
      </button>
    </div>
  );
}

export const LVCard = forwardRef(function LVCard(
  {
    className,
    padding = "p-6",
    variant = "default",
    accent = false,
    interactive = false,
    as: Comp = "div",
    children,
    ...props
  },
  ref
) {
  const resolvedVariant = accent && variant === "default" ? "highlight" : variant;
  return (
    <Comp
      ref={ref}
      className={cn(
        "relative rounded-2xl transition-colors duration-200",
        padding,
        resolvedVariant === "default" && "glass text-[#f5f7fa]",
        resolvedVariant === "subtle" &&
          "border border-white/[0.07] bg-[#090c11]/80 text-[#f5f7fa]",
        resolvedVariant === "highlight" &&
          "glass border-[#19f08c]/45 text-[#f5f7fa] shadow-[0_0_36px_-12px_rgba(25,240,140,0.3)]",
        interactive &&
          "hover:border-[#19f08c]/40 hover:bg-white/[0.04] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

export const GlassCard = LVCard;

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.04] text-[#9aa4b2]",
        neutral: "border-white/10 bg-white/[0.04] text-[#9aa4b2]",
        accent: "border-[#19f08c]/35 bg-[#19f08c]/12 text-[#19f08c]",
        emerald: "border-[#19f08c]/35 bg-[#19f08c]/12 text-[#19f08c]",
        amber: "border-[#f5b83d]/35 bg-[#f5b83d]/12 text-[#f5b83d]",
        warn: "border-[#f5b83d]/35 bg-[#f5b83d]/12 text-[#f5b83d]",
        warning: "border-[#f5b83d]/35 bg-[#f5b83d]/12 text-[#f5b83d]",
        danger: "border-[#ff5d6c]/35 bg-[#ff5d6c]/12 text-[#ff5d6c]",
        muted: "border-white/[0.07] bg-white/[0.03] text-[#646e7d]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function LVBadge({ className, variant, mono = false, ...props }) {
  return (
    <span
      className={cn(badgeVariants({ variant }), mono && "font-mono tabular", className)}
      {...props}
    />
  );
}

export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className,
  align = "center",
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-24 relative", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {(eyebrow || title || subtitle) && (
          <div
            className={cn(
              "mb-12 space-y-3",
              align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
            )}
          >
            {eyebrow && (
              <div
                className={cn(
                  "inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#19f08c]",
                  align === "center" && "justify-center"
                )}
              >
                <span className="pulse-dot" />
                <span>{eyebrow}</span>
              </div>
            )}
            {title && (
              <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-gradient">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-[#9aa4b2] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  align = "start",
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center text-center",
        className
      )}
    >
      <div className="space-y-1.5 max-w-2xl">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#19f08c]">
            <span className="size-1.5 rounded-full bg-[#19f08c]" />
            <span>{eyebrow}</span>
          </div>
        )}
        {title && (
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gradient">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-sm text-[#9aa4b2] leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  badge,
  title,
  subtitle,
  description,
  actions,
  className,
}) {
  const topLabel = eyebrow || badge;
  const subText = subtitle || description;
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-5 border-b border-white/[0.08]",
        className
      )}
    >
      <div className="space-y-1.5 max-w-2xl">
        {topLabel && (
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#19f08c]">
            <span className="size-1.5 rounded-full bg-[#19f08c]" />
            <span>{topLabel}</span>
          </div>
        )}
        {title && (
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gradient">
            {title}
          </h1>
        )}
        {subText && (
          <p className="text-sm text-[#9aa4b2] leading-relaxed">{subText}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}

export function CopyButton({ value, className }) {
  const [copied, setCopied] = useState(false);
  const onCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#9aa4b2] hover:border-[#19f08c]/40 hover:text-[#19f08c] transition-colors cursor-pointer",
        className
      )}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="size-3.5 text-[#19f08c]" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

export function CopyField({ label, value, mono = true, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <span className="block text-xs font-medium text-[#9aa4b2]">{label}</span>
      )}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0e131b] px-3.5 py-2.5">
        <span
          dir="ltr"
          className={cn(
            "truncate text-sm text-[#f5f7fa] select-all",
            mono && "font-mono tabular"
          )}
        >
          {value}
        </span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export const LVButton = forwardRef(function LVButton(
  {
    className,
    variant = "primary",
    size = "md",
    as: Comp = "button",
    children,
    ...props
  },
  ref
) {
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19f08c]/50 disabled:pointer-events-none disabled:opacity-45 cursor-pointer active:scale-[0.98]",
        variant === "primary" && "btn-primary-glow",
        variant === "secondary" &&
          "glass text-[#f5f7fa] hover:border-[#19f08c]/40 hover:bg-white/[0.05]",
        variant === "ghost" &&
          "text-[#9aa4b2] hover:bg-white/[0.05] hover:text-[#f5f7fa]",
        variant === "danger" &&
          "border border-[#ff5d6c]/35 bg-[#ff5d6c]/12 text-[#ff5d6c] hover:bg-[#ff5d6c]/20",
        size === "sm" && "h-9 px-3.5 text-xs rounded-lg",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        size === "icon" && "size-10 p-0",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

export const LVInput = forwardRef(function LVInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-white/10 bg-[#0e131b] px-3.5 py-2 text-sm text-[#f5f7fa] placeholder:text-[#646e7d] transition-colors focus-visible:outline-none focus-visible:border-[#19f08c]/60 focus-visible:ring-2 focus-visible:ring-[#19f08c]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

export function SegmentedTabs({
  items = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#090c11] p-1",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap",
              size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-xs sm:text-sm",
              active
                ? "bg-[#19f08c]/15 text-[#19f08c] border border-[#19f08c]/35 font-semibold"
                : "text-[#9aa4b2] hover:text-[#f5f7fa]"
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 font-mono text-[11px] tabular",
                  active
                    ? "bg-[#19f08c]/20 text-[#19f08c]"
                    : "bg-white/[0.05] text-[#9aa4b2]"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function formatInt(n) {
  return Math.round(Number(n) || 0).toLocaleString("en-US");
}

export function compactQty(n) {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return String(n);
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  className,
}) {
  const reduce = useReducedMotion();
  const targetValue = Number(value) || 0;
  const mv = useMotionValue(reduce ? targetValue : 0);
  const spring = useSpring(mv, { stiffness: 140, damping: 24, mass: 0.65 });
  const text = useTransform(spring, (latest) => {
    if (format) return `${prefix}${format(latest)}${suffix}`;
    const num = Number(latest) || 0;
    const formatted =
      decimals > 0
        ? num.toFixed(decimals)
        : Math.round(num).toLocaleString("en-US");
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    const target = Number(value) || 0;
    if (reduce) mv.jump(target);
    else mv.set(target);
  }, [value, reduce, mv]);

  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}

const STREAM_POOL = [
  {
    plate: "PLATE-01",
    termEn: "Ventricular Phase 2 Plateau",
    termAr: "طور الهضبة — قنوات L-type Ca2+",
    citation: "✓ p.12",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-02",
    termEn: "Amiodarone IV Loading Dose",
    termAr: "150–300 mg IV bolus over 10 min",
    citation: "✓ p.13",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-03",
    termEn: "Starling Law Preload Relation",
    termAr: "حجم نهاية الانبساط EDV وقوة الانقباض",
    citation: "✓ p.19",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-04",
    termEn: "SA Node Pacemaker Funny Current (If)",
    termAr: "دخول الصوديوم التلقائي في المرحلة 4",
    citation: "✓ p.24",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-05",
    termEn: "Heparin vs Warfarin Monitoring",
    termAr: "مقارنة aPTT مقابل PT/INR ومضادات التسمم",
    citation: "✓ p.31",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-06",
    termEn: "Atropine Muscarinic Blockade",
    termAr: "تثبيط العصب الحائر ورفع نبض العقدة الجيبية",
    citation: "✓ p.38",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-07",
    termEn: "FSRS v4.5 Memory Stability",
    termAr: "جدولة الاستدعاء النشط بنسبة إتقان 96%",
    citation: "✓ p.44",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-08",
    termEn: "Digoxin Na+/K+ ATPase Inhibition",
    termAr: "زيادة الكالسيوم داخل الخلية وتنبيه العصب الحائر",
    citation: "✓ p.52",
    status: "VERIFIED",
  },
  {
    plate: "PLATE-09",
    termEn: "Beta-1 Selective Blockers (Metoprolol)",
    termAr: "خفض استهلاك الأكسجين القلبي ومعدل النبض",
    citation: "✓ p.61",
    status: "VERIFIED",
  },
];

export function LineStream({ locale = "ar" }) {
  const isAr = locale === "ar";
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setOffset((prev) => (prev + 1) % STREAM_POOL.length);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const visibleRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const idx = (offset + i) % STREAM_POOL.length;
      rows.push({ ...STREAM_POOL[idx], key: `${STREAM_POOL[idx].plate}-${offset + i}` });
    }
    return rows;
  }, [offset]);

  return (
    <div className="glass-strong rounded-2xl p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <span className="pulse-dot" />
          <span className="font-mono text-xs font-semibold tracking-wider text-[#19f08c]">
            LIVE ATLAS STREAM
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#9aa4b2]" dir="ltr">
          CROSS-FAMILY VERIFIER · V5
        </span>
      </div>

      <div className="space-y-2 min-h-[348px]">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleRows.map((item) => (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#05070a]/70 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[10px] font-semibold text-[#19f08c]"
                    dir="ltr"
                  >
                    {item.plate}
                  </span>
                  <span
                    className="font-mono text-xs font-semibold text-[#f5f7fa] truncate"
                    dir="ltr"
                  >
                    {item.termEn}
                  </span>
                </div>
                <p className="text-xs text-[#9aa4b2] truncate mt-0.5">
                  {item.termAr}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0" dir="ltr">
                <span className="rounded-full border border-[#19f08c]/35 bg-[#19f08c]/12 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#19f08c]">
                  {item.citation}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#9aa4b2]">
        <span>
          {isAr
            ? "تدقيق آلي مزدوج ضد الهلوسة الرقمية"
            : "Dual-model dosage & page verification"}
        </span>
        <span className="text-[#19f08c]" dir="ltr">
          99.4% ACCURACY
        </span>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  numericValue,
  sub,
  icon: Icon,
  accent = "emerald",
  className,
}) {
  const accentMap = {
    emerald: "text-[#19f08c] bg-[#19f08c]/12 border-[#19f08c]/30",
    amber: "text-[#f5b83d] bg-[#f5b83d]/12 border-[#f5b83d]/30",
    sky: "text-[#38bdf8] bg-[#38bdf8]/12 border-[#38bdf8]/30",
    violet: "text-[#19f08c] bg-[#19f08c]/12 border-[#19f08c]/30",
  };
  const pillClass = accentMap[accent] || accentMap.emerald;

  return (
    <GlassCard className={cn("p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-[#9aa4b2] truncate">{label}</p>
          <p className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[#f5f7fa] tabular">
            {numericValue !== undefined ? (
              <AnimatedNumber value={numericValue} />
            ) : (
              value
            )}
          </p>
          {sub && (
            <p className="text-[11px] text-[#9aa4b2] truncate">{sub}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl border",
              pillClass
            )}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <GlassCard
      variant="subtle"
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl border border-[#19f08c]/30 bg-[#19f08c]/12 text-[#19f08c]">
          <Icon className="size-5" />
        </div>
      )}
      {title && (
        <h3 className="font-display text-base sm:text-lg font-semibold text-[#f5f7fa]">
          {title}
        </h3>
      )}
      {description && (
        <p className="mt-1.5 max-w-md text-xs sm:text-sm text-[#9aa4b2] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </GlassCard>
  );
}

export function PricingCard({
  name,
  badge,
  price,
  currency = "ج.م",
  period = "/ شهرياً",
  description,
  features = [],
  ctaLabel = "اشترك الآن",
  onSelect,
  to,
  recommended = false,
  className,
}) {
  return (
    <GlassCard
      variant={recommended ? "highlight" : "default"}
      className={cn(
        "flex flex-col justify-between p-6 sm:p-7",
        recommended && "border-[#19f08c]/45",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-display text-lg font-bold text-[#f5f7fa]">{name}</h3>
          {badge && (
            <LVBadge variant={recommended ? "emerald" : "neutral"}>
              {badge}
            </LVBadge>
          )}
        </div>
        {description && (
          <p className="text-xs text-[#9aa4b2] mb-5 leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex items-baseline gap-1.5 mb-6 font-mono tabular">
          <span className="text-3xl sm:text-4xl font-bold text-[#f5f7fa]">
            {price}
          </span>
          <span className="text-xs text-[#9aa4b2]">{currency}</span>
          {period && <span className="text-xs text-[#646e7d]">{period}</span>}
        </div>
        <ul className="space-y-2.5 mb-7 text-xs sm:text-sm text-[#f5f7fa]/90">
          {features.map((feat, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-[#19f08c] mt-0.5" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {to ? (
        <Link
          to={to}
          className={cn(
            "w-full h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors duration-150",
            recommended
              ? "btn-primary-glow"
              : "border border-white/10 bg-white/[0.04] text-[#f5f7fa] hover:border-[#19f08c]/40 hover:bg-white/[0.07]"
          )}
        >
          <span>{ctaLabel}</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "w-full h-11 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer",
            recommended
              ? "btn-primary-glow"
              : "border border-white/10 bg-white/[0.04] text-[#f5f7fa] hover:border-[#19f08c]/40 hover:bg-white/[0.07]"
          )}
        >
          <span>{ctaLabel}</span>
        </button>
      )}
    </GlassCard>
  );
}

function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function CountdownRing({
  expiresAt,
  startAt,
  onElapsed,
  size = 84,
  label = "Time remaining",
}) {
  const end = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const total = useMemo(() => {
    if (!startAt) return 15 * 60 * 1000;
    return Math.max(1000, end - new Date(startAt).getTime());
  }, [end, startAt]);

  const [now, setNow] = useState(null);
  const fired = useRef(false);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = now === null ? total : Math.max(0, end - now);

  useEffect(() => {
    if (now !== null && left === 0 && !fired.current) {
      fired.current = true;
      onElapsed?.();
    }
  }, [now, left, onElapsed]);

  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const tone =
    left < 60_000 ? "#ff5d6c" : left < 300_000 ? "#f5b83d" : "#19f08c";
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);

  return (
    <div
      role="timer"
      aria-label={label}
      className="relative grid shrink-0 place-items-center"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, left / total))}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span
        className="absolute font-mono text-[15px] font-semibold tabular text-[#f5f7fa]"
        dir="ltr"
      >
        {pad2(mm)}:{pad2(ss)}
      </span>
    </div>
  );
}

function StepDot({ state }) {
  const base =
    "relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-300";
  if (state === "done") {
    return (
      <span className={cn(base, "bg-[#19f08c] text-[#03150c] ring-[#19f08c]")}>
        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className={cn(base, "bg-[#ff5d6c]/15 text-[#ff5d6c] ring-[#ff5d6c]/50")}>
        <X className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className={cn(base, "bg-[#19f08c]/15 ring-[#19f08c]/60")}>
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[#19f08c]/30 motion-safe:animate-ping"
        />
        <span
          aria-hidden="true"
          className="relative size-2.5 rounded-full bg-[#19f08c]"
        />
      </span>
    );
  }
  return (
    <span className={cn(base, "ring-white/10")}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[#646e7d]" />
    </span>
  );
}

export function Stepper({ steps = [] }) {
  return (
    <ol>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={s.key || i}
            aria-current={s.state === "current" ? "step" : undefined}
            className="relative flex gap-3 pb-6 last:pb-0"
          >
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute start-[13px] top-7 bottom-0 w-px transition-colors duration-500",
                  s.state === "done"
                    ? "bg-[#19f08c]/60"
                    : "bg-white/10"
                )}
              />
            )}
            <StepDot state={s.state} />
            <div className="min-w-0 pt-0.5">
              <div
                className={cn(
                  "text-sm font-medium",
                  s.state === "pending" ? "text-[#9aa4b2]" : "text-[#f5f7fa]"
                )}
              >
                {s.label}
              </div>
              {s.sub && (
                <div className="mt-0.5 text-xs text-[#9aa4b2] tabular">
                  {s.sub}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ConnBadge({ mode = "sse", isEn = false }) {
  const map = {
    sse: {
      dot: "bg-[#19f08c]",
      ping: true,
      text: isEn ? "Live Vault" : "متصل مباشرة",
    },
    poll: {
      dot: "bg-[#f5b83d]",
      ping: false,
      text: isEn ? "Syncing" : "مزامنة",
    },
    offline: {
      dot: "bg-[#ff5d6c]",
      ping: false,
      text: isEn ? "Reconnecting…" : "إعادة اتصال…",
    },
  }[mode] || {
    dot: "bg-[#19f08c]",
    ping: true,
    text: isEn ? "Live Vault" : "متصل مباشرة",
  };

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-[#9aa4b2]"
    >
      <span className="relative flex size-2">
        {map.ping && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping",
              map.dot
            )}
          />
        )}
        <span
          aria-hidden="true"
          className={cn("relative size-2 rounded-full", map.dot)}
        />
      </span>
      {map.text}
    </span>
  );
}

export function AnimatedCheck() {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#19f08c]/40 bg-[#19f08c]/12 text-[#19f08c]">
      <svg
        viewBox="0 0 24 24"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <motion.path
          d="M5 13l4 4L19 7"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
}

export function AvailabilityBar({
  available = 50000,
  max = 50000,
  sharePct,
  label = "Pool availability",
  availableSuffix = "available",
}) {
  const denom = Math.max(max, available, 1);
  const pct =
    sharePct !== undefined
      ? Math.min(100, Math.max(0, sharePct))
      : Math.min(100, Math.round((available / denom) * 100));
  const low = available < max * 0.2;
  const widthClasses =
    pct >= 90
      ? "w-full"
      : pct >= 75
      ? "w-4/5"
      : pct >= 50
      ? "w-3/5"
      : pct >= 30
      ? "w-2/5"
      : "w-1/4";

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium uppercase tracking-wider text-[#9aa4b2]">
          {label}
        </span>
        <span className="font-mono text-[#9aa4b2] tabular" dir="ltr">
          {formatInt(available)} {availableSuffix}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={denom}
        aria-valuenow={available}
        className="h-2 overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            widthClasses,
            low ? "bg-[#f5b83d]" : "bg-[#19f08c]"
          )}
        />
      </div>
    </div>
  );
}

export function TierList({
  tiers = [],
  activeMinQty,
  unitLabel = "نقطة",
  currencyLabel = "ج.م",
  isEn = false,
}) {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const base = sorted[0]?.unit_price || 1;
  return (
    <ul className="divide-y divide-white/[0.08] text-sm">
      {sorted.map((tier, i) => {
        const pct = base
          ? Math.round((1 - tier.unit_price / base) * 100)
          : 0;
        const isActive = tier.min_qty === activeMinQty;
        return (
          <li
            key={tier.min_qty}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex items-center justify-between gap-3 py-2.5",
              isActive &&
                "-mx-3 rounded-xl bg-[#19f08c]/12 border border-[#19f08c]/30 px-3"
            )}
          >
            <span className="text-[#9aa4b2] font-mono tabular" dir="ltr">
              {compactQty(tier.min_qty)}+ {isEn ? "Credits" : unitLabel}
            </span>
            <span className="flex items-center gap-2">
              {i > 0 && pct > 0 && (
                <span className="rounded-full bg-[#19f08c]/12 border border-[#19f08c]/30 px-2 py-0.5 text-xs font-mono text-[#19f08c]">
                  {isEn ? `Save ${pct}%` : `وفّر ${pct}%`}
                </span>
              )}
              <span className="font-mono tabular text-[#f5f7fa]" dir="ltr">
                {tier.unit_price.toFixed(2)} {isEn ? "EGP" : currencyLabel}
                <span className="text-[#9aa4b2]">
                  {" "}
                  / {isEn ? "cr" : unitLabel}
                </span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export const CREDIT_CHIPS = [100, 250, 500, 1000, 2500, 5000, 10000];
const CREDIT_TIERS = [
  { min_qty: 100, max_qty: 250, unit_price: 0.5, nameAr: "الشريحة 1 · أساسي", nameEn: "Tier 1 · Standard" },
  { min_qty: 250, max_qty: 500, unit_price: 0.44, nameAr: "الشريحة 2 · دفعة طلابية", nameEn: "Tier 2 · Scholar Pack" },
  { min_qty: 500, max_qty: 1000, unit_price: 0.38, nameAr: "الشريحة 3 · مكثف", nameEn: "Tier 3 · Intensive" },
  { min_qty: 1000, max_qty: 2500, unit_price: 0.32, nameAr: "الشريحة 4 · دفعة امتحانات", nameEn: "Tier 4 · Exam Vault" },
  { min_qty: 2500, max_qty: 5000, unit_price: 0.27, nameAr: "الشريحة 5 · مجموعة دراسية", nameEn: "Tier 5 · Study Syndicate" },
  { min_qty: 5000, max_qty: Infinity, unit_price: 0.22, nameAr: "الشريحة 6 · أطلس كامل", nameEn: "Tier 6 · Full Atlas" },
];

export function creditQtySteps(min = 100, max = 10000) {
  const out = [];
  for (let decade = 100; decade <= max; decade *= 10) {
    const step = decade / 10;
    const end = decade * 10 - step;
    for (let v = Math.max(min, decade); v <= end && v <= max; v += step) {
      out.push(Math.round(v));
    }
  }
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}

export function nearestStepIndex(steps, qty) {
  const q = Math.max(qty, 1);
  let best = 0;
  let bestD = Infinity;
  steps.forEach((v, i) => {
    const d = Math.abs(Math.log(v / q));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * Strictly Monotonic Progressive Bracket Pricing:
 * Every additional credit is priced at its bracket's marginal rate so that
 * buying 2,500 credits is ALWAYS more expensive than buying 2,400 credits
 * while still rewarding larger quantities with progressive volume savings.
 */
export function quoteForCredits(qty) {
  const safeQty = Math.max(50, Math.min(10000, Math.round(Number(qty) || 100)));
  const sorted = [...CREDIT_TIERS].sort((a, b) => a.min_qty - b.min_qty);
  const baseUnit = sorted[0].unit_price;

  let activeTier = sorted[0];
  for (const t of sorted) {
    if (safeQty >= t.min_qty) activeTier = t;
  }
  const rank = sorted.indexOf(activeTier) + 1;

  // Progressive cumulative bracket calculation (0 -> safeQty)
  let progressiveTotal = 0;
  for (let i = 0; i < sorted.length; i++) {
    const bracketStart = i === 0 ? 0 : sorted[i].min_qty;
    const bracketEnd = sorted[i].max_qty ?? (sorted[i + 1]?.min_qty || Infinity);
    if (safeQty > bracketStart) {
      const taxableInBracket = Math.min(safeQty, bracketEnd) - bracketStart;
      progressiveTotal += taxableInBracket * sorted[i].unit_price;
    }
  }

  const totalEgp = Math.max(1, Math.round(progressiveTotal));
  const baseTotalEgp = Math.round(safeQty * baseUnit);
  const savingsEgp = Math.max(0, baseTotalEgp - totalEgp);
  const effectiveUnitPrice = Number((totalEgp / safeQty).toFixed(2));
  const savePct = baseTotalEgp > 0 ? Math.max(0, Math.round((savingsEgp / baseTotalEgp) * 100)) : 0;
  const nextTier = sorted.find((t) => t.min_qty > safeQty) || null;

  return {
    qty: safeQty,
    tier: activeTier,
    rank,
    unitPrice: effectiveUnitPrice,
    marginalUnitPrice: activeTier.unit_price,
    totalEgp,
    savingsEgp,
    savePct,
    nextTier,
  };
}

export function LVConfigurator({
  locale = "ar",
  onSelectCustomPack,
  selectedQty,
}) {
  const isEn = locale === "en";
  const inputId = useId();
  const minQty = 100;
  const maxQty = 10000;
  const poolAvailable = 50000;
  const steps = useMemo(() => creditQtySteps(minQty, maxQty), []);

  const [qty, setQty] = useState(selectedQty || 1000);
  const [raw, setRaw] = useState(() => formatInt(selectedQty || 1000));
  const [demoStage, setDemoStage] = useState(0);
  const [timerWindow, setTimerWindow] = useState(() => {
    const start = Date.now();
    return {
      startAt: new Date(start).toISOString(),
      expiresAt: new Date(start + 15 * 60 * 1000).toISOString(),
    };
  });

  const quote = useMemo(() => quoteForCredits(qty), [qty]);
  const sliderIdx = useMemo(() => nearestStepIndex(steps, qty), [steps, qty]);
  const share = Math.min(100, (qty / maxQty) * 100);

  const liveSteps = useMemo(() => {
    const labels = [
      {
        key: "awaiting",
        label: isEn ? "Awaiting transfer" : "في انتظار التحويل",
        sub: `${quote.totalEgp} ${isEn ? "EGP" : "ج.م"} · ${formatInt(quote.qty)} ${isEn ? "Credits" : "نقطة"}`,
      },
      {
        key: "detected",
        label: isEn ? "Payment detected" : "رُصدت الدفعة",
        sub: isEn ? "Receipt verified" : "تم التحقق من الإيصال",
      },
      {
        key: "confirming",
        label: isEn ? "Confirming ledger entry" : "تأكيد القيد المزدوج",
        sub: isEn ? "1 / 1 confirmations" : "تأكيد فوري 1 / 1",
      },
      {
        key: "delivered",
        label: isEn ? "Credits delivered" : "تم شحن الرصيد",
      },
    ];
    return labels.map((s, idx) => ({
      ...s,
      state:
        idx < demoStage ? "done" : idx === demoStage ? "current" : "pending",
    }));
  }, [demoStage, isEn, quote.qty, quote.totalEgp]);

  const handleSlider = (e) => {
    const idx = Number(e.target.value);
    const val = steps[idx] ?? 1000;
    setQty(val);
    setRaw(formatInt(val));
  };

  const handleRawInput = (e) => {
    const v = e.target.value;
    setRaw(v);
    const digits = v.replace(/[^\d]/g, "");
    if (digits) {
      const n = Math.max(minQty, Math.min(maxQty, Number(digits)));
      setQty(n);
    }
  };

  const applyQty = (n) => {
    setQty(n);
    setRaw(formatInt(n));
  };

  const resetTimer = () => {
    const start = Date.now();
    setTimerWindow({
      startAt: new Date(start).toISOString(),
      expiresAt: new Date(start + 15 * 60 * 1000).toISOString(),
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <GlassCard className="space-y-7 p-5 sm:p-8">
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-[#9aa4b2]"
            >
              {isEn
                ? "How many credits do you need?"
                : "كم نقطة كريدت تحتاج؟"}
            </label>
            <span className="text-xs font-mono text-[#9aa4b2]" dir="ltr">
              {isEn ? "Between 100 and 10,000" : "بين 100 و 10,000 نقطة"}
            </span>
          </div>

          <div className="relative">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              value={raw}
              onChange={handleRawInput}
              onBlur={() => setRaw(formatInt(qty))}
              className="h-16 w-full rounded-xl border border-white/10 bg-[#0e131b] px-4 pe-24 font-mono text-3xl font-semibold tabular text-[#f5f7fa] focus:border-[#19f08c]/60 focus:outline-none"
            />
            <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center font-mono text-sm text-[#9aa4b2]">
              {isEn ? "Credits" : "نقطة"}
            </span>
          </div>

          {/* Logarithmic Slider */}
          <div className="mt-6 space-y-2">
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              step={1}
              value={sliderIdx}
              onChange={handleSlider}
              aria-label={isEn ? "Credit Quantity" : "كمية الكريدتس"}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#19f08c]"
            />
            <div
              className="flex items-center justify-between font-mono text-xs text-[#9aa4b2] tabular"
              dir="ltr"
            >
              <span>100</span>
              <span>500</span>
              <span>1K</span>
              <span>2.5K</span>
              <span>5K</span>
              <span>10K</span>
            </div>
          </div>

          {/* Quick Chips */}
          <div
            role="group"
            aria-label={isEn ? "Quick quantities" : "كميات سريعة"}
            className="mt-5 flex flex-wrap gap-2"
          >
            {CREDIT_CHIPS.map((n) => {
              const active = qty === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyQty(n)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 font-mono text-sm tabular transition-colors cursor-pointer",
                    active
                      ? "border-[#19f08c]/60 bg-[#19f08c]/15 text-[#19f08c] font-semibold"
                      : "border-white/10 bg-[#0e131b] text-[#9aa4b2] hover:border-[#19f08c]/35 hover:text-[#f5f7fa]"
                  )}
                >
                  {compactQty(n)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="border-t border-white/[0.08] pt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#9aa4b2]">
            {isEn ? "Volume Pricing Tiers" : "شرائح التسعير والخصم الكمي"}
          </p>
          <TierList
            tiers={CREDIT_TIERS}
            activeMinQty={quote.tier.min_qty}
            isEn={isEn}
          />
        </div>

        {/* Pool Availability Bar */}
        <div className="border-t border-white/[0.08] pt-5">
          <AvailabilityBar
            available={poolAvailable}
            max={poolAvailable}
            sharePct={Math.max(12, share)}
            label={isEn ? "Vault Pool Availability" : "سعة خزنة الرصيد المتاحة"}
            availableSuffix={isEn ? "available" : "متاح حالياً"}
          />
        </div>
      </GlassCard>

      {/* Live Quote + CountdownRing + Stepper Terminal */}
      <GlassCard className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="mb-2">
              <ConnBadge mode="sse" isEn={isEn} />
            </div>
            <p className="text-sm font-medium text-[#9aa4b2]">
              {isEn ? "Total" : "الإجمالي"}
            </p>
            <div className="mt-1 flex items-baseline gap-2 font-mono text-4xl sm:text-5xl font-semibold tracking-tight tabular text-[#f5f7fa]">
              <AnimatedNumber value={quote.totalEgp} />
              <span className="text-base font-normal text-[#9aa4b2]">
                {isEn ? "EGP" : "ج.م"}
              </span>
            </div>
          </div>

          <CountdownRing
            startAt={timerWindow.startAt}
            expiresAt={timerWindow.expiresAt}
            onElapsed={resetTimer}
            size={72}
            label={isEn ? "Price lock time remaining" : "الوقت المتبقي لتثبيت السعر"}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <LVBadge variant="emerald">
              {isEn ? quote.tier.nameEn : quote.tier.nameAr}
            </LVBadge>
            {quote.savePct > 0 && (
              <LVBadge variant="emerald">
                {isEn ? `Save ${quote.savePct}%` : `وفّر ${quote.savePct}%`}
              </LVBadge>
            )}
          </div>

          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[#19f08c]">
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {isEn
                ? "Verified server rate · Credits never expire"
                : "سعر مؤكد من الخادم · الرصيد لا ينتهي أبداً"}
            </span>
          </p>

          {quote.savingsEgp > 0 && (
            <p className="mt-1 text-xs font-mono text-[#9aa4b2]">
              {isEn
                ? `You save ${quote.savingsEgp} EGP vs base rate`
                : `توفّر ${quote.savingsEgp} ج.م مقارنة بالسعر الأساسي`}
            </p>
          )}
        </div>

        {quote.nextTier && (
          <button
            type="button"
            onClick={() => applyQty(quote.nextTier.min_qty)}
            className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-[#0e131b] px-3 py-2.5 text-start text-xs text-[#9aa4b2] transition-colors hover:border-[#19f08c]/40 hover:text-[#f5f7fa] cursor-pointer"
          >
            <TrendingDown
              className="size-4 shrink-0 text-[#19f08c]"
              aria-hidden="true"
            />
            <span>
              {isEn
                ? `Add ${(quote.nextTier.min_qty - qty).toLocaleString()} credits to drop to ${quote.nextTier.unit_price.toFixed(2)} EGP/credit`
                : `أضف ${(quote.nextTier.min_qty - qty).toLocaleString()} نقطة ليصبح السعر ${quote.nextTier.unit_price.toFixed(2)} ج.م للنقطة`}
            </span>
          </button>
        )}

        {/* Live Order Status Stepper */}
        <div className="rounded-2xl border border-white/10 bg-[#05070a]/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#9aa4b2]">
              {isEn ? "Live Delivery Flow" : "مراحل التسليم المباشر"}
            </span>
            <button
              type="button"
              onClick={() => setDemoStage((s) => (s + 1) % 4)}
              className="font-mono text-[11px] text-[#19f08c] hover:underline cursor-pointer"
            >
              {isEn ? "Preview stage →" : "معاينة المرحلة ←"}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {demoStage === 3 ? (
              <motion.div
                key="delivered"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="py-2 text-center space-y-2"
              >
                <AnimatedCheck />
                <p className="text-sm font-semibold text-[#f5f7fa]">
                  {isEn ? "Credits Ready in Ledger" : "الرصيد جاهز في حسابك"}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Stepper steps={liveSteps} />
        </div>

        {onSelectCustomPack && (
          <Button
            type="button"
            size="lg"
            className="w-full btn-primary-glow font-bold"
            onClick={() =>
              onSelectCustomPack({
                key: `custom_${quote.qty}`,
                name: isEn
                  ? `Custom ${quote.qty.toLocaleString()} Credits`
                  : `باقة مخصصة (${quote.qty.toLocaleString()} نقطة)`,
                credits: quote.qty,
                price: quote.totalEgp,
              })
            }
          >
            <span>
              {isEn ? "Continue to Payment" : "متابعة للدفع الفوري"}
            </span>
            <ArrowRight className="rtl:rotate-180" />
          </Button>
        )}

        <p className="flex items-start gap-2 text-xs text-[#9aa4b2]">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#19f08c]" />
          <span>
            {isEn
              ? "Unique order locked for 15 minutes. Auto-delivered on confirmation."
              : "يُحجز السعر لمدة 15 دقيقة ويُضاف الرصيد تلقائياً فور التأكيد."}
          </span>
        </p>
      </GlassCard>
    </div>
  );
}
