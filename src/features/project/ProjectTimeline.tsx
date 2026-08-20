import {
  CameraIcon,
  CircleDotIcon,
  GitCommitVerticalIcon,
  PencilIcon,
  PlayIcon,
  ScanEyeIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectActivity } from "@/hooks/useProject";
import { relativeTime } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

const KIND_ICON: Record<ActivityEvent["kind"], typeof CircleDotIcon> = {
  created: CircleDotIcon,
  commit: GitCommitVerticalIcon,
  modified: PencilIcon,
  screenshot: CameraIcon,
  scanned: ScanEyeIcon,
  run: PlayIcon,
};

const KIND_LABEL: Record<ActivityEvent["kind"], string> = {
  created: "Created",
  commit: "Commit",
  modified: "Code changed",
  screenshot: "Screenshot captured",
  scanned: "Scanned",
  run: "Run attempt",
};

interface ProjectTimelineProps {
  projectId: number;
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const { data: events, isLoading } = useProjectActivity(projectId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return (
    <ol className="space-y-0">
      {sorted.map((event, index) => {
        const Icon = KIND_ICON[event.kind];
        const isLast = index === sorted.length - 1;
        return (
          <li key={event.id} className="flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                <Icon className="size-3 text-muted-foreground" strokeWidth={1.5} />
              </span>
              {!isLast && <span className="mt-1 w-px flex-1 bg-border" />}
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{KIND_LABEL[event.kind]}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(event.occurredAt)}</span>
              </div>
              {event.detail && (
                <p className="truncate text-xs text-muted-foreground">{event.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
