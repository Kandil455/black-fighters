import React from "react";

export default function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="mono text-[0.72rem]">{label}</span>
        {Icon && <Icon className="w-4 h-4" style={{ color: "var(--sig)" }} animated={false} />}
      </div>
      <div className="serif text-3xl font-normal" style={{ color: "var(--sig)" }}>
        {value}
      </div>
    </div>
  );
}