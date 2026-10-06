import React from "react";
import { cn } from "@/lib/utils";

export const UnlockProButton = ({
  children = "Unlock Pro",
  onClick,
  className = "",
  fullWidth = false,
  ...props
}) => {
  return (
    <>
      <button
        onClick={onClick}
        className={cn(
          // NOTE: no transition utility here — the <style> block below owns
          // the transition list (background sweep, transform, box-shadow).
          // A blanket transition utility would drag framer's mount transform
          // into the hover path when this button sits inside cards.
          "uiverse-unlock-pro-btn group relative select-none flex items-center justify-center gap-2 font-bold cursor-pointer",
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 36 24"
          className="w-5 h-5 transition-[fill,transform] duration-300 fill-[#f09f33] group-hover:fill-white group-hover:scale-110 shrink-0"
        >
          <path d="m18 0 8 12 10-8-4 20H4L0 4l10 8 8-12z" />
        </svg>
        <span className="tracking-wide">{children}</span>
      </button>

      <style>{`
        .uiverse-unlock-pro-btn {
          /* Proportion contract: height comes from the h-12 utility when
             given (border-box keeps padding inside it); compact usages
             (sidebar) fall back to the vertical padding. Radius is 1rem so
             the button matches the app-wide rounded-2xl contract — the old
             hard-coded 30px pill couldn't be overridden by utilities and
             broke the one-proportion rule in the Dashboard action hub. */
          padding: 0.9em 1.4rem;
          border-radius: 1rem;
          text-shadow: 2px 2px 4px rgba(136, 0, 136, 0.6);
          background: linear-gradient(15deg, #880088, #aa2068, #cc3f47, #de6f3d, #f09f33, #de6f3d, #cc3f47, #aa2068, #880088) no-repeat;
          background-size: 300%;
          color: #fff;
          border: none;
          background-position: left center;
          box-shadow: 0 20px 25px -10px rgba(222, 111, 61, 0.35);
          transition: background 0.4s ease, transform 0.2s ease, box-shadow 0.3s ease;
        }

        .uiverse-unlock-pro-btn:hover {
          background-size: 320%;
          background-position: right center;
          transform: translateY(-2px);
          /* Brief rule: glow is a STATIC box-shadow. The old breathing glow
             (proBreath) animated box-shadow infinitely — main-thread repaint
             per frame, exactly while the user is hovering and reading
             feedback elsewhere in the card. Transform feedback only. */
          box-shadow: 0 20px 34px -10px rgba(240, 159, 51, 0.55), 0 0 22px rgba(240, 159, 51, 0.3);
        }
        @media (prefers-reduced-motion: reduce) {
          .uiverse-unlock-pro-btn {
            transition: none;
          }
          .uiverse-unlock-pro-btn:hover {
            transform: none;
          }
        }

        .uiverse-unlock-pro-btn:active {
          transform: translateY(1px);
        }
      `}</style>
    </>
  );
};

export default UnlockProButton;
