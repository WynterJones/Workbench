import { cn } from "@/lib/utils";

export interface Segment {
  value: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedTabs({ segments, value, onChange, className }: SegmentedTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5",
        className,
      )}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out",
              active
                ? "bg-secondary text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {segment.label}
            {segment.count !== undefined && (
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  active ? "text-brand" : "text-muted-foreground/60",
                )}
              >
                {segment.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
