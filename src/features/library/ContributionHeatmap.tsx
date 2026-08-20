import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeatmap, type HeatmapDay } from "@/hooks/useHeatmap";
import { heatmapWeeks, monthLabels, levelFor } from "@/lib/heatmap";
import { cn } from "@/lib/utils";

const LEVEL_CLASS = [
  "bg-secondary/60",
  "bg-brand/25",
  "bg-brand/45",
  "bg-brand/70",
  "bg-brand",
];

function dayLabel(day: HeatmapDay) {
  const date = new Date(`${day.date}T00:00:00`);
  const pretty = date.toLocaleDateString(undefined, {
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
  const max = useMemo(
    () => (data?.days ?? []).reduce((peak, day) => Math.max(peak, day.count), 0),
    [data],
  );

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      compact
      skeleton={<Skeleton className="h-[132px] w-full rounded-lg" />}
    >
      {data && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-foreground">
              <span className="font-semibold tabular-nums">{data.total.toLocaleString()}</span>{" "}
              <span className="text-muted-foreground">commits in the last year</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {data.reposScanned} repos · {data.currentStreak}d streak · longest{" "}
              {data.longestStreak}d
            </p>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="inline-flex flex-col gap-1">
              <div className="flex gap-[3px] pl-0 text-[10px] text-muted-foreground">
                {months.map((month) => (
                  <span
                    key={`${month.label}-${month.index}`}
                    style={{ width: `${month.span * 13 - 3}px` }}
                    className="shrink-0 text-left"
                  >
                    {month.label}
                  </span>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) =>
                      day ? (
                        <Tooltip key={day.date}>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "size-[10px] rounded-[2px]",
                                LEVEL_CLASS[levelFor(day.count, max)],
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">{dayLabel(day)}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span key={dayIndex} className="size-[10px]" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
            Less
            {LEVEL_CLASS.map((className) => (
              <span key={className} className={cn("size-[10px] rounded-[2px]", className)} />
            ))}
            More
          </div>
        </div>
      )}
    </QueryState>
  );
}
