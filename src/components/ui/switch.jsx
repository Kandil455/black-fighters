import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { playClick } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/**
 * Switch Component — Black Fighters Edition
 * Guaranteed 100% RTL & LTR alignment. Never overflows the track bounds.
 * Variants: 'default' (iOS pill) and 'cyberpunk'.
 *
 * The 'lottie' variant was removed with the Lottie icon system: it lazy-loaded a
 * 2.4 MB animation JSON to draw a toggle knob that a transform transition does
 * better and 100x cheaper on weak devices.
 */
const Switch = React.forwardRef(
  (
    {
      className,
      thumbClassName,
      variant = "default",
      playSound = true,
      checked,
      defaultChecked,
      onCheckedChange,
      disabled,
      ...props
    },
    ref
  ) => {
    // Internal state tracking for custom variants if uncontrolled
    const [isChecked, setIsChecked] = React.useState(
      checked !== undefined ? checked : defaultChecked || false
    );

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleToggle = (nextVal) => {
      if (disabled) return;
      if (playSound) playClick();
      setIsChecked(nextVal);
      onCheckedChange?.(nextVal);
    };

    // ── Variant: Cyberpunk Neon Fighter Switch ──
    if (variant === "cyberpunk") {
      return (
        <SwitchPrimitives.Root
          dir="ltr"
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={handleToggle}
          disabled={disabled}
          className={cn(
            "peer relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-xl border border-cyan-500/30 p-0.5 shadow-sm transition-colors duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40",
            "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-cyan-500/30 data-[state=checked]:to-primary/40 data-[state=checked]:border-cyan-400 data-[state=checked]:shadow-[0_0_16px_rgba(0,245,255,0.4)]",
            "data-[state=unchecked]:bg-black/60 data-[state=unchecked]:border-white/15 hover:data-[state=unchecked]:border-white/25",
            className
          )}
          ref={ref}
          {...props}
        >
          <SwitchPrimitives.Thumb
            className={cn(
              "pointer-events-none flex items-center justify-center h-5.5 w-5.5 rounded-lg font-mono text-[9px] font-black transition-colors duration-200 ease-out",
              "data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary data-[state=checked]:text-black data-[state=checked]:shadow-[0_0_10px_rgba(0,245,255,0.8)]",
              "data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-white/30 data-[state=unchecked]:text-white/60",
              thumbClassName
            )}
          >
            <span className="text-[10px] leading-none select-none">
              {isChecked ? "⚡" : "○"}
            </span>
          </SwitchPrimitives.Thumb>
        </SwitchPrimitives.Root>
      );
    }

    // ── Variant: Default iOS 18 Glass Neon Pill (Guaranteed RTL/LTR safe) ──
    return (
      <SwitchPrimitives.Root
        dir="ltr"
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={handleToggle}
        disabled={disabled}
        className={cn(
          "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40",
          "data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_14px_rgba(0,245,255,0.4)] data-[state=checked]:border-primary/40 border border-transparent",
          "data-[state=unchecked]:bg-white/15 data-[state=unchecked]:border-white/10 hover:data-[state=unchecked]:bg-white/20",
          className
        )}
        ref={ref}
        {...props}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out",
            "data-[state=checked]:translate-x-5 data-[state=checked]:shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
            "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-white/90",
            thumbClassName
          )}
        />
      </SwitchPrimitives.Root>
    );
  }
);

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
export default Switch;
