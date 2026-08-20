import { Markdown } from "@/components/Markdown";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadme } from "@/hooks/useReadme";

interface ReadmePanelProps {
  projectId: number;
}

export function ReadmePanel({ projectId }: ReadmePanelProps) {
  const { data, isLoading, isError, error, refetch } = useReadme(projectId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      isEmpty={!data}
      emptyMessage="No README found in this project."
      skeleton={
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      }
    >
      <div className="max-h-[520px] overflow-y-auto pr-1">
        <Markdown>{data ?? ""}</Markdown>
      </div>
    </QueryState>
  );
}
