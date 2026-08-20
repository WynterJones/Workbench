import { useCallback, useEffect, useMemo, useRef } from "react";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineControls } from "@/features/timeline/TimelineControls";
import { TimelineEventCard } from "@/features/timeline/TimelineEventCard";
import { useTimelinePlayback } from "@/features/timeline/useTimelinePlayback";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { groupByMonth, spanInYears, yearOf } from "@/lib/timelineGroups";
import { useAppStore } from "@/lib/store";

export function TimelinePage() {
  const openProject = useAppStore((s) => s.openProject);
  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProjectTimeline();

  const events = useMemo(() => (data?.pages ?? []).flatMap((page) => page.events), [data]);
  const summary = data?.pages[0];
  const groups = useMemo(() => groupByMonth(events), [events]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const playback = useTimelinePlayback(events.length, loadMore);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  let index = -1;
  let lastYear = "";

  return (
    <div className="px-6 pb-16 pt-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {(summary?.total ?? 0).toLocaleString()}
          </span>{" "}
          moments across{" "}
          <span className="font-semibold text-foreground">{summary?.projectCount ?? 0}</span>{" "}
          projects
        </h1>
        {summary && spanInYears(summary.newest, summary.oldest) >= 1 && (
          <p className="text-xs text-muted-foreground/70">
            spanning {spanInYears(summary.newest, summary.oldest).toFixed(1)} years
          </p>
        )}
      </div>

      <TimelineControls
        playing={playback.playing}
        speed={playback.speed}
        revealed={Math.min(playback.revealed, events.length)}
        total={summary?.total ?? events.length}
        onToggle={playback.toggle}
        onRestart={playback.restart}
        onSpeed={playback.setSpeed}
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={events.length === 0}
        emptyTitle="Nothing to show yet"
        emptyMessage="Scan your folders and your project history will appear here."
        skeleton={
          <div className="space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <div className="relative mx-auto max-w-4xl">
          <span
            aria-hidden
            className="absolute inset-y-0 left-1.5 hidden w-px bg-border md:left-1/2 md:block"
          />

          {groups.map((group) => {
            const year = yearOf(group.key);
            const newYear = year !== lastYear;
            lastYear = year;

            return (
              <section key={group.key} className="relative">
                {newYear && (
                  <div className="relative z-[1] flex justify-center py-5">
                    <span className="rounded-full border border-brand/40 bg-background px-3 py-0.5 font-mono text-xs text-brand">
                      {year}
                    </span>
                  </div>
                )}

                <p className="relative z-[1] mb-2 flex justify-center">
                  <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    {group.label}
                  </span>
                </p>

                <div className="flex flex-col gap-2.5">
                  {group.events.map((event) => {
                    index += 1;
                    return (
                      <TimelineEventCard
                        key={event.id}
                        event={event}
                        side={index % 2 === 0 ? "left" : "right"}
                        visible={index < playback.revealed}
                        onOpen={() => openProject(event.projectId)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div ref={sentinel} className="h-10" />

          {isFetchingNextPage && (
            <p className="py-4 text-center text-xs text-muted-foreground">Loading more…</p>
          )}
          {!hasNextPage && events.length > 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground/60">
              That is everything.
            </p>
          )}
        </div>
      </QueryState>
    </div>
  );
}
