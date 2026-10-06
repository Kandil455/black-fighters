import React, { useMemo } from "react";
import { buildTerritoryMapState } from "@/lib/summaryV5/learnerModel";
import { LVCard, LVBadge } from "@/components/ui/linevault";
import { cn } from "@/lib/utils";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";

export default function TerritoryMap({
  territories = [],
  reviewItems = [],
  onSelectTerritory,
}) {
  const hasRealTerritories = Array.isArray(territories) && territories.length > 0;

  const mapState = useMemo(() => {
    if (!hasRealTerritories) {
      return { territories: [], overallMasteryPercent: 0 };
    }
    return buildTerritoryMapState(territories, reviewItems);
  }, [hasRealTerritories, territories, reviewItems]);

  if (!hasRealTerritories) {
    return null;
  }

  return (
    <LVCard aria-label="تقدم إتقان الكورسات">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#1E222B]">
        <div>
          <h3 className="text-base font-bold text-[#F2F3F5]">
            خريطة إتقان المواد
          </h3>
          <p className="text-xs text-[#9AA0AE] mt-0.5">
            نسبة الاستيعاب الفعلي بناءً على تقدمك ومراجعاتك
          </p>
        </div>
        <LVBadge variant="accent" mono>
          متوسط الإتقان {mapState.overallMasteryPercent}%
        </LVBadge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mapState.territories.map((territory) => {
          const isMastered = territory.masteryPercent >= 85;
          const isStarted = territory.masteryPercent > 0;

          return (
            <button
              key={territory.id}
              type="button"
              onClick={() => onSelectTerritory && onSelectTerritory(territory)}
              className="text-start p-4 rounded-xl bg-[#131720]/60 hover:bg-[#131720] border border-[#1E222B] hover:border-[#28313E] transition-colors duration-150 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-mono text-[#9AA0AE] block">
                    {territory.code}
                  </span>
                  <h4 className="text-sm font-bold text-[#F2F3F5] truncate mt-0.5">
                    {territory.titleAr}
                  </h4>
                </div>
                {isMastered ? (
                  <CheckCircle2 className="w-4 h-4 text-[#3DDC97] shrink-0" />
                ) : isStarted ? (
                  <Clock className="w-4 h-4 text-[#F5A524] shrink-0" />
                ) : (
                  <BookOpen className="w-4 h-4 text-[#9AA0AE] shrink-0" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#9AA0AE]">الإتقان</span>
                  <span
                    className={cn(
                      "font-bold",
                      isMastered
                        ? "text-[#3DDC97]"
                        : isStarted
                        ? "text-[#F5A524]"
                        : "text-[#9AA0AE]"
                    )}
                  >
                    {territory.masteryPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#07080C] overflow-hidden border border-[#1E222B]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-transform duration-150 origin-right",
                      isMastered
                        ? "bg-[#3DDC97]"
                        : isStarted
                        ? "bg-[#F5A524]"
                        : "bg-[#9AA0AE]/30"
                    )}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </LVCard>
  );
}
