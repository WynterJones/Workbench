import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
}

export function Checkbox({ checked, onChange }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.preventDefault();
        onChange();
      }}
      className={cn(
        "cursor-pointer flex size-4 shrink-0 items-center justify-center rounded border border-border",
        checked && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {checked && <CheckIcon className="size-3" strokeWidth={3} />}
    </button>
  );
}
