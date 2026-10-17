import React from "react";
import { Users } from "@/components/ui/animatedIcons";

export default function GroupsList({ groups, activeId, onSelect, onCreate }) {
  return (
    <div className="card" style={{ gap: 0 }}>
      <div className="pb-3 border-b border-[var(--line)]">
        <button onClick={onCreate} className="btn sm w-full">
          + جروب جديد
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto scrollbar-none">
        {groups.length === 0 ? (
          <div className="py-12 text-center" style={{ color: "var(--mute)" }}>
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" animated={false} />
            <p className="text-sm">لسه مفيش جروبات — اعمل واحد جديد 👆</p>
          </div>
        ) : (
          groups.map((g) => {
            const isActive = activeId === g.id;
            const letter = g.name?.[0] || "ج";
            return (
              <button
                key={g.id}
                onClick={() => onSelect(g)}
                className="row transition-colors hover:bg-[var(--paper)] px-2 py-3"
                style={{
                  backgroundColor: isActive ? "color-mix(in srgb, var(--sig) 8%, var(--paper2))" : undefined,
                  borderRight: isActive ? "3px solid var(--sig)" : undefined,
                }}
              >
                <span className={`av ${isActive ? "me" : ""}`}>
                  {g.emoji || letter}
                </span>
                <span className="grow text-start">
                  <b className="text-sm block truncate">{g.name}</b>
                  <small className="mono block text-[0.72rem]">
                    {g.member_ids?.length || 0} أعضاء
                  </small>
                </span>
                <span className={`tag ${isActive ? "on" : ""}`}>
                  {isActive ? "نشط" : "فتح"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}