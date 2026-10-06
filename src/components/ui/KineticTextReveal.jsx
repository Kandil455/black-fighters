import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * KineticHeading
 * Animates text word by word with staggered kinetic motion, blur-to-sharp clarity, and micro-y translation.
 */
export function KineticHeading({
  text = "",
  className = "",
  as: Component = "h1",
  delay = 0.05,
  stagger = 0.045,
  highlightWords = [],
  highlightClassName = "text-primary neon-text-gradient",
  once = true,
  ...props
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.2 });

  const words = text ? text.split(" ") : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 18,
      scale: 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1], // Apple-grade smooth cubic bezier
      },
    },
  };

  return (
    <Component
      ref={ref}
      className={cn("inline-flex flex-wrap items-center gap-x-[0.3em] gap-y-[0.1em]", className)}
      {...props}
    >
      <motion.span
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="inline-flex flex-wrap items-center gap-x-[0.3em] gap-y-[0.1em]"
      >
        {words.map((word, i) => {
          const isHighlight = highlightWords.some(
            (hw) => word.toLowerCase().includes(hw.toLowerCase())
          );

          return (
            <motion.span
              key={`${word}-${i}`}
              variants={wordVariants}
              className={cn("inline-block", isHighlight && highlightClassName)}
            >
              {word}
            </motion.span>
          );
        })}
      </motion.span>
    </Component>
  );
}

/**
 * KineticParagraph
 * Smooth kinetic fade for descriptions and subheadings with gentle blur reveal.
 */
export function KineticParagraph({
  children,
  className = "",
  delay = 0.15,
  duration = 0.65,
  once = true,
  ...props
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.2 });

  return (
    <motion.p
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("leading-relaxed", className)}
      {...props}
    >
      {children}
    </motion.p>
  );
}

export default KineticHeading;
