import { useEffect, useMemo, useState } from "react";
import { HeartIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/components/QueryState";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateBlock } from "@/components/EmptyStateBlock";
import { MediaGrid } from "@/features/media/MediaGrid";
import { MediaPagination } from "@/features/media/MediaPagination";
import { MediaToolbar } from "@/features/media/MediaToolbar";
import { useMediaDetails } from "@/hooks/useMedia";
import { useFavoriteMedia } from "@/lib/favoriteMedia";
import { useUserPreferences } from "@/lib/userPreferences";

export function MediaPage() {
  const paths = useFavoriteMedia((s) => s.paths);
  const clear = useFavoriteMedia((s) => s.clear);
  const { data, isLoading, isError, error, refetch } = useMediaDetails(paths);
  const view = useUserPreferences((state) => state.mediaView);
  const columns = useUserPreferences((state) => state.mediaGridColumns);
  const pageSize = useUserPreferences((state) => state.mediaPageSize);
  const kind = useUserPreferences((state) => state.mediaKind);
  const sort = useUserPreferences((state) => state.mediaSort);
  const setView = useUserPreferences((state) => state.setMediaView);
  const setColumns = useUserPreferences((state) => state.setMediaGridColumns);
  const setPageSize = useUserPreferences((state) => state.setMediaPageSize);
  const setKind = useUserPreferences((state) => state.setMediaKind);
  const setSort = useUserPreferences((state) => state.setMediaSort);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      (data ?? [])
        .filter((item) => kind === "all" || item.kind === kind)
        .sort((a, b) => {
          if (sort === "name") return a.name.localeCompare(b.name);
          if (sort === "size") return b.sizeBytes - a.sizeBytes;
          return (b.modified ?? "").localeCompare(a.modified ?? "");
        }),
    [data, kind, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [kind, sort, pageSize]);
  useEffect(() => setPage((current) => Math.min(current, pages)), [pages]);

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

      <MediaToolbar
        shown={filtered.length}
        total={data?.length ?? 0}
        view={view}
        columns={columns}
        pageSize={pageSize}
        kind={kind}
        sort={sort}
        onViewChange={setView}
        onColumnsChange={setColumns}
        onPageSizeChange={setPageSize}
        onKindChange={setKind}
        onSortChange={setSort}
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        isEmpty={filtered.length === 0}
        emptyTitle={data?.length ? "No media matches this filter" : "Nothing left to show"}
        emptyMessage={data?.length ? "Choose another media type." : "Every favorited file has been moved or deleted."}
        compact
        skeleton={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        }
      >
        <div className="space-y-4">
          <MediaGrid items={pageItems} view={view} columns={columns} />
          <MediaPagination page={page} pages={pages} onChange={setPage} />
        </div>
      </QueryState>
    </div>
  );
}
