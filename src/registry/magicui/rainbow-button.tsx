import * as React from "react";
import { cn } from "@/lib/utils";

interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-5 py-2 font-semibold text-sm text-white bg-neutral-950 dark:bg-white dark:text-black transition-all duration-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      style={{
        border: "2px solid transparent",
        backgroundClip: "padding-box",
        backgroundOrigin: "border-box",
        position: "relative",
      }}
      {...props}
    >
      {/* Rainbow animated border via pseudo-element simulation using a wrapper */}
      <span
        aria-hidden
        style={{
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: "2px",
          background:
            "linear-gradient(90deg, hsl(0,100%,63%), hsl(30,100%,60%), hsl(60,100%,55%), hsl(120,100%,55%), hsl(200,100%,60%), hsl(260,100%,65%), hsl(300,100%,60%), hsl(0,100%,63%))",
          backgroundSize: "200% auto",
          animation: "rb-shift 3s linear infinite",
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
          pointerEvents: "none",
        }}
      />
      <style>{`
        @keyframes rb-shift {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
      {children}
    </button>
  );
}
