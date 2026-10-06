import React from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GroupsList({ groups, activeId, onSelect, onCreate }) {
  return (
    <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="p-3 border-b border-border/50">
        <Button onClick={onCreate} className="w-full gap-2 font-bold">
          <Plus className="w-4 h-4" /> جروب جديد
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto scrollbar-none">
        {groups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">لسه مفيش جروبات — اعمل واحد 👆</p>
          </div>
        ) : (
          groups.map((g) => (
            <button key={g.id} onClick={() => onSelect(g)}
              className={`w-full flex items-center gap-3 p-3 transition-colors ${activeId === g.id ? "bg-primary/15" : "hover:bg-secondary/40"}`}>
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl shrink-0">
                {g.emoji || "📚"}
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className="font-bold text-sm truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.member_ids?.length || 0} أعضاء</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}