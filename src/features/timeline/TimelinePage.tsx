import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { TimelineControls } from "@/features/timeline/TimelineControls";
import { TimelineRow } from "@/features/timeline/TimelineRow";
import { TimelineYearRail } from "@/features/timeline/TimelineYearRail";
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

  const years = useMemo(() => {
    const seen: string[] = [];
    for (const group of groups) {
      const year = yearOf(group.key);
      if (!seen.includes(year)) seen.push(year);
    }
    return seen;
  }, [groups]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of groups) {
      const year = yearOf(group.key);
      map[year] = (map[year] ?? 0) + group.events.length;
    }
    return map;
  }, [groups]);

  const [activeYear, setActiveYear] = useState("");
  const spine = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const playback = useTimelinePlayback(events.length, loadMore);
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeYear && years.length > 0) setActiveYear(years[0]);
  }, [years, activeYear]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "800px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const root = spine.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll<HTMLElement>("[data-year]"));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const year = top?.target.getAttribute("data-year");
        if (year) setActiveYear(year);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [groups]);

  useEffect(() => {
    if (!playback.playing || playback.revealed === 0) return;
    const node = spine.current?.querySelector<HTMLElement>(
      `[data-timeline-index="${playback.revealed - 1}"]`,
    );
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const smooth = !reduce && playback.speed === 1;
    node.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  }, [playback.playing, playback.revealed, playback.speed]);

  function jumpToYear(year: string) {
    const node = spine.current?.querySelector<HTMLElement>(`[data-year="${year}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <div className="flex gap-8">
          <TimelineYearRail
            years={years}
            activeYear={activeYear}
            counts={counts}
            onSelect={jumpToYear}
          />

          <div ref={spine} className="relative min-w-0 flex-1">
            <span aria-hidden className="absolute inset-y-0 left-[34px] w-px bg-border" />

            {groups.map((group) => {
              const year = yearOf(group.key);
              const newYear = year !== lastYear;
              lastYear = year;

              return (
                <section key={group.key} data-year={newYear ? year : undefined}>
                  <div className="sticky top-14 z-[1] -mx-2 flex items-center gap-3 bg-background/95 px-2 py-1.5 backdrop-blur">
                    <span
                      className={`w-[22px] shrink-0 text-right font-mono text-[10px] uppercase tracking-wide ${
                        newYear ? "text-brand" : "text-transparent"
                      }`}
                    >
                      {year.slice(2)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-border/60" />
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
                      {group.events.length}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    {group.events.map((event) => {
                      index += 1;
                      return (
                        <TimelineRow
                          key={event.id}
                          event={event}
                          index={index}
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
        </div>
      </QueryState>
    </div>
  );
}
