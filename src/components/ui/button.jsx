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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B8A9E]/40 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#0B1F33] text-white font-semibold hover:bg-[#071624] shadow-[0_1px_2px_rgba(11,31,51,0.12)]",
        destructive:
          "bg-[#FCECEF] text-[#B42318] hover:bg-[#F9D7DC] border border-[#F3B4BC]",
        // NO backdrop-filter on the button itself
        outline:
          "border border-[#D5DEE7] bg-white text-[#0B1F33] hover:bg-[#EEF2F5] hover:border-[#B8CBD6]",
        secondary:
          "border border-[#D5DEE7] bg-[#EEF2F5] text-[#0B1F33] hover:bg-[#E3EAF0]",
        ghost:
          "text-[#5A6B7D] hover:bg-[#EEF2F5] hover:text-[#0B1F33]",
        link:
          "text-[#2B8A9E] underline-offset-4 hover:underline",
        glass:
          "border border-[#D5DEE7] bg-white text-[#0B1F33] hover:bg-[#EEF2F5] hover:border-[#B8CBD6]",
        success:
          "bg-[#0B1F33] text-white font-semibold hover:bg-[#071624]",
      },
      size: {
        default: "h-11 px-5 py-2 rounded-md",
        sm: "h-9 rounded-md px-3.5 text-sm",
        lg: "h-[52px] rounded-md px-[26px] text-[17px]",
        icon: "h-10 w-10 rounded-md",
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
          success && "ring-2 ring-[#3DDC97]/50 transition-[box-shadow] duration-150",
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
          <span className="inline-flex items-center gap-1.5 text-[#07080C] font-bold">
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
