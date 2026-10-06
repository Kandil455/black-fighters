import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sounds";

const buttonVariants = cva(
  // PERF CONTRACT (calculated, §6/§7): base transitions an EXPLICIT list, not
  // transition-colors — a blanket transition drags every property (including
  // framer mount transforms on asChild wrappers) into the hover path. Hover
  // feedback = colors + subtle 150ms transition. NO hover:scale.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22E58B]/50 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#19f08c] text-[#03150c] font-semibold hover:bg-[#0fd677] shadow-[0_0_0_1px_rgb(25_240_140/0.5),0_8px_40px_-6px_rgb(25_240_140/0.45)] hover:shadow-[0_0_0_1px_rgb(25_240_140/0.7),0_10px_50px_-4px_rgb(25_240_140/0.6)]",
        destructive:
          "bg-[#ff5c6c]/15 text-[#ff5c6c] hover:bg-[#ff5c6c]/25 border border-[#ff5c6c]/30",
        // NO backdrop-filter on the button itself
        outline:
          "border border-[rgb(255_255_255/0.09)] bg-white/[0.035] text-[#eef2f6] hover:bg-white/[0.07] hover:border-[rgb(255_255_255/0.16)]",
        secondary:
          "border border-[rgb(255_255_255/0.09)] bg-white/[0.035] text-[#eef2f6] hover:bg-white/[0.07] hover:border-[rgb(255_255_255/0.16)]",
        ghost:
          "text-[#9aa6b4] hover:bg-white/[0.06] hover:text-[#eef2f6]",
        link:
          "text-[#19f08c] underline-offset-4 hover:underline",
        glass:
          "border border-[rgb(255_255_255/0.09)] bg-white/[0.035] text-[#eef2f6] hover:bg-white/[0.07] hover:border-[rgb(255_255_255/0.16)]",
        success:
          "bg-[#19f08c] text-[#03150c] font-semibold hover:bg-[#0fd677] shadow-[0_0_0_1px_rgb(25_240_140/0.5),0_8px_40px_-6px_rgb(25_240_140/0.45)]",
      },
      size: {
        default: "h-11 px-5 py-2 rounded-xl",
        sm: "h-9 rounded-xl px-3.5 text-sm",
        lg: "h-14 rounded-xl px-7 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      success = false,
      playSound = false,
      onClick,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e) => {
      if (playSound) playClick();
      if (onClick) onClick(e);
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant: success ? "success" : variant, size, className }),
          success && "ring-2 ring-[#22E58B]/50 transition-[box-shadow] duration-150",
          loading && "cursor-wait"
        )}
        ref={ref}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span className="opacity-80">{children}</span>
          </span>
        ) : success ? (
          <span className="inline-flex items-center gap-1.5 text-[#07090D] font-bold">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
