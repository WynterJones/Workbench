import { convertFileSrc } from "@tauri-apps/api/core";
import { CopyIcon, HeartIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConfirmUnfavorite } from "@/lib/favoriteMedia";
import type { MediaItem } from "@/hooks/useMedia";
import type { GalleryView } from "@/lib/userPreferences";
import { formatBytes } from "@/features/files/lib/format";

interface MediaTileProps {
  item: MediaItem;
  view?: GalleryView;
  onOpen: () => void;
  onLoadError: () => void;
}

export function MediaTile({ item, view = "grid", onOpen, onLoadError }: MediaTileProps) {
  const { favorite, confirming, act } = useConfirmUnfavorite(item.path);
  const src = convertFileSrc(item.path);

  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-border bg-card", view === "list" && "flex h-28")}>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "block cursor-pointer bg-secondary/40",
          view === "grid" ? "aspect-square w-full" : "h-full w-40 shrink-0",
        )}
        aria-label={`Open ${item.name}`}
      >
        {item.kind === "image" ? (
          <img
            src={src}
            alt={item.name}
            loading="lazy"
            onError={onLoadError}
            className="size-full object-contain p-2 transition-[filter] duration-150 ease-out group-hover:brightness-110"
          />
        ) : (
          <span className="relative flex size-full items-center justify-center">
            <video src={src} muted preload="metadata" onError={onLoadError} className="size-full object-contain" />
            <PlayIcon className="absolute size-7 text-foreground/80" strokeWidth={2} />
          </span>
        )}
      </button>

      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(item.path);
            toast.success("Path copied");
          }}
          aria-label={`Copy path to ${item.name}`}
          title="Copy path"
          className="cursor-pointer rounded-md bg-background/70 p-1.5 text-muted-foreground opacity-0 backdrop-blur-sm transition-colors duration-150 ease-out hover:text-foreground group-hover:opacity-100"
        >
          <CopyIcon className="size-3.5" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={act}
          aria-label={confirming ? `Confirm removing ${item.name} from favorites` : favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
          title={confirming ? "Click again to remove" : favorite ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "cursor-pointer rounded-md p-1.5 backdrop-blur-sm transition-colors duration-150 ease-out",
            confirming
              ? "animate-pulse bg-destructive/15 text-destructive motion-reduce:animate-none"
              : favorite
              ? "bg-background/80 text-brand"
              : "bg-background/70 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100",
          )}
        >
          <HeartIcon
            className="size-3.5"
            fill={favorite ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>
      </div>

      {view === "grid" ? (
        <p className="truncate border-t border-border px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
          {item.relative}
        </p>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col justify-center border-l border-border px-3 pr-16">
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{item.relative}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {item.extension} · {formatBytes(item.sizeBytes)}
          </p>
        </div>
      )}
    </div>
  );
}
