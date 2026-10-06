import React from "react";
import { cn } from "@/lib/utils";

// ─── PDF Icon (Red 3D Glass) ───────────────────────────────────────────────
export function PdfIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pdfBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff3b30" />
            <stop offset="50%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#9f1239" />
          </linearGradient>
          <filter id="pdfGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ff3b30" floodOpacity="0.4" />
          </filter>
        </defs>
        {/* Document Sheet */}
        <rect x="5" y="4" width="30" height="32" rx="8" fill="url(#pdfBg)" filter="url(#pdfGlow)" />
        {/* Top glossy reflection */}
        <path d="M5 12C5 7.58172 8.58172 4 13 4H27C31.4183 4 35 7.58172 35 12V18L5 22V12Z" fill="white" fillOpacity="0.18" />
        {/* Folded corner mark */}
        <path d="M25 4L35 14H27C25.8954 14 25 13.1046 25 12V4Z" fill="white" fillOpacity="0.3" />
        {/* PDF Badge Text */}
        <text x="20" y="27" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
          PDF
        </text>
        {/* Underline bar */}
        <rect x="12" y="30" width="16" height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
      </svg>
    </div>
  );
}

// ─── PowerPoint / PPTX Icon (Orange Keynote 3D Glass) ──────────────────────
export function PptxIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pptBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
          <filter id="pptGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f97316" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x="5" y="4" width="30" height="32" rx="8" fill="url(#pptBg)" filter="url(#pptGlow)" />
        <path d="M5 12C5 7.58172 8.58172 4 13 4H27C31.4183 4 35 7.58172 35 12V18L5 22V12Z" fill="white" fillOpacity="0.18" />
        <path d="M25 4L35 14H27C25.8954 14 25 13.1046 25 12V4Z" fill="white" fillOpacity="0.3" />
        {/* Presentation Pie / Chart Icon */}
        <circle cx="20" cy="18" r="5" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" fill="none" />
        <path d="M20 13V18H25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <text x="20" y="31" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
          PPT
        </text>
      </svg>
    </div>
  );
}

// ─── Word / DOCX Icon (Royal Blue 3D Glass) ────────────────────────────────
export function DocxIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="docBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <filter id="docGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x="5" y="4" width="30" height="32" rx="8" fill="url(#docBg)" filter="url(#docGlow)" />
        <path d="M5 12C5 7.58172 8.58172 4 13 4H27C31.4183 4 35 7.58172 35 12V18L5 22V12Z" fill="white" fillOpacity="0.18" />
        <path d="M25 4L35 14H27C25.8954 14 25 13.1046 25 12V4Z" fill="white" fillOpacity="0.3" />
        {/* Document Lines */}
        <line x1="12" y1="16" x2="22" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
        <text x="20" y="31" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
          DOC
        </text>
      </svg>
    </div>
  );
}

// ─── Excel / Sheets Icon (Emerald 3D Glass) ────────────────────────────────
export function ExcelIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="xlsBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <filter id="xlsGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x="5" y="4" width="30" height="32" rx="8" fill="url(#xlsBg)" filter="url(#xlsGlow)" />
        <path d="M5 12C5 7.58172 8.58172 4 13 4H27C31.4183 4 35 7.58172 35 12V18L5 22V12Z" fill="white" fillOpacity="0.18" />
        <path d="M25 4L35 14H27C25.8954 14 25 13.1046 25 12V4Z" fill="white" fillOpacity="0.3" />
        {/* Table Grid */}
        <rect x="13" y="14" width="14" height="9" rx="2" stroke="white" strokeWidth="1.2" strokeOpacity="0.8" fill="none" />
        <line x1="20" y1="14" x2="20" y2="23" stroke="white" strokeWidth="1" strokeOpacity="0.8" />
        <line x1="13" y1="18.5" x2="27" y2="18.5" stroke="white" strokeWidth="1" strokeOpacity="0.8" />
        <text x="20" y="31" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.05em">
          XLS
        </text>
      </svg>
    </div>
  );
}

// ─── Text / Notes Icon (Cyan Glass) ────────────────────────────────────────
export function TextFileIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="txtBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="30" height="32" rx="8" fill="url(#txtBg)" />
        <path d="M25 4L35 14H27C25.8954 14 25 13.1046 25 12V4Z" fill="white" fillOpacity="0.3" />
        <line x1="12" y1="16" x2="22" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="24" x2="25" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <text x="20" y="32" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif">
          TXT
        </text>
      </svg>
    </div>
  );
}

// ─── Image / Photo File Icon (Purple/Pink Glass) ───────────────────────────
export function ImageFileIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="imgBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
        </defs>
        <rect x="5" y="4" width="30" height="32" rx="8" fill="url(#imgBg)" />
        <circle cx="15" cy="14" r="3" fill="#facc15" />
        <path d="M10 26L18 18L28 26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="20" y="32" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="system-ui, sans-serif">
          IMG
        </text>
      </svg>
    </div>
  );
}

// ─── YouTube / Video Icon (Red Studio) ─────────────────────────────────────
export function YouTubeIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ytBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <rect x="5" y="8" width="30" height="24" rx="8" fill="url(#ytBg)" />
        <path d="M17 15L25 20L17 25V15Z" fill="white" />
      </svg>
    </div>
  );
}

// ─── Quiz Battle Icon (Lightning Brain) ────────────────────────────────────
export function QuizBattleIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="quizBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="32" height="32" rx="10" fill="url(#quizBg)" />
        {/* Lightning & Brain symbol */}
        <path d="M21 10L14 21H20L19 30L26 19H20L21 10Z" fill="#facc15" stroke="white" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ─── Flashcard Deck Icon ───────────────────────────────────────────────────
export function FlashcardDeckIcon({ size = 28, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center group select-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="flashBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="100%" stopColor="#00a86b" />
          </linearGradient>
        </defs>
        {/* Back card */}
        <rect x="10" y="6" width="22" height="24" rx="5" fill="white" fillOpacity="0.2" transform="rotate(8 21 18)" />
        {/* Front card */}
        <rect x="8" y="8" width="22" height="24" rx="5" fill="url(#flashBg)" />
        <line x1="13" y1="16" x2="23" y2="16" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
        <line x1="13" y1="20" x2="20" y2="20" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
        <circle cx="24" cy="24" r="2" fill="#09090b" />
      </svg>
    </div>
  );
}

// ─── Automatic Smart File Icon Resolver ────────────────────────────────────
export function SmartFileIcon({ filename = "", ext = "", size = 28, className = "" }) {
  const cleanExt = (ext || filename.split(".").pop() || "").toLowerCase();

  switch (cleanExt) {
    case "pdf":
      return <PdfIcon size={size} className={className} />;
    case "pptx":
    case "ppt":
    case "pps":
    case "ppsx":
      return <PptxIcon size={size} className={className} />;
    case "docx":
    case "doc":
    case "rtf":
      return <DocxIcon size={size} className={className} />;
    case "xlsx":
    case "xls":
    case "csv":
      return <ExcelIcon size={size} className={className} />;
    case "txt":
    case "md":
    case "html":
    case "htm":
      return <TextFileIcon size={size} className={className} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
    case "bmp":
      return <ImageFileIcon size={size} className={className} />;
    case "youtube":
    case "yt":
    case "video":
      return <YouTubeIcon size={size} className={className} />;
    case "quiz":
      return <QuizBattleIcon size={size} className={className} />;
    case "flashcard":
    case "flashcards":
      return <FlashcardDeckIcon size={size} className={className} />;
    default:
      return <PdfIcon size={size} className={className} />;
  }
}

export default SmartFileIcon;
