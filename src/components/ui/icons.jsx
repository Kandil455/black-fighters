import React, { memo } from "react";
import {
  Activity,
  BookOpenCheck,
  Bot,
  Brain,
  CloudUpload,
  Code2,
  Coins,
  CircleCheck,
  Crown,
  FileText,
  Flame,
  HardDriveDownload,
  ListChecks,
  LoaderCircle,
  Lock,
  Microscope,
  NotebookText,
  Radar,
  Rocket,
  Save,
  Search,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
  Youtube,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * icons.jsx — THE single icon source for the platform.
 *
 * Replaces three overlapping, non-standard icon systems:
 *   • LottieIcons.jsx (18 lottie JSON animations, 2.4 MB × 2 copies on disk)
 *   • AnimatedMicroIcons.jsx (17 hand-rolled gradient SVGs with filter glow)
 *   • Custom3DIcons.jsx (PNG "3D" icons)
 *
 * Rules this module keeps (enforced by tests/unit/iconPolicy.test.mjs):
 *   1. lucide-react is the only icon library. Named imports keep it tree-shakeable.
 *   2. `animated` defaults to FALSE. Lists, navs and grids render dozens of icons;
 *      an infinite keyframe per instance never lets the page go idle, which is how
 *      the old sidebar starved the compositor on weak devices.
 *   3. Animation is CSS transform-only, so it rides the compositor and is disabled
 *      by both `prefers-reduced-motion` and `html[data-performance="saver"]`.
 *   4. No `filter`/`box-shadow` animation and no drop-shadow glow: both repaint on
 *      the main thread every frame.
 */

const ICON_MAP = {
  // Actions & status
  lightning: Zap,
  zap: Zap,
  success: CircleCheck,
  check: CircleCheck,
  loader: LoaderCircle,
  loading: LoaderCircle,
  lock: Lock,
  search: Search,
  // Learning
  document: FileText,
  doc: FileText,
  summaryNote: NotebookText,
  notebook: NotebookText,
  book: BookOpenCheck,
  theoryQuiz: ListChecks,
  quizzes: ListChecks,
  practicalQuiz: Microscope,
  practical: Microscope,
  youtube: Youtube,
  code: Code2,
  // Progress & rewards
  trophy: Trophy,
  crown: Crown,
  stars: Sparkles,
  flame: Flame,
  rocket: Rocket,
  radar: Radar,
  activity: Activity,
  // People & automation
  users: Users,
  friends: UsersRound,
  studyGroup: Users,
  bot: Bot,
  brain: Brain,
  // Storage & money
  upload: CloudUpload,
  googleDrive: HardDriveDownload,
  drive: HardDriveDownload,
  payment: Coins,
  creditCoin: Coins,
  fileSave: Save,
};

const TONE_CLASS = {
  default: "",
  accent: "text-primary",
  muted: "text-muted-foreground",
  success: "text-emerald-400",
  warn: "text-amber-400",
  danger: "text-destructive",
  info: "text-sky-400",
  gold: "text-amber-300",
};

export const ICON_NAMES = Object.keys(ICON_MAP);

/**
 * Generic icon. Prefer the named wrappers below for readability.
 *
 * @param {object} props
 * @param {keyof typeof ICON_MAP} props.name
 * @param {number} [props.size=18]
 * @param {boolean} [props.animated=false] transform-only pulse (spinners excluded)
 * @param {keyof typeof TONE_CLASS} [props.tone="default"]
 * @param {number} [props.strokeWidth=1.75]
 */
export const Icon = memo(function Icon({
  name,
  size = 18,
  animated = false,
  tone = "default",
  className = "",
  strokeWidth = 1.75,
  ...rest
}) {
  const Glyph = ICON_MAP[name];
  if (!Glyph) {
    if (import.meta.env?.DEV) console.warn(`[Icon] unknown name "${name}"`);
    return null;
  }
  const isSpinner = name === "loader" || name === "loading";

  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      className={cn(
        "shrink-0",
        isSpinner && "animate-spin motion-reduce:animate-none",
        animated && !isSpinner && "bf-icon-pulse motion-reduce:animate-none",
        TONE_CLASS[tone] || "",
        className,
      )}
      {...rest}
    />
  );
});

/** Wraps a lucide glyph with the shared size/tone contract. */
function semantic(name) {
  const Component = memo(function SemanticIcon(props) {
    return <Icon name={name} {...props} />;
  });
  Component.displayName = `Icon(${name})`;
  return Component;
}

// ── Named exports (the vocabulary call sites use) ───────────────────────────
export const LightningIcon = semantic("lightning");
export const SuccessIcon = semantic("success");
export const LoaderIcon = semantic("loader");
export const LockIcon = semantic("lock");
export const SearchIcon = semantic("search");

export const DocumentIcon = semantic("document");
export const SummaryNoteIcon = semantic("summaryNote");
export const BookIcon = semantic("book");
export const TheoryQuizIcon = semantic("theoryQuiz");
export const PracticalQuizIcon = semantic("practicalQuiz");
export const YoutubeIcon = semantic("youtube");
export const CodeIcon = semantic("code");

export const TrophyIcon = semantic("trophy");
export const CrownIcon = semantic("crown");
export const StarsIcon = semantic("stars");
export const FlameIcon = semantic("flame");
export const RocketIcon = semantic("rocket");
export const RadarIcon = semantic("radar");

export const UsersIcon = semantic("users");
export const FriendsIcon = semantic("friends");
export const StudyGroupIcon = semantic("studyGroup");
export const BotIcon = semantic("bot");
export const BrainIcon = semantic("brain");

export const UploadIcon = semantic("upload");
export const GoogleDriveIcon = semantic("googleDrive");
export const PaymentIcon = semantic("payment");
export const FileSaveIcon = semantic("fileSave");

export default Icon;
