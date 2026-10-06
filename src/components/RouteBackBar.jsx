import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Top-level tab roots — no back button needed on these
const ROOT_PATHS = ["/dashboard", "/quizzes", "/friends", "/leaderboard", "/create"];

export default function RouteBackBar() {
  const location = useLocation();
  const navigate = useNavigate();

  if (ROOT_PATHS.includes(location.pathname)) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => navigate(-1)}
        aria-label="رجوع"
        className="tap-target inline-flex items-center gap-1.5 rounded-xl border border-border hover:border-primary/40 hover:text-primary transition-colors px-3 text-sm font-bold"
      >
        <ArrowRight className="w-4 h-4" /> رجوع
      </button>
    </div>
  );
}