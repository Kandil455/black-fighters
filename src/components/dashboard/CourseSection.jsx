import React from "react";
import { motion } from "framer-motion";
import { Folder } from "lucide-react";
import CourseCard from "@/components/CourseCard";

export default function CourseSection({ title, courses, contentMap = {} }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="mb-10"
    >
      {title && (
        <div className="flex items-center justify-between gap-3 mb-5 pb-2.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Folder className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight font-heading text-white">{title}</h2>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            {courses.length}
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 auto-rows-fr">
        {courses.map((course, i) => (
          <CourseCard key={course.id} course={course} index={i} contents={contentMap[course.id] || []} />
        ))}
      </div>
    </motion.div>
  );
}
