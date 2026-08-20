import { cn } from "@/lib/utils";
import type { BrandMark } from "@/lib/brandIcons";

interface BrandIconProps {
  mark: BrandMark;
  className?: string;
  monochrome?: boolean;
}

export function BrandIcon({ mark, className, monochrome }: BrandIconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      aria-label={mark.title}
      className={cn("size-3.5 shrink-0", className)}
      preserveAspectRatio="xMidYMid meet"
      fill={monochrome ? "currentColor" : mark.hex}
    >
      <path d={mark.path} />
    </svg>
  );
}
