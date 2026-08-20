import { cn } from "@/lib/utils";

interface CheckboxDotProps {
  checked: boolean;
}

export function CheckboxDot({ checked }: CheckboxDotProps) {
  return (
    <span
      className={cn(
        "flex size-[16px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ease-out",
        checked
          ? "border-brand bg-brand text-[#1a1206]"
          : "border-muted-foreground/40 bg-transparent",
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={cn(
          "size-[11px] transition-opacity duration-150 ease-out",
          checked ? "opacity-100" : "opacity-0",
        )}
      >
        <path
          d="M3.5 8.5L6.5 11.5L12.5 5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
