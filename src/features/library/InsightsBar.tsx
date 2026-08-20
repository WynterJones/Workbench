import { BoxesIcon, CameraIcon, PlayCircleIcon, RulerIcon, TriangleAlertIcon } from "lucide-react";
import { StatChip } from "@/features/library/StatChip";
import { FrameworkChips } from "@/features/library/FrameworkChips";
import { useLibraryStats } from "@/hooks/useProjects";
import { useCountUp } from "@/hooks/useCountUp";
import { formatLoc } from "@/lib/format";

export function InsightsBar() {
  const { data: stats, isLoading, isError, refetch } = useLibraryStats();

  const total = useCountUp(stats?.total ?? 0);
  const runnable = useCountUp(stats?.runnable ?? 0);
  const captured = useCountUp(stats?.withScreenshots ?? 0);
  const totalLoc = useCountUp(stats?.totalLoc ?? 0);

  if (isError) {
    return (
      <div className="flex h-11 items-center gap-3 rounded-lg border border-border bg-card px-4 text-xs text-muted-foreground">
        Couldn&apos;t load library stats.
        <button type="button" onClick={() => refetch()} className="cursor-pointer underline">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !stats) {
    return <div className="h-11 shrink-0 animate-pulse rounded-lg border border-border bg-card/40" />;
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-5 overflow-x-auto rounded-lg border border-border bg-card px-4">
      <StatChip icon={BoxesIcon} label="projects" value={total} />
      <StatChip icon={PlayCircleIcon} label="runnable" value={runnable} />
      <StatChip icon={CameraIcon} label="captured" value={captured} />
      <StatChip icon={RulerIcon} label="lines" value={formatLoc(totalLoc)} />
      {stats.broken > 0 && (
        <StatChip icon={TriangleAlertIcon} label="broken" value={stats.broken} />
      )}
      <div className="ml-auto shrink-0">
        <FrameworkChips byFramework={stats.byFramework} />
      </div>
    </div>
  );
}
