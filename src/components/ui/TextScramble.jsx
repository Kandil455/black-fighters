import React, { useEffect, useState, useRef } from "react";

const CHARS = "-_~=+*!@#$%^&()[]{}/\\|0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const TextScramble = ({
  text,
  className = "",
  speed = 40,
  triggerOnHover = true,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const isScrambling = useRef(false);

  const scramble = () => {
    if (isScrambling.current) return;
    isScrambling.current = true;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
        isScrambling.current = false;
        setDisplayText(text);
      }

      iteration += 1 / 3;
    }, speed);
  };

  useEffect(() => {
    scramble();
  }, [text]);

  return (
    <span
      className={className}
      onMouseEnter={triggerOnHover ? scramble : undefined}
      style={{ display: "inline-block" }}
    >
      {displayText}
    </span>
  );
};
