import { useEffect, useRef, useState } from "react";
import { BoxesIcon, PlayCircleIcon, RocketIcon, RulerIcon } from "lucide-react";
import { useLibraryStats } from "@/hooks/useProjects";
import { formatLoc, frameworkIcon, frameworkLabel, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Framework } from "@/lib/types";

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || target === 0) {
      setValue(target);
      return;
    }

    let frame: number;
    startRef.current = null;

    function step(timestamp: number) {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function InsightTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BoxesIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0">
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function TopFrameworks({ byFramework }: { byFramework: Record<string, number> }) {
  const ranked = Object.entries(byFramework)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = ranked[0]?.[1] ?? 1;

  if (ranked.length === 0) return null;

  return (
    <div className="flex flex-col justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">Top frameworks</div>
      {ranked.map(([framework, count]) => {
        const Icon = frameworkIcon(framework as Framework);
        return (
          <div key={framework} className="flex items-center gap-2">
            <Icon className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <span className="w-16 shrink-0 truncate text-xs">
              {frameworkLabel(framework as Framework)}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function deriveHeadline(stats: {
  total: number;
  broken: number;
  withScreenshots: number;
  oldestProject: string | null;
}): string {
  if (stats.broken > 0) {
    return `${stats.broken} project${stats.broken === 1 ? "" : "s"} broken and need attention.`;
  }
  const uncaptured = stats.total - stats.withScreenshots;
  if (uncaptured > 0) {
    return `${uncaptured} project${uncaptured === 1 ? "" : "s"} still need a screenshot.`;
  }
  if (stats.oldestProject) {
    return `Your oldest catalogued project is from ${relativeTime(stats.oldestProject)}.`;
  }
  return "Every catalogued project is captured and healthy.";
}

export function InsightsBar() {
  const { data: stats, isLoading } = useLibraryStats();

  const total = useCountUp(stats?.total ?? 0);
  const runnable = useCountUp(stats?.runnable ?? 0);
  const shipped = useCountUp(stats?.shipped ?? 0);
  const totalLoc = useCountUp(stats?.totalLoc ?? 0);

  if (isLoading || !stats) {
    return <div className="h-[76px] animate-pulse rounded-lg bg-card" />;
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "grid gap-2",
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        )}
      >
        <InsightTile icon={BoxesIcon} label="Total projects" value={total} />
        <InsightTile icon={PlayCircleIcon} label="Runnable" value={runnable} />
        <InsightTile icon={RocketIcon} label="Shipped" value={shipped} />
        <InsightTile icon={RulerIcon} label="Lines of code" value={formatLoc(totalLoc)} />
        <TopFrameworks byFramework={stats.byFramework} />
      </div>
      <p className="px-1 text-xs text-muted-foreground">{deriveHeadline(stats)}</p>
    </div>
  );
}
