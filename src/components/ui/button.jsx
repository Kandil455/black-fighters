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
  "apple-glass-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] active:duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "apple-glass-primary text-white font-semibold",
        destructive:
          "apple-glass-destructive text-[#B42318] font-semibold",
        // NO backdrop-filter on the button itself in JSX
        outline:
          "apple-glass-outline text-foreground",
        secondary:
          "apple-glass-secondary text-foreground",
        ghost:
          "apple-glass-ghost text-muted-foreground hover:text-foreground",
        link:
          "text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline",
        glass:
          "apple-glass-surface text-foreground",
        success:
          "apple-glass-primary text-white font-semibold",
      },
      size: {
        default: "h-11 px-5 py-2 rounded-xl",
        sm: "h-9 rounded-xl px-3.5 text-sm",
        lg: "h-[52px] rounded-2xl px-[26px] text-[16px]",
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
