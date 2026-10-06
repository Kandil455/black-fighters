import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Consistent page header with an RTL back button (navigate(-1)).
 * Use inside child routes. `title` optional; `right` for extra actions.
 */
export default function PageHeader({ title, right, className = "" }) {
  const navigate = useNavigate();
  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      <button
        onClick={() => navigate(-1)}
        aria-label="رجوع"
        className="tap-target flex items-center justify-center rounded-xl border border-border hover:border-primary/40 hover:text-primary transition-colors"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
      {title && <h2 className="font-black text-lg truncate flex-1">{title}</h2>}
      {right}
    </div>
  );
}