import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CtaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "md" | "lg";
}

export function CtaButton({ children, className, size = "md", ...props }: CtaButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "group relative inline-flex cursor-pointer select-none items-center justify-center gap-2 self-center rounded-xl font-semibold tracking-tight",
        "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand)_88%,#fff)_0%,var(--brand)_45%,color-mix(in_srgb,var(--brand)_86%,#000)_100%)]",
        "text-[#1a1206]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.28),0_1px_2px_rgba(0,0,0,0.5),0_6px_18px_-6px_color-mix(in_srgb,var(--brand)_55%,transparent)]",
        "transition-all duration-150 ease-out",
        "hover:brightness-[1.06]",
        "active:translate-y-px active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
        size === "lg" ? "px-7 py-3 text-base" : "px-5 py-2.5 text-sm",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    >
      {children}
    </button>
  );
}
