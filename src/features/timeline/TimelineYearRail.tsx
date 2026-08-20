import { cn } from "@/lib/utils";

interface TimelineYearRailProps {
  years: string[];
  activeYear: string;
  counts: Record<string, number>;
  onSelect: (year: string) => void;
}

export function TimelineYearRail({ years, activeYear, counts, onSelect }: TimelineYearRailProps) {
  const max = Math.max(1, ...years.map((year) => counts[year] ?? 0));

  return (
    <nav
      aria-label="Jump to year"
      className="sticky top-24 hidden w-20 shrink-0 flex-col gap-1 self-start lg:flex"
    >
      {years.map((year) => {
        const active = year === activeYear;
        const weight = (counts[year] ?? 0) / max;

        return (
          <button
            key={year}
            type="button"
            onClick={() => onSelect(year)}
            className="group flex cursor-pointer items-center gap-2 py-1 text-left"
          >
            <span
              className={cn(
                "h-[3px] rounded-full transition-all duration-300 ease-out",
                active ? "bg-brand" : "bg-border group-hover:bg-muted-foreground/50",
              )}
              style={{ width: `${8 + weight * 22}px` }}
            />
            <span
              className={cn(
                "font-mono tabular-nums transition-all duration-300 ease-out",
                active
                  ? "text-lg font-bold text-brand"
                  : "text-xs text-muted-foreground group-hover:text-foreground",
              )}
            >
              {year}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
