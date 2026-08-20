import { useProjectActivity } from "@/hooks/useProject";
import { useCommits, type Commit } from "@/hooks/useCommits";
import type { ActivityEvent, Project } from "@/lib/types";

export interface TimelineEntry {
  id: string;
  kind: ActivityEvent["kind"] | "first-commit" | "last-modified";
  label: string;
  detail: string | null;
  occurredAt: string;
}

function fromCommits(commits: Commit[]): TimelineEntry[] {
  if (commits.length === 0) return [];
  const newest = commits[0];
  const oldest = commits[commits.length - 1];

  const entries: TimelineEntry[] = commits.slice(0, 8).map((commit) => ({
    id: `commit-${commit.sha}`,
    kind: "commit",
    label: "Commit",
    detail: `${commit.summary} · ${commit.author}`,
    occurredAt: commit.committedAt,
  }));

  if (oldest.sha !== newest.sha) {
    entries.push({
      id: `first-commit-${oldest.sha}`,
      kind: "first-commit",
      label: "First commit",
      detail: `${oldest.summary} · ${oldest.author}`,
      occurredAt: oldest.committedAt,
    });
  }

  return entries;
}

export function useTimeline(project: Project) {
  const activity = useProjectActivity(project.id);
  const commits = useCommits(project.id, 100);

  const entries: TimelineEntry[] = [
    ...(activity.data ?? []).map((event) => ({
      id: `activity-${event.id}`,
      kind: event.kind,
      label:
        event.kind === "created"
          ? "Discovered by Workbench"
          : event.kind === "scanned"
            ? "Scanned"
            : event.kind === "screenshot"
              ? "Screenshot captured"
              : event.kind === "run"
                ? "Run attempt"
                : event.kind === "modified"
                  ? "Code changed"
                  : "Commit",
      detail: event.detail,
      occurredAt: event.occurredAt,
    })),
    ...fromCommits(commits.data ?? []),
    {
      id: "last-modified",
      kind: "last-modified" as const,
      label: "Last code change",
      detail: null,
      occurredAt: project.lastModified,
    },
  ];

  const deduped = new Map<string, TimelineEntry>();
  for (const entry of entries) {
    if (!Number.isNaN(new Date(entry.occurredAt).getTime())) {
      deduped.set(entry.id, entry);
    }
  }

  return {
    entries: [...deduped.values()].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    ),
    isLoading: activity.isLoading,
    isError: activity.isError,
    error: activity.error,
    refetch: () => {
      activity.refetch();
      commits.refetch();
    },
  };
}
