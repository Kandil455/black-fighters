import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.08 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
});

export const rise = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { delay: i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
});

const defaultFormat = (v) =>
  new Intl.NumberFormat("en-US").format(Math.round(v));

export function formatInt(v) {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(v) || 0));
}

export function compactQty(n) {
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return String(n);
}

/**
 * Exact port of joyful-heisenberg Logo (components/layout/logo.tsx)
 */
export function LVLogo({ to = "/", label = "BLACK FIGHTERS", className }) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-2.5 font-semibold tracking-tight text-[#eef2f6]",
        className
      )}
    >
      <img
        src="/icons/black-fighters-192.png"
        alt={label}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="size-8 rounded-full border border-[#19f08c]/40 object-cover shadow-sm"
      />
      <span className="text-lg font-bold tracking-wide text-[#eef2f6]">{label}</span>
    </Link>
  );
}

/**
 * Exact port of LineVault's LangSwitch (components/layout/lang-switch.tsx)
 */
export function LVLangSwitch({ locale, onChange, className }) {
  return (
    <div
      role="group"
      aria-label={
        locale === "en" ? "Switch language to Arabic" : "تغيير اللغة إلى الإنجليزية"
      }
      className={cn("glass inline-flex rounded-xl p-0.5 text-sm", className)}
    >
      {["en", "ar"].map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => l !== locale && onChange?.(l)}
          className={cn(
            "h-8 min-w-9 rounded-[10px] px-2.5 font-medium transition-colors",
            locale === l
              ? "bg-white/10 text-[#eef2f6]"
              : "text-[#9aa6b4] hover:text-[#eef2f6]"
          )}
        >
          {l === "en" ? "EN" : "ع"}
        </button>
      ))}
    </div>
  );
}

/**
 * Exact 1:1 port of joyful-heisenberg AnimatedNumber (components/animated-number.tsx)
 * Tweens smoothly from 0 on mount and whenever value changes via ref textContent mutation.
 */
export function AnimatedNumber({
  value,
  className,
  format = defaultFormat,
}) {
  const ref = useRef(null);
  const mv = useMotionValue(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const target = Number(value) || 0;
    const paint = (v) => {
      if (ref.current) ref.current.textContent = format(v);
    };
    if (reduce) {
      mv.set(target);
      paint(target);
      return;
    }
    const ctrl = animate(mv, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: paint,
    });
    return () => ctrl.stop();
  }, [value, format, mv, reduce]);

  return (
    <span ref={ref} dir="ltr" className={cn("tabular", className)}>
      {format(Number(value) || 0)}
    </span>
  );
}

const DEFAULT_INVENTORY_POOLS = [
  {
    id: "pro",
    nameEn: "Pro Fighter Credits Pool",
    nameAr: "باقة الكريدتس الاحترافية (Pro)",
    metaEn: "900 Credits · $0.15 / credit",
    metaAr: "900 كريدت · 149 ج.م",
    href: "/subscriptions?plan=pro",
  },
  {
    id: "supreme",
    nameEn: "Supreme Textbook & Atlas Pool",
    nameAr: "مخزون المراجع الكبرى والأطلس (Supreme)",
    metaEn: "2,500 Credits · $0.10 / credit",
    metaAr: "2,500 كريدت · 249 ج.م",
    href: "/subscriptions?plan=supreme",
  },
  {
    id: "custom",
    nameEn: "Custom Volume Credits (100–10K)",
    nameAr: "رصيد مخصص بالكمية (100–10,000)",
    metaEn: "10,000 Credits · Save up to 56%",
    metaAr: "10,000 كريدت · خصم حتى 56%",
    href: "/subscriptions",
  },
];

/**
 * Exact 1:1 port of joyful-heisenberg LineStream (components/line-stream.tsx)
 * Clean static inventory card with green status dot, AES-256-GCM shield, and Buy -> rows.
 */
export function LineStream({
  label = "Live Credits & Study Inventory",
  locale = "en",
  pools = DEFAULT_INVENTORY_POOLS,
}) {
  const isAr = locale === "ar";
  return (
    <div className="glass relative overflow-hidden rounded-[1.25rem]">
      <div className="flex items-center justify-between border-b border-[rgb(255_255_255/0.09)] px-4 py-3 font-mono text-xs text-[#6b7785]">
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#19f08c]" />
          <span className="font-semibold text-[#eef2f6]">{label}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[#19f08c]">
          <ShieldCheck className="size-3.5" /> AES-256-GCM
        </span>
      </div>

      <div className="p-4">
        <ul className="space-y-2.5">
          {pools.map((pool) => (
            <li key={pool.id}>
              <Link
                to={pool.href || "/subscriptions"}
                className="group flex items-center justify-between gap-3 rounded-xl border border-[rgb(255_255_255/0.09)] bg-white/[0.02] px-4 py-3 transition-colors hover:border-[#19f08c]/40 hover:bg-white/[0.05]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#eef2f6] group-hover:text-[#19f08c]">
                    {isAr ? pool.nameAr : pool.nameEn}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[#9aa6b4]">
                    {isAr ? pool.metaAr : pool.metaEn}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#19f08c]/10 px-2.5 py-1 text-xs font-semibold text-[#19f08c]">
                  {isAr ? "شراء" : "Buy"}{" "}
                  <ArrowRight className="size-3.5 rtl:rotate-180" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Exact port of LineVault's Section (section.tsx)
 */
export function Section({ id, title, subtitle, children, className }) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto max-w-6xl scroll-mt-28 px-4 pt-24 sm:px-6",
        className
      )}
    >
      <div className="mb-10 max-w-2xl">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-[#eef2f6] sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-lg text-[#9aa6b4]">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Unified PageHeader — Title + Description + Optional Badge + Actions
 */
export function PageHeader({
  title,
  description,
  badge,
  action,
  secondaryAction,
  actions,
  children,
  className,
}) {
  const rightSlot = action || actions || children;
  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 mb-6 border-b border-[rgb(255_255_255/0.09)]",
        className
      )}
    >
      <div className="space-y-1.5 min-w-0">
        {badge ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#19f08c]/25 bg-[#19f08c]/10 px-3 py-1 text-xs font-medium text-[#19f08c]">
            <span className="size-1.5 rounded-full bg-[#19f08c]" aria-hidden="true" />
            <span>{badge}</span>
          </div>
        ) : null}
        <h1 className="text-gradient text-2xl sm:text-3xl font-semibold tracking-tight truncate">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[#9aa6b4] max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {(rightSlot || secondaryAction) ? (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {secondaryAction}
          {rightSlot}
        </div>
      ) : null}
    </header>
  );
}

/**
 * LineVault GlassCard / LVCard (.glass + 1.25rem radius)
 */
export function LVCard({
  children,
  className,
  interactive = false,
  accent = false,
  padding = "p-5 sm:p-6",
  ...props
}) {
  return (
    <div
      className={cn(
        "glass rounded-[1.25rem] transition-colors duration-200",
        accent && "border-[#19f08c]/50",
        interactive &&
          "hover:border-[rgb(255_255_255/0.16)] hover:bg-white/[0.04] cursor-pointer",
        padding,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const GlassCard = LVCard;

/**
 * LineVault Badge (badge.tsx)
 */
export function LVBadge({
  children,
  variant = "default",
  mono = false,
  className,
  ...props
}) {
  const variants = {
    default: "border-[rgb(255_255_255/0.09)] text-[#9aa6b4] bg-white/[0.04]",
    neutral: "border-[rgb(255_255_255/0.09)] text-[#9aa6b4] bg-white/[0.04]",
    accent: "border-[#19f08c]/30 text-[#19f08c] bg-[#19f08c]/10",
    success: "border-[#19f08c]/30 text-[#19f08c] bg-[#19f08c]/10",
    warning: "border-[#ffb547]/30 text-[#ffb547] bg-[#ffb547]/10",
    warn: "border-[#ffb547]/30 text-[#ffb547] bg-[#ffb547]/10",
    danger: "border-[#ff5c6c]/30 text-[#ff5c6c] bg-[#ff5c6c]/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular",
        mono && "font-mono",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * LineVault StatCard with AnimatedNumber tweening
 */
export function StatCard({
  label,
  value,
  sublabel,
  subtext,
  icon: Icon,
  trend,
  className,
}) {
  const numericValue =
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const caption = sublabel || subtext;

  return (
    <LVCard padding="p-5" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#9aa6b4]">{label}</span>
        {Icon ? (
          <div className="grid size-9 place-items-center rounded-xl border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c]">
            <Icon className="w-4 h-4" />
          </div>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-semibold font-mono tabular text-[#eef2f6] tracking-tight">
          {numericValue !== null ? <AnimatedNumber value={numericValue} /> : value}
        </span>
        {trend ? (
          <span className="text-xs font-mono font-semibold text-[#19f08c]">
            {trend}
          </span>
        ) : null}
      </div>
      {caption ? (
        <span className="text-xs text-[#6b7785]">{caption}</span>
      ) : null}
    </LVCard>
  );
}

/**
 * LineVault EmptyState (states.tsx)
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}) {
  return (
    <LVCard
      padding="px-6 py-12"
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3",
        className
      )}
    >
      {Icon ? (
        <div className="grid size-12 place-items-center rounded-2xl border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c]">
          <Icon className="w-6 h-6" />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-[#eef2f6]">{title}</h3>
      {description ? (
        <p className="text-sm text-[#9aa6b4] max-w-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-2">{action}</div>
      ) : actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </LVCard>
  );
}

/**
 * LineVault PricingCard
 */
export function PricingCard({
  name,
  subtitle,
  price,
  period,
  badge,
  recommended = false,
  selected = false,
  features = [],
  ctaLabel,
  onSelect,
  disabled = false,
  className,
}) {
  return (
    <LVCard
      accent={recommended || selected}
      padding="p-6"
      className={cn("flex flex-col justify-between h-full", className)}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold text-[#eef2f6]">{name}</h3>
          {badge ? (
            <LVBadge variant={recommended ? "accent" : "default"}>
              {badge}
            </LVBadge>
          ) : null}
        </div>
        {subtitle ? (
          <p className="text-xs text-[#9aa6b4] mb-4">{subtitle}</p>
        ) : null}

        <div className="flex items-baseline gap-1.5 mb-6 pb-5 border-b border-[rgb(255_255_255/0.09)]">
          <span className="text-3xl font-semibold font-mono tabular text-[#eef2f6]">
            {price}
          </span>
          {period ? (
            <span className="text-xs text-[#9aa6b4]">{period}</span>
          ) : null}
        </div>

        <ul className="divide-y divide-[rgb(255_255_255/0.09)] text-sm mb-6">
          {features.slice(0, 6).map((feat, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between gap-2.5 py-2.5 text-[#eef2f6]/90"
            >
              <span>{feat}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#19f08c] shrink-0" />
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant={recommended || selected ? "default" : "outline"}
        className="w-full"
        disabled={disabled}
        onClick={onSelect}
      >
        {ctaLabel}
      </Button>
    </LVCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PORTED LINEVAULT CHECKOUT & CONFIGURATOR PRIMITIVES
   (checkout/parts.tsx + pool-ui.tsx + configurator.tsx + lib/qty.ts)
   ═══════════════════════════════════════════════════════════════════════════ */

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fallback for non-HTTPS or older webviews */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  label = "Copy",
  text = "نسخ",
  copiedText = "تم النسخ",
  toastText,
  compact = false,
}) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    const target = typeof value === "function" ? value() : value;
    if (!(await copyText(target))) {
      toast.error("تعذّر النسخ. حدّد النص وانسخه يدوياً.");
      return;
    }
    toast.success(toastText || copiedText);
    setDone(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  }

  const Icon = done ? Check : Copy;
  return (
    <Button
      type="button"
      variant="secondary"
      size={compact ? "icon" : "sm"}
      className={cn(compact && "size-8 rounded-lg", done && "text-[#19f08c]")}
      onClick={() => void onClick()}
      aria-label={label}
    >
      <Icon className="size-4" aria-hidden="true" />
      {!compact && <span>{done ? copiedText : text}</span>}
    </Button>
  );
}

/**
 * Exact port of LineVault's CopyField (checkout/parts.tsx)
 * Labelled monospace value (always LTR, selectable) with a copy button.
 */
export function CopyField({
  label,
  value,
  unit,
  big = false,
  copyLabel = "نسخ",
  copiedLabel = "تم النسخ",
}) {
  return (
    <div className="rounded-2xl border border-[rgb(255_255_255/0.09)] bg-white/[0.03] p-4">
      <div className="mb-2 text-xs font-medium text-[#9aa6b4]">{label}</div>
      <div className="flex items-start justify-between gap-3">
        <div
          dir="ltr"
          className={cn(
            "min-w-0 break-all text-start font-mono text-[#eef2f6]",
            big
              ? "text-2xl font-semibold tabular sm:text-3xl"
              : "text-sm leading-relaxed"
          )}
        >
          <span className="select-all">{value}</span>
          {unit && (
            <span className="ms-2 text-base font-medium text-[#9aa6b4]">
              {unit}
            </span>
          )}
        </div>
        <CopyButton
          value={value}
          label={copyLabel}
          text={copyLabel}
          copiedText={copiedLabel}
        />
      </div>
    </div>
  );
}

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Exact port of LineVault's CountdownRing (checkout/parts.tsx)
 * Depleting SVG ring + mm:ss countdown.
 */
export function CountdownRing({
  expiresAt,
  startAt,
  onElapsed,
  size = 76,
  label = "الوقت المتبقي للدفع",
}) {
  const end = useMemo(() => Date.parse(expiresAt), [expiresAt]);
  const total = useMemo(
    () => Math.max(1, end - Date.parse(startAt)),
    [end, startAt]
  );
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
    left < 60_000 ? "#ff5c6c" : left < 300_000 ? "#ffb547" : "#19f08c";
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);

  return (
    <div
      role="timer"
      aria-label={label}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
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
          stroke="rgb(255 255 255 / 0.1)"
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
        className="absolute font-mono text-[15px] font-semibold tabular text-[#eef2f6]"
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
      <span className={cn(base, "bg-[#ff5c6c]/15 text-[#ff5c6c] ring-[#ff5c6c]/50")}>
        <X className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className={cn(base, "bg-[#19f08c]/10 ring-[#19f08c]/60")}>
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
    <span className={cn(base, "ring-[rgb(255_255_255/0.16)]")}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-white/20" />
    </span>
  );
}

/**
 * Exact port of LineVault's Stepper (checkout/parts.tsx)
 * Vertical live status stepper with ping dot on current step.
 */
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
                    : "bg-[rgb(255_255_255/0.16)]"
                )}
              />
            )}
            <StepDot state={s.state} />
            <div className="min-w-0 pt-0.5">
              <div
                className={cn(
                  "text-sm font-medium",
                  s.state === "pending" ? "text-[#6b7785]" : "text-[#eef2f6]"
                )}
              >
                {s.label}
              </div>
              {s.sub && (
                <div className="mt-0.5 text-xs text-[#9aa6b4] tabular">
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

/**
 * Exact port of joyful-heisenberg ConnBadge (checkout/parts.tsx)
 */
export function ConnBadge({ mode = "sse", isEn = false }) {
  const map = {
    sse: {
      dot: "bg-[#19f08c]",
      ping: true,
      text: isEn ? "Live" : "مباشر",
    },
    poll: {
      dot: "bg-[#ffb547]",
      ping: false,
      text: isEn ? "Syncing" : "مزامنة",
    },
    offline: {
      dot: "bg-[#ff5c6c]",
      ping: false,
      text: isEn ? "Reconnecting…" : "إعادة اتصال…",
    },
  }[mode] || {
    dot: "bg-[#19f08c]",
    ping: true,
    text: isEn ? "Live" : "مباشر",
  };

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-[rgb(255_255_255/0.09)] bg-white/[0.03] px-3 py-1 text-xs font-medium text-[#9aa6b4]"
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

/**
 * Exact port of joyful-heisenberg AnimatedCheck (checkout-view.tsx)
 */
export function AnimatedCheck() {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#19f08c]/40 bg-[#19f08c]/10 text-[#19f08c]">
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

/**
 * Exact port of joyful-heisenberg AvailabilityBar (pool-ui.tsx)
 */
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
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium uppercase tracking-wider text-[#6b7785]">
          {label}
        </span>
        <span className="font-mono text-[#9aa6b4] tabular" dir="ltr">
          {formatInt(available)} {availableSuffix}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={denom}
        aria-valuenow={available}
        className="h-2 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-500",
            low ? "bg-[#ffb547]" : "bg-[#19f08c]"
          )}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Exact port of LineVault's TierList (pool-ui.tsx)
 */
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
    <ul className="divide-y divide-[rgb(255_255_255/0.09)] text-sm">
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
              isActive && "-mx-3 rounded-lg bg-[#19f08c]/[0.08] px-3"
            )}
          >
            <span className="text-[#9aa6b4] tabular" dir="ltr">
              {compactQty(tier.min_qty)}+ {isEn ? "Credits" : unitLabel}
            </span>
            <span className="flex items-center gap-2">
              {i > 0 && pct > 0 && (
                <span className="rounded-full bg-[#19f08c]/10 border border-[#19f08c]/25 px-2 py-0.5 text-xs text-[#19f08c]">
                  {isEn ? `Save ${pct}%` : `وفّر ${pct}%`}
                </span>
              )}
              <span className="font-mono tabular text-[#eef2f6]" dir="ltr">
                {tier.unit_price.toFixed(2)} {isEn ? "EGP" : currencyLabel}
                <span className="text-[#6b7785]">
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

export const CREDIT_CHIPS = [100, 350, 900, 2500, 5000, 10000];
const CREDIT_TIERS = [
  { min_qty: 100, unit_price: 0.45, nameAr: "الشريحة 1 · أساسي", nameEn: "Tier 1 · Starter" },
  { min_qty: 350, unit_price: 0.28, nameAr: "الشريحة 2 · دراسي", nameEn: "Tier 2 · Semester" },
  { min_qty: 900, unit_price: 0.17, nameAr: "الشريحة 3 · برو", nameEn: "Tier 3 · Pro" },
  { min_qty: 2500, unit_price: 0.10, nameAr: "الشريحة 4 · المراجع الكبرى", nameEn: "Tier 4 · Max" },
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

export function quoteForCredits(qty) {
  const safeQty = Math.max(100, Math.min(10000, Math.round(Number(qty) || 100)));
  const sorted = [...CREDIT_TIERS].sort((a, b) => a.min_qty - b.min_qty);
  const baseUnit = sorted[0].unit_price;
  let activeTier = sorted[0];
  for (const t of sorted) {
    if (safeQty >= t.min_qty) activeTier = t;
  }
  const rank = sorted.indexOf(activeTier) + 1;
  const totalEgp = Math.round(safeQty * activeTier.unit_price);
  const baseTotalEgp = Math.round(safeQty * baseUnit);
  const savingsEgp = Math.max(0, baseTotalEgp - totalEgp);
  const savePct = Math.round((1 - activeTier.unit_price / baseUnit) * 100);
  const nextTier = sorted.find((t) => t.min_qty > safeQty) || null;
  return {
    qty: safeQty,
    tier: activeTier,
    rank,
    unitPrice: activeTier.unit_price,
    totalEgp,
    savingsEgp,
    savePct,
    nextTier,
  };
}

/**
 * Exact port of joyful-heisenberg PoolConfigurator + CheckoutView (configurator.tsx + checkout-view.tsx)
 * Features logarithmic slider, quick chips, AnimatedNumber tween, AvailabilityBar,
 * live depleting CountdownRing timer, ConnBadge, and interactive Stepper + AnimatedCheck.
 */
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

  const [qty, setQty] = useState(selectedQty || 900);
  const [raw, setRaw] = useState(() => formatInt(selectedQty || 900));
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
    const val = steps[idx] ?? 900;
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
              className="text-sm font-medium text-[#9aa6b4]"
            >
              {isEn
                ? "How many credits do you need?"
                : "كم نقطة كريدت تحتاج؟"}
            </label>
            <span className="text-xs font-mono text-[#6b7785]" dir="ltr">
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
              className="h-16 w-full rounded-xl border border-[rgb(255_255_255/0.09)] bg-white/[0.035] px-4 pe-24 font-mono text-3xl font-semibold tabular text-[#eef2f6] focus:border-[#19f08c]/60 focus:outline-none"
            />
            <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center font-mono text-sm text-[#6b7785]">
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
              className="flex items-center justify-between font-mono text-xs text-[#6b7785] tabular"
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
                    "h-9 rounded-full border px-3.5 font-mono text-sm tabular transition-colors",
                    active
                      ? "border-[#19f08c]/60 bg-[#19f08c]/10 text-[#19f08c]"
                      : "border-[rgb(255_255_255/0.09)] bg-white/[0.03] text-[#9aa6b4] hover:border-[rgb(255_255_255/0.16)] hover:text-[#eef2f6]"
                  )}
                >
                  {compactQty(n)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="border-t border-[rgb(255_255_255/0.09)] pt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6b7785]">
            {isEn ? "Volume Pricing Tiers" : "شرائح التسعير حسب الكمية"}
          </p>
          <TierList
            tiers={CREDIT_TIERS}
            activeMinQty={quote.tier.min_qty}
            isEn={isEn}
          />
        </div>

        {/* Pool Availability Bar (1:1 joyful-heisenberg AvailabilityBar) */}
        <div className="border-t border-[rgb(255_255_255/0.09)] pt-5">
          <AvailabilityBar
            available={poolAvailable}
            max={poolAvailable}
            sharePct={Math.max(12, share)}
            label={isEn ? "Pool Availability" : "توفر المخزون"}
            availableSuffix={isEn ? "available" : "متاح حالياً"}
          />
        </div>
      </GlassCard>

      {/* Live Quote + CountdownRing + Stepper Terminal (1:1 joyful-heisenberg configurator.tsx + checkout-view.tsx) */}
      <GlassCard className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-[rgb(255_255_255/0.09)] pb-4">
          <div>
            <div className="mb-2">
              <ConnBadge mode="sse" isEn={isEn} />
            </div>
            <p className="text-sm font-medium text-[#9aa6b4]">
              {isEn ? "Total" : "الإجمالي"}
            </p>
            <div className="mt-1 flex items-baseline gap-2 font-mono text-4xl sm:text-5xl font-semibold tracking-tight tabular text-[#eef2f6]">
              <AnimatedNumber value={quote.totalEgp} />
              <span className="text-base font-normal text-[#9aa6b4]">
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
            <LVBadge variant="accent">
              {isEn ? quote.tier.nameEn : quote.tier.nameAr}
            </LVBadge>
            {quote.savePct > 0 && (
              <LVBadge variant="accent">
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
            <p className="mt-1 text-xs font-mono text-[#9aa6b4]">
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
            className="flex w-full items-center gap-2 rounded-xl border border-[rgb(255_255_255/0.09)] bg-white/[0.03] px-3 py-2.5 text-start text-xs text-[#9aa6b4] transition-colors hover:border-[#19f08c]/40 hover:text-[#eef2f6]"
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

        {/* Live Order Status Stepper (1:1 joyful-heisenberg checkout-view.tsx) */}
        <div className="rounded-2xl border border-[rgb(255_255_255/0.09)] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#6b7785]">
              {isEn ? "Live Delivery Flow" : "مراحل التسليم المباشر"}
            </span>
            <button
              type="button"
              onClick={() => setDemoStage((s) => (s + 1) % 4)}
              className="font-mono text-[11px] text-[#19f08c] hover:underline"
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
                <p className="text-sm font-semibold text-[#eef2f6]">
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
            className="w-full"
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
              {isEn ? "Continue to Payment" : "متابعة للدفع"}
            </span>
            <ArrowRight className="rtl:rotate-180" />
          </Button>
        )}

        <p className="flex items-start gap-2 text-xs text-[#6b7785]">
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
