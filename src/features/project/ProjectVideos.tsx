import { ExternalLinkIcon, PlaySquareIcon } from "lucide-react";
import { QueryState } from "@/components/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectVideos } from "@/hooks/useMedia";
import { openUrl } from "@/lib/openUrl";

export function ProjectVideos({ projectId }: { projectId: number }) {
  const { data, isLoading, isError, error, refetch } = useProjectVideos(projectId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      isEmpty={!data || data.length === 0}
      emptyTitle="No hosted videos found"
      emptyMessage="Add a YouTube, Vimeo, Wistia, Voomly, or Loom link anywhere in this project."
      compact
      skeleton={
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="aspect-video rounded-lg" />
          ))}
        </div>
      }
    >
      <div className="max-h-[65vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(data ?? []).map((video) => (
            <article key={video.embedUrl} className="min-w-0 overflow-hidden rounded-lg border border-border bg-background">
              <iframe
                src={video.embedUrl}
                title={`${video.provider} video ${video.id}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="aspect-video w-full border-0 bg-black"
              />
              <div className="flex min-w-0 items-center gap-2 border-t border-border p-3">
                <PlaySquareIcon className="size-4 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{video.provider}</Badge>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">{video.id}</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground" title={video.source}>
                    {video.source}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Open ${video.provider} video in browser`}
                  title="Open original"
                  onClick={() => openUrl(video.url)}
                >
                  <ExternalLinkIcon />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </QueryState>
  );
}
