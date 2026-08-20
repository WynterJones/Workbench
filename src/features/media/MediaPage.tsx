import { HeartIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateBlock } from "@/components/EmptyStateBlock";
import { MediaGrid } from "@/features/media/MediaGrid";
import { useMediaDetails } from "@/hooks/useMedia";
import { useFavoriteMedia } from "@/lib/favoriteMedia";

export function MediaPage() {
  const paths = useFavoriteMedia((s) => s.paths);
  const clear = useFavoriteMedia((s) => s.clear);
  const { data, isLoading, isError, error, refetch } = useMediaDetails(paths);

  if (paths.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <EmptyStateBlock
          icon={HeartIcon}
          title="No favorites yet"
          message="Open a project's Media tab and tap the heart on anything you want to keep close."
        />
      </div>
    );
  }

  const missing = paths.length - (data?.length ?? paths.length);

  return (
    <div className="space-y-4 px-6 pb-8 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{paths.length}</span> favorited
          {missing > 0 && (
            <span className="text-warn"> · {missing} no longer on disk</span>
          )}
        </p>
        <Button size="sm" variant="outline" onClick={clear} className="cursor-pointer">
          <Trash2Icon />
          Clear all
        </Button>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={!data || data.length === 0}
        emptyTitle="Nothing left to show"
        emptyMessage="Every favorited file has been moved or deleted."
        compact
        skeleton={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <MediaGrid items={data ?? []} />
      </QueryState>
    </div>
  );
}
