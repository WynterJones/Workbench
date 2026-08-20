import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxDotProps {
  checked: boolean;
}

export function CheckboxDot({ checked }: CheckboxDotProps) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 ease-out",
        checked ? "border-brand bg-brand text-background" : "border-border bg-transparent",
      )}
    >
      {checked && <CheckIcon className="size-3" strokeWidth={3} />}
    </span>
  );
}
