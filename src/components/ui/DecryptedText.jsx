import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~";

export function DecryptedText({
  text = "",
  speed = 40,
  maxIterations = 12,
  sequential = true,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = DEFAULT_CHARS,
  className = "",
  encryptedClassName = "text-primary/60 font-mono",
  animateOn = "hover", // 'hover' | 'view'
  ...props
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);

  const startScramble = () => {
    if (isScrambling) return;
    setIsScrambling(true);

    let iteration = 0;
    const targetLength = text.length;

    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText((prev) =>
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (sequential) {
              if (index < iteration) return text[index];
            } else {
              if (iteration >= maxIterations) return text[index];
            }
            const pool = useOriginalCharsOnly ? text : characters;
            return pool[Math.floor(Math.random() * pool.length)];
          })
          .join("")
      );

      iteration += 1;

      if (iteration > (sequential ? targetLength + 2 : maxIterations)) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsScrambling(false);
      }
    }, speed);
  };

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  useEffect(() => {
    if (animateOn === "view" && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startScramble();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [animateOn, text]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    if (animateOn === "hover") startScramble();
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("inline-block cursor-default font-heading", className)}
      {...props}
    >
      {displayText}
    </span>
  );
}
export default DecryptedText;
