import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaGrid } from "@/features/media/MediaGrid";
import { useProjectMedia } from "@/hooks/useMedia";

interface ProjectMediaPanelProps {
  projectId: number;
}

export function ProjectMediaPanel({ projectId }: ProjectMediaPanelProps) {
  const { data, isLoading, isError, error, refetch } = useProjectMedia(projectId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      isEmpty={!data || data.length === 0}
      emptyTitle="No media here"
      emptyMessage="This project has no images or videos outside its dependencies."
      compact
      skeleton={
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto pr-2">
        <MediaGrid items={data ?? []} />
      </div>
    </QueryState>
  );
}
