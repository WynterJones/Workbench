import { cn } from "@/lib/utils";
import type { TimelineGroup } from "@/lib/timelineGroups";
import { yearOf } from "@/lib/timelineGroups";

interface TimelineYearRailProps {
  groups: TimelineGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
}

function monthAbbr(label: string): string {
  return label.split(" ")[0]?.slice(0, 3) ?? label;
}

export function TimelineYearRail({ groups, activeKey, onSelect }: TimelineYearRailProps) {
  const activeYear = yearOf(activeKey);

  const years: { year: string; months: TimelineGroup[]; total: number }[] = [];
  for (const group of groups) {
    const year = yearOf(group.key);
    const existing = years.find((entry) => entry.year === year);
    if (existing) {
      existing.months.push(group);
      existing.total += group.events.length;
    } else {
      years.push({ year, months: [group], total: group.events.length });
    }
  }

  const busiest = Math.max(1, ...years.map((entry) => entry.total));

  return (
    <nav
      aria-label="Jump to a month"
      className="sticky top-24 hidden w-28 shrink-0 flex-col gap-0.5 self-start lg:flex"
    >
      {years.map((entry) => {
        const yearActive = entry.year === activeYear;
        const weight = entry.total / busiest;

        return (
          <div key={entry.year}>
            <button
              type="button"
              onClick={() => onSelect(entry.months[0].key)}
              className="group flex w-full cursor-pointer items-center gap-2 py-1 text-left"
            >
              <span
                className={cn(
                  "h-[3px] shrink-0 rounded-full transition-all duration-300 ease-out",
                  yearActive ? "bg-brand" : "bg-border group-hover:bg-muted-foreground/50",
                )}
                style={{ width: `${8 + weight * 20}px` }}
              />
              <span
                className={cn(
                  "font-mono tabular-nums transition-all duration-300 ease-out",
                  yearActive
                    ? "text-lg font-bold text-brand"
                    : "text-xs text-muted-foreground group-hover:text-foreground",
                )}
              >
                {entry.year}
              </span>
            </button>

            <div
              className={cn(
                "grid overflow-hidden transition-all duration-300 ease-out",
                yearActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0">
                <div className="mb-1 ml-[14px] flex flex-col gap-px border-l border-border pl-2.5">
                  {entry.months.map((month) => {
                    const monthActive = month.key === activeKey;
                    return (
                      <button
                        key={month.key}
                        type="button"
                        onClick={() => onSelect(month.key)}
                        className={cn(
                          "flex cursor-pointer items-baseline gap-1.5 rounded px-1 py-0.5 text-left transition-colors duration-150 ease-out",
                          monthActive
                            ? "text-foreground"
                            : "text-muted-foreground/55 hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono text-[11px] uppercase tracking-wide",
                            monthActive && "font-semibold text-brand",
                          )}
                        >
                          {monthAbbr(month.label)}
                        </span>
                        <span className="font-mono text-[9px] tabular-nums opacity-50">
                          {month.events.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
