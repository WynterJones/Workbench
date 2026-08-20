import type { LucideIcon } from "lucide-react";

interface StatChipProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
}

export function StatChip({ icon: Icon, label, value }: StatChipProps) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <Icon className="size-3.5 shrink-0 -translate-y-px self-center text-muted-foreground" strokeWidth={1.5} />
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
