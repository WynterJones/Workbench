import {
  CameraIcon,
  CircleDotIcon,
  FlagIcon,
  GitCommitVerticalIcon,
  PencilIcon,
  PlayIcon,
  ScanEyeIcon,
} from "lucide-react";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeline, type TimelineEntry } from "@/hooks/useTimeline";
import { relativeTime } from "@/lib/format";
import type { Project } from "@/lib/types";

const KIND_ICON: Record<TimelineEntry["kind"], typeof CircleDotIcon> = {
  created: CircleDotIcon,
  commit: GitCommitVerticalIcon,
  "first-commit": FlagIcon,
  "last-modified": PencilIcon,
  modified: PencilIcon,
  screenshot: CameraIcon,
  scanned: ScanEyeIcon,
  run: PlayIcon,
};

interface ProjectTimelineProps {
  project: Project;
}

export function ProjectTimeline({ project }: ProjectTimelineProps) {
  const { entries, isLoading, isError, error, refetch } = useTimeline(project);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={refetch}
      isEmpty={entries.length === 0}
      emptyMessage="No activity recorded yet."
      skeleton={
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      }
    >
      <ol className="max-h-[420px] overflow-y-auto pr-1">
        {entries.map((entry, index) => {
          const Icon = KIND_ICON[entry.kind] ?? CircleDotIcon;
          const isLast = index === entries.length - 1;
          return (
            <li key={entry.id} className="flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                  <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
                </span>
                {!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(entry.occurredAt)}
                  </span>
                </div>
                {entry.detail && (
                  <p className="truncate text-xs text-muted-foreground">{entry.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </QueryState>
  );
}
