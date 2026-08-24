import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeatmap, type HeatmapDay } from "@/hooks/useHeatmap";
import { heatmapWeeks, monthLabels, levelFor, levelThresholds } from "@/lib/heatmap";
import { cn } from "@/lib/utils";

const LEVEL_CLASS = [
  "bg-secondary/50",
  "bg-brand/25",
  "bg-brand/45",
  "bg-brand/70",
  "bg-brand",
];

function dayLabel(day: HeatmapDay) {
  const pretty = new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${day.count} commit${day.count === 1 ? "" : "s"} · ${pretty}`;
}

export function ContributionHeatmap() {
  const { data, isLoading, isError, error, refetch } = useHeatmap();

  const weeks = useMemo(() => heatmapWeeks(data?.days ?? []), [data]);
  const months = useMemo(() => monthLabels(weeks), [weeks]);
  const thresholds = useMemo(() => levelThresholds(data?.days ?? []), [data]);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      compact
      skeleton={<Skeleton className="h-16 w-full rounded-md" />}
    >
      {data && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {data.total.toLocaleString()}
              </span>{" "}
              commits in the last year across {data.reposScanned} scanned repos
            </p>
            <p className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{data.currentStreak}d streak</span>
              <span>longest {data.longestStreak}d</span>
              <span className="flex items-center gap-1">
                Less
                {LEVEL_CLASS.map((className) => (
                  <span key={className} className={cn("size-2 rounded-[2px]", className)} />
                ))}
                More
              </span>
            </p>
          </div>

          <div className="flex w-full gap-[2px]">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex min-w-0 flex-1 flex-col gap-[2px]">
                {week.map((day, dayIndex) =>
                  day ? (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "heatmap-cell aspect-square w-full rounded-[2px]",
                            LEVEL_CLASS[levelFor(day.count, thresholds)],
                            (weekIndex * 7 + dayIndex) % 29 === 0 && "heatmap-cell-pulse",
                          )}
                          style={{ animationDelay: `-${(weekIndex * 7 + dayIndex) % 64}s` }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">{dayLabel(day)}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <span key={dayIndex} className="aspect-square w-full" />
                  ),
                )}
              </div>
            ))}
          </div>

          <div className="flex w-full gap-[2px] text-[9px] uppercase tracking-wide text-muted-foreground/70">
            {months.map((month) => (
              <span
                key={`${month.label}-${month.index}`}
                className="min-w-0 truncate"
                style={{ flex: `${month.span} 1 0%` }}
              >
                {month.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </QueryState>
  );
}
