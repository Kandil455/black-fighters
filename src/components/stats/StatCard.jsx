import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, color = "text-primary", border = "border-primary/30", glow = "", index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`glass-card rounded-2xl p-6 border ${border} ${glow}`}
    >
      <Icon className={`w-7 h-7 ${color} mb-3`} />
      <p className="text-3xl font-black mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}