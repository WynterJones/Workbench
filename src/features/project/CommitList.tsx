import { GitCommitHorizontalIcon } from "lucide-react";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommits } from "@/hooks/useCommits";
import { relativeTime } from "@/lib/format";

interface CommitListProps {
  projectId: number;
}

export function CommitList({ projectId }: CommitListProps) {
  const { data, isLoading, isError, error, refetch } = useCommits(projectId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      isEmpty={!data || data.length === 0}
      emptyMessage="No commits found — this project isn't a git repository."
      skeleton={
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      }
    >
      <ul className="max-h-[520px] space-y-0.5 overflow-y-auto pr-1">
        {(data ?? []).map((commit) => (
          <li
            key={commit.sha}
            className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-secondary/50"
          >
            <GitCommitHorizontalIcon
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-foreground">{commit.summary}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span className="font-mono">{commit.shortSha}</span>
                <span>{commit.author}</span>
                <span>{relativeTime(commit.committedAt)}</span>
                {commit.filesChanged > 0 && (
                  <span className="font-mono">
                    {commit.filesChanged}f
                    <span className="text-ok"> +{commit.insertions}</span>
                    <span className="text-destructive"> -{commit.deletions}</span>
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </QueryState>
  );
}
